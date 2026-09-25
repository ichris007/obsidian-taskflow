import { App, TFile } from 'obsidian';
import type { Task, TaskStatus, TaskViewsSettings } from './types';

// Re-export for backward compatibility
export type { Task, TaskStatus };

const STATUS_MAP: Record<string, TaskStatus> = {
	' ': 'todo',
	'/': 'in-progress',
	'x': 'done',
	'X': 'done',
	'>': 'migrated',
	'-': 'cancel',
	'p': 'pending',
	'w': 'waiting',
};

// Matches:  - [ ] text   with any leading whitespace
const TASK_LINE_RE = /^(\s*)- \[(.)\] (.*)$/;
const DATE_RE = /(\d{4}-\d{2}-\d{2})/;

type DateKey = 'scheduled' | 'due' | 'startDate' | 'completionDate' | 'createdDate';

const DATE_FIELDS: Array<{ emoji: string; key: DateKey }> = [
	{ emoji: '⏳', key: 'scheduled' },
	{ emoji: '📅', key: 'due' },
	{ emoji: '🛫', key: 'startDate' },
	{ emoji: '✅', key: 'completionDate' },
	{ emoji: '➕', key: 'createdDate' },
];

/**
 * 解析单行任务
 */
export function parseTaskLine(raw: string, file: TFile, lineIndex: number): Task | null {
	const match = TASK_LINE_RE.exec(raw);
	if (!match) return null;

	const indentStr = match[1] ?? '';
	const statusChar = match[2] ?? ' ';
	const body = match[3] ?? '';

	const status: TaskStatus = STATUS_MAP[statusChar] ?? 'todo';

	const task: Task = {
		file,
		line: lineIndex,
		indent: indentStr.length,
		status,
		description: body,
		scheduled: null,
		due: null,
		recurrence: null,
		priority: 'normal',
		startDate: null,
		completionDate: null,
		createdDate: null,
		taskId: null,
		dependsOn: null,
		heading: null,
		children: [],
	};

	// Extract date fields
	for (const { emoji, key } of DATE_FIELDS) {
		const idx = body.indexOf(emoji);
		if (idx !== -1) {
			const after = body.slice(idx + emoji.length).trimStart();
			const dateMatch = DATE_RE.exec(after);
			if (dateMatch && dateMatch[1]) {
				task[key] = dateMatch[1];
			}
		}
	}

	// Recurrence
	const recurIdx = body.indexOf('🔁');
	if (recurIdx !== -1) {
		const afterRecur = body.slice(recurIdx + '🔁'.length).trim();
		const nextEmoji = afterRecur.search(/[⏳📅🛫✅➕⏫🔼🔽⬇🆔⛔]/gu);
		task.recurrence = nextEmoji === -1 ? afterRecur : afterRecur.slice(0, nextEmoji).trim();
	}

	// Priority
	if (body.includes('⏫')) task.priority = 'highest';
	else if (body.includes('🔼')) task.priority = 'high';
	else if (body.includes('🔽')) task.priority = 'low';
	else if (body.includes('⬇️')) task.priority = 'lowest';

	// Task ID and depends-on
	const idMatch = /🆔\s*(\S+)/.exec(body);
	if (idMatch?.[1]) task.taskId = idMatch[1];
	const depMatch = /⛔\s*(\S+)/.exec(body);
	if (depMatch?.[1]) task.dependsOn = depMatch[1];

	// Strip all emoji metadata from description
	task.description = body
		.replace(/[⏳📅🛫✅➕]\s*\d{4}-\d{2}-\d{2}/gu, '')
		.replace(/🔁[^⏳📅🛫✅➕⏫🔼🔽⬇🆔⛔]*/gu, '')
		.replace(/[⏫🔼🔽⬇🆔⛔]\s*\S*/gu, '')
		.replace(/\s{2,}/g, ' ')
		.trim();

	return task;
}

/**
 * 从单个文件解析所有任务（不包含父子关系）
 * 返回扁平的任务列表，需后续调用 buildTaskHierarchy 构建树
 */
export async function parseFileTasks(file: TFile, app: App): Promise<Task[]> {
	let content: string;
	try {
		content = await app.vault.read(file);
	} catch {
		return [];
	}

	const lines = content.split('\n');
	const fileTasks: Task[] = [];
	let currentHeading: string | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;

		const headingMatch = /^#{1,6}\s+(.+)$/.exec(line);
		if (headingMatch?.[1]) {
			currentHeading = headingMatch[1].trim();
			continue;
		}

		const task = parseTaskLine(line, file, i);
		if (task) {
			task.heading = currentHeading;
			fileTasks.push(task);
		}
	}

	// 不在这里构建父子关系，返回扁平列表由调用者处理
	return fileTasks;
}

/**
 * 从扁平任务列表构建父子层级结构
 */
export function buildTaskHierarchy(fileTasks: Task[]): Task[] {
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

function isExcluded(filePath: string, excludedFolders: string[]): boolean {
	return excludedFolders.some((folder) => {
		const f = folder.trim();
		return f.length > 0 && filePath.startsWith(f + '/');
	});
}

/**
 * 扫描整个 vault（完整扫描，不使用缓存）
 * 保留此函数用于向后兼容和缓存未命中时的回退
 */
export async function scanVault(app: App, settings: TaskViewsSettings): Promise<Task[]> {
	const excludedFolders: string[] = settings.data.excludedFolders
		.split(',')
		.map((f: string) => f.trim())
		.filter((f: string) => f.length > 0);

	const mdFiles = app.vault.getMarkdownFiles();
	const allTasks: Task[] = [];

	for (const file of mdFiles) {
		if (isExcluded(file.path, excludedFolders)) continue;

		const fileTasks = await parseFileTasks(file, app);
		if (fileTasks.length > 0) {
			const rootTasks = buildTaskHierarchy(fileTasks);
			allTasks.push(...rootTasks);
		}
	}

	return allTasks;
}
