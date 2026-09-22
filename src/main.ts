import { Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	migrateSettings,
	TaskViewsSettingTab,
} from './settings';
import { TaskFlowView, VIEW_TYPE_TASKFLOW } from './view';
import type { TaskViewsSettings } from './types';
import { resolveLang, setUiLang } from './i18n';
import type { LangSetting } from './i18n';
import { TASKFLOW_ICON_SVG } from './brand';

export default class TaskFlowPlugin extends Plugin {
	settings!: TaskViewsSettings;

	async onload() {
		await this.loadSettings();
		// 语言要在任何界面渲染之前定下来：auto 跟随 Obsidian，zh/en 强制
		setUiLang(resolveLang(this.settings.language, this.app));

		this.registerView(
			VIEW_TYPE_TASKFLOW,
			(leaf) => new TaskFlowView(leaf, this),
		);

		this.addCommand({
			id: 'open-taskflow',
			name: 'Open TaskFlow',
			callback: () => this.activateView(),
		});

		// 左侧 Ribbon 图标：点一下就打开 TaskFlow（走同一个 activateView，位置跟随设置）
		const ribbonEl = this.addRibbonIcon('layout-dashboard', 'TaskFlow', () => {
			void this.activateView();
		});
		// 换成自绘品牌标识（蓝紫渐变圆角方块 + 两道白波），与设置面板「关于」页同一枚；
		// 万一注入失败就保留上面的 layout-dashboard 兜底，不至于没有图标可点。
		try {
			ribbonEl.innerHTML = TASKFLOW_ICON_SVG;
		} catch {
			/* ignore */
		}

		this.addSettingTab(new TaskViewsSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			this.activateView();
		});
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_TASKFLOW);
	}

	private hasTasksPlugin(): boolean {
		const plugins = this.app.plugins.plugins as Record<string, any>;
		return !!plugins['obsidian-tasks-plugin'];
	}

	private async activateView() {
		// Dependency check happens here — not in onload() — because this runs
		// after onLayoutReady, when every enabled plugin is guaranteed to be
		// loaded. Checking in onload() races against plugin load order.
		if (!this.hasTasksPlugin()) {
			new Notice(
				'Tasks Companion Pane: The Tasks plugin (obsidian-tasks-group) must be installed and enabled.',
				10000,
			);
			return;
		}

		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_TASKFLOW);
		const existingLeaf = existing[0];
		if (existingLeaf) {
			this.app.workspace.revealLeaf(existingLeaf);
			return;
		}

		// 打开位置跟随设置：主窗口（tab）或右侧边栏（right sidebar）
		const wantSidebar = this.settings?.data?.openLocation === 'sidebar';
		const leaf = wantSidebar
			? (this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf('tab'))
			: this.app.workspace.getLeaf('tab');
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_TASKFLOW, active: true });
			this.app.workspace.revealLeaf(leaf);
		}
	}

	async loadSettings() {
		const loaded = await this.loadData();
		this.settings = migrateSettings(loaded ?? {});
	}

	async saveSettings() {
		// Sort boards and globalTabs by order
		if (this.settings.data.boards) {
			this.settings.data.boards.sort((a, b) => a.order - b.order);
		}
		if (this.settings.data.globalTabs) {
			this.settings.data.globalTabs.sort((a, b) => a.order - b.order);
		}
		await this.saveData(this.settings);
		this.refreshAllViews();
	}

	/**
	 * 头部（工作台名 / slogan / 封面）的保存：只写盘，不重建界面。
	 *
	 * 存在的理由：拖动封面调位置时，松手若走 saveSettings()，会连带
	 * refreshAllViews() 把整个 shell（包括正在拖的那张图）销毁重建，
	 * 松手瞬间画面闪一下。封面位移是纯视觉状态，不需要重建。
	 */
	async saveHeadSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	refreshAllViews() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TASKFLOW);
		for (const leaf of leaves) {
			const view = leaf.view as TaskFlowView;
			view.buildShell();
			view.refresh();
		}
	}

	/**
	 * 就地同步底部统计栏「任务类别胶囊」的折叠/展开，不重建整个 shell。
	 * 设置面板改开关时调用：视图正开着的话立刻生效，省得要重载插件。
	 */
	/**
	 * 切换界面语言：立刻改全局语言并重建所有已打开的视图。
	 * 设置面板自己会 rebuildUI()，两边一起刷新，不用重载插件。
	 */
	applyLanguage(lang: LangSetting): void {
		this.settings.language = lang;
		setUiLang(resolveLang(lang, this.app));
		void this.saveData(this.settings);
		this.refreshAllViews();
	}

	applyStatsCategories(expanded: boolean) {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TASKFLOW);
		for (const leaf of leaves) {
			const view = leaf.view as TaskFlowView;
			view.applyStatsCategories(expanded);
		}
	}
}
