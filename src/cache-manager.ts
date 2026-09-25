import { App, TFile } from 'obsidian';
import type { Task } from './types';
import { parseFileTasks } from './parser';

interface CacheEntry {
	file: TFile;
	mtime: number;
	tasks: Task[]; // 已经是层级结构（root tasks with children）
}

/**
 * ScanCache - 管理任务扫描的缓存
 *
 * 职责：
 * - 缓存已解析文件的任务数据（包含层级结构）
 * - 基于 mtime 检测文件变更
 * - 处理文件重命名/移动的缓存迁移
 * - 提供统计信息和可配置的缓存大小
 */
export class ScanCache {
	private cache: Map<string, CacheEntry> = new Map();
	private readonly maxSize: number = 1000;
	private app: App;
	private debug: boolean;

	constructor(app: App) {
		this.app = app;
		this.debug = this.shouldEnableDebug();
	}

	/**
	 * 判断是否启用调试日志（通过环境变量控制）
	 */
	private shouldEnableDebug(): boolean {
		// 支持的环境变量：TASKFLOW_DEBUG, DEBUG
		const env = typeof window !== 'undefined' ? window.process?.env : undefined;
		if (env) {
			return (
				env.TASKFLOW_DEBUG === 'true' ||
				env.TASKFLOW_DEBUG === '1' ||
				env.DEBUG?.includes('taskflow') === true
			);
		}
		// 开发环境默认启用调试
		return import.meta.env?.DEV === true;
	}

	/**
	 * 获取所有任务（使用缓存）
	 * 这是主要的入口点，替代旧的 scanVault
	 */
	async getAllTasks(settings: { excludedFolders: string }): Promise<Task[]> {
		const start = performance.now();
		// 设置缺字段时不能抛 —— 一抛整个 refresh 就断在统计之前
		const excludedFolders = (settings?.excludedFolders ?? '')
			.split(',')
			.map((f) => f.trim())
			.filter((f) => f.length > 0);

		const mdFiles = this.app.vault.getMarkdownFiles();
		const allTasks: Task[] = [];
		let cacheHits = 0;
		let cacheMisses = 0;

		for (const file of mdFiles) {
			if (this.isExcluded(file.path, excludedFolders)) continue;

			// 检查缓存状态（不触发加载）
			const cacheKey = file.path;
			const cached = this.cache.get(cacheKey);
			const fileStat = file.stat;
			const isCached = cached && cached.mtime === fileStat.mtime;

			if (isCached) {
				cacheHits++;
				// 拷贝一份返回，避免调用方改动缓存（不能用 JSON，见 cloneTasks 注释）
				allTasks.push(...this.cloneTasks(cached.tasks));
			} else {
				cacheMisses++;
				const fileTasks = await this.getFileTasks(file);
				if (fileTasks.length > 0) {
					allTasks.push(...fileTasks);
				}
			}
		}

		// 清理已删除文件的缓存
		this.cleanupCache(mdFiles.map(f => f.path));

		const elapsed = performance.now() - start;
		const stats = this.getStats();

		if (this.debug) {
			this.log(`[ScanCache] Loaded ${allTasks.length} tasks (cache: ${cacheHits} hits, ${cacheMisses} misses, ${stats.cachedFiles} stored) in ${elapsed.toFixed(1)}ms`);
		}

		return allTasks;
	}

	/**
	 * 克隆任务树：复制任务自身字段与 children 数组，但 `file` 保持原引用。
	 *
	 * 为什么不能用 JSON.parse(JSON.stringify(tasks))：
	 * Task.file 是 TFile，它的 parent 是 TFolder，而 TFolder.children 又
	 * 包含这个 TFile —— 循环引用，JSON.stringify 会抛
	 * "Converting circular structure to JSON"。
	 * 结果就是：首次扫描（缓存未命中）正常，之后每一次命中缓存的刷新都抛错，
	 * 任务数据再也不会更新，底部统计也会停在 0。
	 */
	private cloneTasks(tasks: Task[]): Task[] {
		return tasks.map((t) => ({
			...t,
			children: this.cloneTasks(t.children),
		}));
	}

	/**
	 * 获取文件的任务（使用缓存）
	 */
	private async getFileTasks(file: TFile): Promise<Task[]> {
		try {
			const fileStat = file.stat;
			const mtime = fileStat.mtime;
			const cacheKey = file.path;

			// 检查缓存
			const cached = this.cache.get(cacheKey);
			if (cached && cached.mtime === mtime) {
				// 拷贝一份返回，避免修改缓存（不能用 JSON，见 cloneTasks 注释）
				if (this.debug) this.log(`[Cache] HIT: ${file.path}`);
				return this.cloneTasks(cached.tasks);
			}

			// 缓存未命中或已过期：重新解析
			if (this.debug) this.log(`[Cache] MISS: ${file.path}`);
			const fileTasks = await parseFileTasks(file, this.app);
			const rootTasks = this.buildTaskHierarchy(fileTasks);

			// 更新缓存（实现简单的 LRU：删除最旧的条目如果超过 maxSize）
			if (this.cache.size >= this.maxSize) {
				const firstKey = this.cache.keys().next().value;
				if (firstKey) {
					this.cache.delete(firstKey);
					if (this.debug) this.log(`[Cache] Evicted: ${firstKey}`);
				}
			}

			this.cache.set(cacheKey, { file, mtime, tasks: rootTasks });

			return rootTasks;
		} catch (e) {
			console.warn('[ScanCache] Failed to process file, skipping:', file.path, e);
			return [];
		}
	}

	/**
	 * 构建任务层级结构（从扁平列表）
	 */
	private buildTaskHierarchy(fileTasks: Task[]): Task[] {
		const rootTasks: Task[] = [];
		const stack: Task[] = [];

		for (const task of fileTasks) {
			while (stack.length > 0 && (stack[stack.length - 1]?.indent ?? 0) >= task.indent) {
				stack.pop();
			}

			const parent = stack[stack.length - 1];
			if (parent) {
				parent.children.push(task);
			} else {
				rootTasks.push(task);
			}

			stack.push(task);
		}

		return rootTasks;
	}

	/**
	 * 迁移缓存键（用于文件重命名/移动）
	 * 由外部调用（如视图的 onOpen 中注册监听器）
	 */
	public migrateCacheKey(oldPath: string, newPath: string): void {
		if (this.cache.has(oldPath)) {
			const entry = this.cache.get(oldPath)!;
			this.cache.delete(oldPath);
			this.cache.set(newPath, entry);
			if (this.debug) this.log(`[Cache] Renamed: ${oldPath} -> ${newPath}`);
		}
	}

	/**
	 * 清理已不存在文件的缓存
	 */
	private cleanupCache(existingPaths: string[]): void {
		const existingSet = new Set(existingPaths);
		let deleted = 0;
		for (const filePath of this.cache.keys()) {
			if (!existingSet.has(filePath)) {
				this.cache.delete(filePath);
				deleted++;
			}
		}
		if (this.debug && deleted > 0) {
			this.log(`[Cache] Cleaned up ${deleted} stale entries`);
		}
	}

	/**
	 * 调试日志输出
	 */
	private log(message: string): void {
		console.warn(message);
	}

	/**
	 * 检查路径是否被排除
	 */
	private isExcluded(filePath: string, excludedFolders: string[]): boolean {
		return excludedFolders.some((folder) => {
			const f = folder.trim();
			return f.length > 0 && filePath.startsWith(f + '/');
		});
	}

	/**
	 * 获取缓存统计信息
	 */
	getStats(): { cachedFiles: number; parsedFiles: number } {
		return {
			cachedFiles: this.cache.size,
			parsedFiles: 0, // 暂不跟踪，可后续添加
		};
	}

	/**
	 * 清空缓存
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * 获取缓存大小
	 */
	get size(): number {
		return this.cache.size;
	}
}
