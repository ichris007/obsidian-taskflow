// Obsidian 插件类型扩展

// 扩展 App 接口，补充 plugins / setting（官方类型未声明，运行时存在）。
// 注意：plugins 同时给出具名成员与字符串索引签名，以便兼容
// `app.plugins.plugins[id]` 与 `app.plugins[id]` 两种历史形态。
declare module 'obsidian' {
	interface App {
		plugins: {
			plugins: Record<string, unknown>;
			[id: string]: unknown;
		};
		setting: {
			open(): void;
			openTabById(id: string): void;
		};
	}

	// Vault.getConfig 运行时存在，但官方类型未声明
	interface Vault {
		getConfig(name: string): unknown;
	}
}

// Electron 渲染进程里 window.process 是可用的（Obsidian 基于 Electron），
// 但官方类型未声明，这里补上以便类型检查通过。
declare global {
	interface Window {
		process?: {
			env: Record<string, string | undefined>;
		};
	}

	interface ImportMeta {
		readonly env: {
			readonly DEV: boolean;
			readonly PROD: boolean;
			readonly DEBUG: string | undefined;
			readonly TASKFLOW_DEBUG: string | undefined;
		};
	}
}

// 导出类型供其他文件使用
export type PluginRegistry = Record<string, unknown>;
