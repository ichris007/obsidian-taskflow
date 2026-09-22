// Obsidian 插件类型扩展

import { App } from 'obsidian';

// 扩展 App 接口，添加 plugins 和 setting 属性
declare module 'obsidian' {
	interface App {
		plugins: {
			plugins: Record<string, any>;
		};
		setting: {
			open: () => void;
			openTabById: (id: string) => void;
		};
	}
}

// 导出类型供其他文件使用
export type PluginRegistry = Record<string, any>;
