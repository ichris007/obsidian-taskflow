import { App, TFile, Vault } from 'obsidian';
import type TaskViewsPlugin from './main';
import { COVER_DIR, DEFAULT_COVER_POSITION } from './types';

/* ═══════════════════════════════════════════════════════════════════════════
   封面图存取
   ───────────────────────────────────────────────────────────────────────────
   视图头部（悬停「插入封面 / 换图 / 移除」）和设置面板（「选择图片 / 移除」）
   都要走这套逻辑，所以抽出来共用，避免两处各写一份、行为悄悄分叉。

   存储策略：图片字节写进库内 `_taskflow/taskflow_banner.<ext>`，配置里只留路径。
   参考实现（Lyra）是把图片读成 base64 塞进插件数据文件 data.json —— 那样
   一张几 MB 的图会让 data.json 膨胀到十几 MB，而 data.json 每次改设置都要
   整体重写一遍。落成库内文件后，配置文件始终很小，封面还能随库同步到
   其他设备。
   ═══════════════════════════════════════════════════════════════════════════ */

/** 浏览器认得的图片扩展名；封面按它决定落盘的文件名 */
const COVER_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp', 'svg'];

/** 封面文件名（不含扩展名）。改名自 cover，避免和其他插件的 cover 文件撞名 */
export const COVER_FILE = 'taskflow_banner';

/**
 * 封面存放目录，跟随 Obsidian「附件默认存放路径」(attachmentFolderPath)：
 * - "" / "." / "/"        → a. 库根          → 收口到根目录的 _taskflow
 * - 以 "./" 开头           → b/c. 当前文件所在文件夹 / 其下子文件夹
 *                            设置页没有「当前文件」上下文，无法解析相对路径，
 *                            同样收口到根目录的 _taskflow
 * - 其他（非 ./ 开头的命名文件夹）→ d. 指定的文件夹 → 直接用该目录
 *
 * fail-safe：只有「真正手打的命名文件夹(d)」才信任字面路径；其余（含 "/"
 * 这种库根等价——部分 Obsidian 版本在「仓库的根目录」选项下写入的是 "/"
 * 而非空串）一律收口到 _taskflow，杜绝把封面漏写进库根。
 */
export function coverStorageDir(app: App): string {
	const folder = ((app.vault as any).getConfig('attachmentFolderPath') as string | undefined) ?? '';
	const isUserSpecifiedFolder =
		folder.length > 0 &&
		folder !== '.' &&
		!folder.startsWith('./') &&
		!folder.startsWith('/');
	return isUserSpecifiedFolder ? folder : COVER_DIR;
}

/** 从选中的图片文件推断扩展名（先看文件名，再看 MIME）；认不出来按 png 存 */
export function coverExtFor(file: File): string {
	const normalize = (raw: string): string | null => {
		const ext = raw.toLowerCase().replace(/^\./, '');
		if (!COVER_EXTS.includes(ext)) return null;
		return ext === 'jpeg' ? 'jpg' : ext;
	};
	const fromName = normalize(file.name.split('.').pop() ?? '');
	if (fromName) return fromName;
	const fromMime = normalize(file.type.split('/').pop() ?? '');
	return fromMime ?? 'png';
}

/** 配置里的封面路径 → 真实存在的文件；路径为空、或文件已被删/移走，返回 null */
export function resolveCoverFile(app: App, path: string): TFile | null {
	if (!path) return null;
	// 先走标准方法；隐藏文件夹(.taskflow)下的文件 getAbstractFileByPath 偶发
	// 返回 null（元数据缓存没跟上），会导致封面图 src 为空、界面不显示。兜底用
	// getFiles() 全表查找（隐藏文件也在此列），确保封面能正常渲染，同时保留
	// 「文件被外部删除 → 不显示」的守卫。
	const direct = app.vault.getAbstractFileByPath(path);
	if (direct instanceof TFile) return direct;
	const fromList = app.vault.getFiles().find((f) => f.path === path);
	return fromList instanceof TFile ? fromList : null;
}

/**
 * 写入封面：图片落盘到「跟随附件设置算出的目录」下的 `taskflow_banner.<ext>`，
 * 配置里只记路径，并重建界面。抛错交给调用方处理（两处的提示文案不同）。
 */
export async function persistCoverImage(plugin: TaskViewsPlugin, file: File): Promise<void> {
	const vault = plugin.app.vault;
	const data = plugin.settings.data;
	const dir = coverStorageDir(plugin.app);
	const ext = coverExtFor(file);
	const target = `${dir}/${COVER_FILE}.${ext}`;
	const previous = data.coverImagePath;
	const buffer = await file.arrayBuffer();

	// 确保目录存在。Obsidian 的 getAbstractFileByPath 对隐藏文件夹(.taskflow)
	// 偶发返回 null（元数据缓存没跟上），若「先查后建」会误判不存在、再调
	// createFolder 就抛 "Folder already exists"。虽然现已改回可见的 _taskflow，
	// 仍保留「以 createFolder 为准、吞掉已存在错误」的稳妥写法，避免任何版本
	// 下因缓存滞后而误判漏写。
	try {
		await vault.createFolder(dir);
	} catch (e) {
		if (!(e instanceof Error && e.message.includes('Folder already exists'))) {
			throw e;
		}
	}
	// 走 adapter 直接写盘：这是插件自己的资产文件，没必要让 vault 的
	// 「文件已修改」事件连带触发一轮刷新；界面重建由下面的 saveSettings 发起。
	await vault.adapter.writeBinary(target, buffer);

	if (previous && previous !== target) {
		// 换了扩展名（如 png → jpg）时旧文件要清掉，否则库里会攒下一堆封面
		try {
			await vault.adapter.remove(previous);
		} catch {
			/* 旧文件已经不在了就算达成目的 */
		}
	}
	// 清掉同目录下其它扩展名的孤儿（如之前 taskflow_banner.png 还在、现在写 jpg）
	await removeOrphanCovers(vault, dir, target);

	data.coverImagePath = target;
	data.coverPosition = DEFAULT_COVER_POSITION;
	// 这里必须重建：图片 src 变了，只写盘不改 DOM 是看不到新图的
	await plugin.saveSettings();
}

/** 删掉 `dir` 下除 `keep` 之外的所有 taskflow_banner.<ext> 孤儿 */
async function removeOrphanCovers(vault: Vault, dir: string, keep: string): Promise<void> {
	for (const e of COVER_EXTS) {
		const p = `${dir}/${COVER_FILE}.${e}`;
		if (p === keep) continue;
		if (!vault.getAbstractFileByPath(p)) continue;
		try {
			await vault.adapter.remove(p);
		} catch {
			/* 不在了就算达成目的 */
		}
	}
}

/** 移除封面：清空配置 + 删掉库内文件，别留下无人引用的垃圾 */
export async function removeCoverImage(plugin: TaskViewsPlugin): Promise<void> {
	const data = plugin.settings.data;
	const path = data.coverImagePath;
	data.coverImagePath = '';
	data.coverPosition = DEFAULT_COVER_POSITION;
	await plugin.saveSettings();
	if (!path) return;
	try {
		await plugin.app.vault.adapter.remove(path);
	} catch {
		/* 文件本来就不在 */
	}
}
