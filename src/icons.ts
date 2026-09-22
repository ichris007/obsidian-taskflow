/**
 * 分组图标候选集。
 *
 * 这是一份「经过挑选」的 lucide 图标名清单，覆盖分组场景最常需要的
 * 文件夹 / 标签 / 时间 / 任务 / 工作 / 生活 等分类。只用那些在 Obsidian
 * 各个版本里都长期稳定存在的名字（含旧别名，如 alert-triangle / x-circle），
 * 避免引入新版才有的重命名图标（如 triangle-alert / circle-x）导致在某些
 * Obsidian 版本里渲染不出。
 *
 * 下拉框同时支持「搜索任意名字」：当用户输入的名字不在本清单内时，
 * 会提供一个「使用 <名字>」的自定义选项，因此即便清单没收录，
 * 用户照样能用上 Obsidian 实际支持的任何图标。
 */

export const GROUP_ICON_NAMES: string[] = [
	// ── 文件夹 / 文件 ──
	'folder', 'folder-open', 'folder-plus', 'folder-minus', 'folder-lock',
	'folder-git-2', 'folder-tree', 'folder-up',
	'file', 'file-text', 'file-plus', 'file-minus', 'file-check', 'file-x', 'file-pen',
	'files', 'copy', 'clipboard', 'clipboard-check', 'clipboard-list', 'clipboard-copy',
	'archive', 'box', 'package', 'briefcase', 'inbox',

	// ── 标签 / 标记 ──
	'tag', 'tags', 'hash', 'at-sign', 'award', 'badge', 'bookmark', 'bookmarks',

	// ── 人 / 团队 ──
	'user', 'users', 'user-plus', 'user-minus', 'user-check', 'user-x', 'user-cog',
	'contact', 'contacts', 'id-card', 'address-book',
	'phone', 'phone-call',
	'message-circle', 'message-square', 'messages-square', 'send', 'share', 'share-2',
	'users-round',

	// ── 时间 / 计划 ──
	'calendar', 'calendar-days', 'calendar-check', 'calendar-clock',
	'calendar-plus', 'calendar-minus', 'calendar-off',
	'clock', 'clock-4', 'alarm-clock', 'timer', 'timer-reset',
	'hourglass', 'history', 'rotate-cw', 'rotate-ccw', 'repeat', 'refresh-cw',
	'undo', 'redo',

	// ── 任务 / 勾选 ──
	'check', 'check-circle', 'check-square', 'circle-check', 'circle-check-big',
	'list', 'list-checks', 'list-todo', 'square-check', 'check-check',
	'circle', 'circle-dashed', 'minus', 'plus', 'x', 'x-circle',

	// ── 工作 / 开发 ──
	'building', 'building-2', 'computer', 'laptop', 'monitor', 'monitor-smartphone',
	'cpu', 'code', 'code-2', 'terminal', 'terminal-square',
	'git-branch', 'git-commit', 'git-merge', 'git-pull-request',
	'bug', 'wrench', 'hammer', 'screwdriver', 'tool', 'tools',
	'settings', 'settings-2', 'sliders', 'sliders-horizontal', 'gauge',
	'database', 'server', 'cloud', 'cloud-cog', 'hard-drive', 'network',
	'shield', 'shield-check', 'lock', 'key', 'key-round', 'fingerprint',
	'accessibility',

	// ── 生活 / 个人 ──
	'home', 'house', 'heart', 'heart-handshake', 'star', 'smile', 'smile-plus',
	'coffee', 'music', 'music-2', 'camera', 'image', 'images', 'image-plus',
	'map', 'map-pin', 'map-pinned', 'compass', 'navigation', 'globe', 'globe-2', 'earth',
	'plane', 'car', 'bicycle', 'bike', 'train', 'bus',
	'shopping-cart', 'shopping-bag', 'shopping-basket', 'gift',
	'book', 'book-open', 'book-open-check', 'graduation-cap', 'backpack',
	'dumbbell', 'utensils', 'pizza', 'apple', 'leaf', 'flower', 'flower-2',
	'tree-pine', 'sun', 'moon', 'moon-star', 'cloud-rain', 'umbrella',
	'droplet', 'wind', 'flame', 'zap', 'sparkles', 'palette', 'brush',
	'gamepad-2', 'ticket', 'wallet', 'credit-card', 'banknote', 'piggy-bank',
	'coins', 'trophy', 'medal', 'target', 'flag', 'flag-triangle-right',
	'rocket', 'lightbulb', 'bell', 'bell-ring', 'megaphone',
	'speaker', 'volume', 'headphones', 'mic', 'video', 'webcam', 'tv',
	'eye', 'eye-off', 'search', 'filter', 'crosshair', 'anchor', 'pin',

	// ── UI / 杂项 ──
	'info', 'help-circle', 'alert-triangle', 'alert-circle', 'alert-octagon',
	'chevron-down', 'chevron-right', 'chevron-left', 'chevron-up',
	'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'arrow-up-right',
	'move', 'more-horizontal', 'more-vertical', 'ellipsis', 'ellipsis-vertical',
	'menu', 'grid', 'grid-2x2', 'layout', 'layout-grid', 'layout-list',
	'layout-dashboard', 'panel-left', 'panel-right', 'sidebar', 'columns', 'rows',
	'layers', 'component', 'command', 'option',
	'maximize', 'minimize', 'fullscreen', 'external-link', 'link', 'link-2', 'unlink',
	'download', 'upload', 'save', 'trash', 'trash-2',
	'edit', 'edit-2', 'edit-3', 'pencil', 'pen', 'eraser', 'scissors',
	'bold', 'italic', 'underline', 'type', 'align-left', 'align-center', 'align-right',
	'wrap-text', 'list-ordered', 'quote',
	'percent', 'dollar-sign', 'euro', 'yen', 'bitcoin', 'receipt',
	'calculator', 'scale', 'gavel', 'library', 'newspaper', 'file-edit',
	'presentation', 'pie-chart', 'bar-chart', 'bar-chart-2', 'line-chart',
	'trending-up', 'trending-down', 'activity',
	'wifi', 'bluetooth', 'battery', 'plug', 'power', 'zap-off',
];

/** 升序排序后的副本（下拉框按字母展示更稳定） */
export const GROUP_ICONS_SORTED: string[] = [...GROUP_ICON_NAMES].sort();

/** 判断名字是否在候选清单内（用于自定义回退逻辑） */
export function isKnownIcon(name: string): boolean {
	return GROUP_ICON_NAMES.includes(name);
}
