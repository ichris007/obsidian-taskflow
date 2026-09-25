import { ButtonComponent, Modal, Notice, setIcon } from 'obsidian';
import { t } from '../i18n';
import { GROUP_ICONS_SORTED, isKnownIcon } from '../icons';

/* ═══════════════════════════════════════════════════════════════
   TF 弹窗基类
   ───────────────────────────────────────────────────────────────
   历史问题：这个弹窗曾经「看起来是空的」。查下来原因可能是
   Observable 环境差异（Obsidian 版本、CSS 是否加载、API 可用性），
   而不是某段逻辑写错 —— 但无论哪种，用户看到的都是一片空白。

   所以这一版的目标不是「写得正确」，而是「在任何环境下都不可能静默空白」：

   1. 关键布局用内联样式，不依赖 styles.css 是否被加载或被主题覆盖；
   2. onOpen 整体 try/catch，出错就把真实原因画进弹窗里（附堆栈和关闭按钮），
      永远不会只剩一个空盒子；
   3. 只用 Obsidian 最老的 API（Modal / contentEl / scope），
      并且对 scope 做可选访问；类名一律用原生 classList 逐个 token 添加
      （setClass / addClass 吃不下 'a b' 这种空格串）；
   4. 不在 modalEl / setTitle 上做任何假设。
   ═══════════════════════════════════════════════════════════════ */

export type TFFieldType = 'text' | 'textarea' | 'toggle' | 'dropdown' | 'readonly' | 'icon-picker';

export interface TFFieldSpec {
	key: string;
	label: string;
	description?: string;
	type: TFFieldType;
	placeholder?: string;
	options?: Record<string, string>;
	value: unknown;
	onChange: (value: unknown) => void | Promise<void>;
	/** 返回错误文案，null 表示通过 */
	validation?: (value: unknown) => string | null;
	rows?: number;
}

export interface TFFieldHandle {
	spec: TFFieldSpec;
	el: HTMLElement;
	/** 读取控件当前值，保存时用于整表校验 */
	read: () => unknown;
	/** 弹窗关闭时清理挂到 body 上的浮层（icon-picker 用） */
	teardown?: () => void;
}

/** 内联一段样式：即使在 styles.css 完全没加载的情况下也生效 */
function style(el: HTMLElement, props: Record<string, string>): void {
	for (const [k, v] of Object.entries(props)) {
		el.style.setProperty(k, v);
	}
}

/**
 * 逐个 token 添加类名。
 *
 * 为什么不用 `el.addClass('a b')` / `ButtonComponent.setClass('a b')`：
 * 新版 Obsidian 的 addClasses() 会把整个字符串原样交给 `classList.add()`，
 * 而 DOMTokenList 不允许 token 含空白字符 → 抛 InvalidCharacterError。
 * 这个异常发生在弹窗渲染的前半段，会让整个弹窗只剩一个空盒子
 * （「点编辑弹出空白」的真实根因就是这个）。
 */
function setClasses(el: HTMLElement, cls: string): void {
	for (const token of cls.split(/\s+/)) {
		if (token) el.classList.add(token);
	}
}

function paintField(el: HTMLElement, error: string | null): void {
	const input = el.querySelector(
		'.tf-field-input, .tf-field-textarea, .tf-field-select',
	);
	const msg = el.querySelector('.tf-field-message');
	input?.classList.toggle('tf-error', !!error);
	input?.classList.toggle('tf-success', !error);
	if (msg) {
		msg.textContent = error ?? '';
		msg.className = error ? 'tf-field-message tf-error' : 'tf-field-message';
	}
}

/** 渲染单个表单字段（三个弹窗共用，避免各写一份） */
export function renderTFField(container: HTMLElement, spec: TFFieldSpec): TFFieldHandle {
	const el = container.createEl('div', { cls: 'tf-field' });

	const labelText = el
		.createEl('label', { cls: 'tf-field-label' })
		.createEl('div', { cls: 'tf-field-label-text' });
	labelText.createEl('span', { cls: 'tf-field-name', text: spec.label });
	if (spec.description) {
		labelText.createEl('span', { cls: 'tf-field-desc', text: spec.description });
	}

	const wrap = el.createEl('div', { cls: 'tf-field-input-wrapper' });
	let read: () => unknown = () => spec.value;
	let handleTeardown: (() => void) | undefined;

	switch (spec.type) {
		case 'text': {
			const input = wrap.createEl('input', {
				cls: 'tf-field-input',
				attr: { type: 'text', placeholder: spec.placeholder ?? '' },
			});
			input.value = (spec.value as string | undefined) ?? '';
			read = () => input.value;
			input.addEventListener('input', () => {
				paintField(el, null);
				void spec.onChange(input.value);
			});
			input.addEventListener('blur', () => {
				if (spec.validation) paintField(el, spec.validation(input.value));
			});
			break;
		}
		case 'textarea': {
			const input = wrap.createEl('textarea', {
				cls: 'tf-field-textarea',
				attr: { placeholder: spec.placeholder ?? '', rows: String(spec.rows ?? 4) },
			});
			input.value = (spec.value as string | undefined) ?? '';
			read = () => input.value;
			input.addEventListener('input', () => {
				paintField(el, null);
				void spec.onChange(input.value);
			});
			input.addEventListener('blur', () => {
				if (spec.validation) paintField(el, spec.validation(input.value));
			});
			break;
		}
		case 'dropdown': {
			const select = wrap.createEl('select', { cls: 'tf-field-select' });
			for (const [value, label] of Object.entries(spec.options ?? {})) {
				select.createEl('option', { attr: { value }, text: label });
			}
			select.value = (spec.value as string | undefined) ?? '';
			read = () => select.value;
			select.addEventListener('change', () => {
				paintField(el, null);
				void spec.onChange(select.value);
			});
			break;
		}
		case 'toggle': {
			// iOS 风格开关：真身 checkbox 收进 0 尺寸，视觉全靠轨道 + 滑块。
			// 说明文字已经在字段标题里，这里不再重复渲染一遍。
			const toggleWrap = wrap.createEl('label', { cls: 'tf-switch' });
			const checkbox = toggleWrap.createEl('input', {
				cls: 'tf-switch-input',
				attr: { type: 'checkbox', 'aria-label': spec.label },
			});
			checkbox.checked = Boolean(spec.value);
			const track = toggleWrap.createEl('span', { cls: 'tf-switch-track' });
			track.createEl('span', { cls: 'tf-switch-thumb' });
			read = () => checkbox.checked;
			checkbox.addEventListener('change', () => {
				void spec.onChange(checkbox.checked);
			});
			break;
		}
		case 'readonly': {
			const input = wrap.createEl('input', {
				cls: 'tf-field-input',
				attr: { type: 'text', readonly: 'true' },
			});
			input.value = (spec.value as string | undefined) ?? '';
			read = () => input.value;
			break;
		}
		case 'icon-picker': {
			// 触发器（按钮）展示当前图标 + 名称 + 下拉箭头；点击展开面板。
			// 面板挂在「弹窗自身内部」（.tf-modal 内），而不是 document.body：
			//  - position: fixed + getBoundingClientRect 视口坐标 → 既能逃出表单
			//    overflow-y:auto 的裁切，又共享弹窗的层叠上下文，不会落在弹窗之下
			//    （之前 portal 到 body 时，若弹窗容器层级更高，面板会被压到弹窗背后，
			//    点图标实际点到遮罩/弹窗 → 面板「失焦消失」）。
			//  - 弹窗关闭时 contentEl.empty() 会一并清掉面板，teardown 再兜底。
			style(wrap, { position: 'relative' });

			const trigger = wrap.createEl('button', {
				cls: 'tf-icon-trigger tf-field-input',
				attr: { type: 'button', 'aria-haspopup': 'listbox' },
			});
			const iconBox = trigger.createEl('span', { cls: 'tf-icon-trigger-icon' });
			setIcon(iconBox, (spec.value as string | undefined) ?? 'folder');
			const nameEl = trigger.createEl('span', {
				cls: 'tf-icon-trigger-name',
				text: (spec.value as string | undefined) ?? 'folder',
			});
			trigger.createEl('span', { cls: 'tf-icon-trigger-caret' });

			// 优先挂到弹窗主体（.tf-modal），没有就回落字段自身（测试桩常见）
			const root: HTMLElement =
				typeof (el as unknown).closest === 'function'
					? ((el.closest('.tf-modal')) ?? wrap)
					: wrap;
			const panel = root.createEl('div', { cls: 'tf-icon-panel is-hidden' });
			// 面板内的交互不要冒泡到弹窗/遮罩，避免误关
			panel.addEventListener('mousedown', (e) => e.stopPropagation());
			const search = panel.createEl('input', {
				cls: 'tf-icon-search',
				attr: { type: 'text', placeholder: t('modal.iconSearch') },
			});
			const grid = panel.createEl('div', { cls: 'tf-icon-grid' });

			let current = (spec.value as string | undefined) ?? 'folder';
			let backdrop: HTMLElement | null = null;
			let open = false;
			const scrollForm =
				typeof (el as unknown).closest === 'function'
					? (el.closest('.tf-modal-form'))
					: null;

			const positionPanel = () => {
				if (typeof trigger.getBoundingClientRect !== 'function') return;
				if (typeof window === 'undefined' || typeof window.innerWidth !== 'number') return;
				const r = trigger.getBoundingClientRect();
				const ph = panel.offsetHeight || 320;
				const vw = window.innerWidth;
				const vh = window.innerHeight;
				// 宽度精确对齐编辑框（与触发器同宽），最小 280 保证可用性
				const width = Math.max(280, r.width || 0);
				const left = Math.min(r.left, Math.max(8, vw - width - 8));
				let top = r.bottom + 6;
				if (top + ph > vh - 8) top = Math.max(8, r.top - ph - 6);
				style(panel, {
					position: 'fixed',
					top: `${top}px`,
					left: `${Math.max(8, left)}px`,
					width: `${width}px`,
					right: 'auto',
				});
			};

			// 表单滚动时把面板重新贴回触发器（fixed 不会随内容滚动，否则会脱节）
			const reposition = () => {
				if (open) positionPanel();
			};

			const closePanel = () => {
				open = false;
				panel.classList.add('is-hidden');
				if (backdrop) {
					backdrop.remove();
					backdrop = null;
				}
				scrollForm?.removeEventListener('scroll', reposition, true);
			};
			const openPanel = () => {
				search.value = '';
				renderGrid('');
				panel.classList.remove('is-hidden');
				open = true;
				positionPanel();
				if (!backdrop) {
					backdrop = root.createEl('div', { cls: 'tf-icon-backdrop' });
					backdrop.addEventListener('click', () => closePanel());
				}
				scrollForm?.addEventListener('scroll', reposition, true);
				try {
					search.focus();
				} catch {
					/* 焦点仅是锦上添花 */
				}
			};

			const select = (name: string) => {
				current = name;
				iconBox.empty();
				setIcon(iconBox, name);
				nameEl.textContent = name;
				closePanel();
				paintField(el, null);
				void spec.onChange(name);
			};

			const renderGrid = (filter: string) => {
				grid.empty();
				const q = filter.trim().toLowerCase();
				const matches = q
					? GROUP_ICONS_SORTED.filter((n) => n.includes(q))
					: GROUP_ICONS_SORTED;

				// 无匹配时的两种回退：
				//  - 搜索词不在候选清单内 → 给出「使用自定义图标」入口
				//  - 其余情况 → 提示没有匹配
				// 有匹配就只显示匹配项，不掺自定义提示（否则筛选时噪音太大）。
				if (!matches.length) {
					if (q && !isKnownIcon(q)) {
						const custom = grid.createEl('button', {
							cls: 'tf-icon-tile tf-icon-tile-custom',
							attr: { type: 'button', 'data-icon': q },
						});
						custom.createEl('span', {
							cls: 'tf-icon-tile-name',
							text: t('modal.iconUseCustom', { name: q }),
						});
						custom.addEventListener('click', (e) => {
							e.stopPropagation();
							select(q);
						});
					} else {
						grid.createEl('div', {
							cls: 'tf-icon-empty',
							text: t('modal.iconNoMatch'),
						});
					}
					return;
				}

				for (const name of matches.slice(0, 400)) {
					const tile = grid.createEl('button', {
						cls: 'tf-icon-tile',
						attr: { type: 'button', 'data-icon': name, title: name },
					});
					const ico = tile.createEl('span', { cls: 'tf-icon-tile-icon' });
					setIcon(ico, name);
					tile.createEl('span', { cls: 'tf-icon-tile-name', text: name });
					tile.addEventListener('click', (e) => {
						e.stopPropagation();
						select(name);
					});
				}
			};

			trigger.addEventListener('click', (evt) => {
				evt.preventDefault();
				if (panel.classList.contains('is-hidden')) openPanel();
				else closePanel();
			});
			search.addEventListener('input', () => {
				renderGrid(search.value);
				// 结果数量变化会改变面板高度 → 重算位置（含上下翻转判断）
				if (open) positionPanel();
			});
			search.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					e.stopPropagation();
					closePanel();
				}
			});
			if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
				window.addEventListener('resize', positionPanel);
			}

			read = () => current;
			const teardown = () => {
				closePanel();
				panel.remove();
				if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
					window.removeEventListener('resize', positionPanel);
				}
			};
			handleTeardown = teardown;
			break;
		}
	}

	el.createEl('div', { cls: 'tf-field-message' });
	return { spec, el, read, teardown: handleTeardown };
}

export abstract class TFEditModal extends Modal {
	/**
	 * 打开弹窗的唯一入口。
	 * 连「构造 / open 阶段」失败也要让用户看见原因 ——
	 * 静默失败正是「点了编辑却弹出空白」最难查的地方。
	 */
	static launch<T extends Modal>(modal: T, label = t('modal.editTitle')): T {
		try {
			modal.open();
		} catch (error: unknown) {
			const msg = (error as Error)?.message ?? String(error);
			console.error('[TaskFlow] 打开弹窗失败:', error);
			try {
				new Notice(t('modal.openFail', { label, msg }));
			} catch {
				/* Notice 都不可用时至少喂给控制台了 */
			}
		}
		return modal;
	}

	/** 有改动未保存 */
	protected dirty = false;
	/** 新建实体：即使一个字都没改也要落盘 */
	protected forceSave = false;

	private fields: TFFieldHandle[] = [];
	private statusEl: HTMLElement | null = null;
	private saving = false;
	protected formEl: HTMLElement | null = null;

	/**
	 * 入口。刻意做成 final：子类实现 renderContent()，由这里统一兜错。
	 * 任何抛错都会被画进弹窗，而不是留下一片空白。
	 */
	onOpen(): void {
		try {
			this.renderContent();
		} catch (error: unknown) {
			console.error('[TaskFlow] 弹窗渲染失败:', error);
			this.renderError(error);
		}
	}

	/** 子类填内容的地方（原 onOpen） */
	protected abstract renderContent(): void;

	/** 渲染失败也绝不给人一个空盒子 —— 把原因直接显示出来 */
	private renderError(error: unknown): void {
		try {
			// 先清掉渲染到一半的残骸，并解除 flex/限高，免得错误信息被一大片空白围着
			this.contentEl.empty();
			this.contentEl.removeClass('tf-modal');
			this.contentEl.addClass('tf-modal-error-shell');
			style(this.contentEl, {
				display: 'block',
				'max-height': 'none',
				overflow: 'visible',
				padding: '0',
			});

			const box = this.contentEl.createEl('div', { cls: 'tf-modal-error' });
			style(box, {
				padding: '16px',
				'border-radius': '8px',
				border: '1px solid var(--tf-error, #dc2626)',
				'background-color': 'var(--tf-surface-card, #f5f5f5)',
				color: 'var(--tf-ink, #111111)',
				'font-size': '13px',
				'line-height': '1.6',
			});
			box.createEl('div', { text: t('modal.renderFail') });
			box.createEl('div', {
				text: (error as Error)?.message ?? String(error),
				cls: 'tf-modal-error-message',
			});
			const pre = box.createEl('pre', { cls: 'tf-modal-error-stack' });
			pre.textContent = (error as Error)?.stack ?? '';
			style(pre, {
				margin: '8px 0 0',
				'font-size': '11px',
				'white-space': 'pre-wrap',
				'word-break': 'break-all',
				color: 'var(--tf-muted, #6b7280)',
			});

			// 保证有一条退路，不至于困在弹窗里
			const btnWrap = this.contentEl.createEl('div');
			style(btnWrap, { 'margin-top': '12px' });
			const btn = new ButtonComponent(btnWrap);
			btn.setButtonText(t('common.close')).setCta().onClick(() => this.close());
		} catch {
			// 连错误面板都画不出来，至少别留空白
			this.contentEl.textContent = t('modal.renderFailDetail', { msg: String(error) });
		}
	}

	/** 搭好骨架，返回可挂载字段的表单容器 */
	protected buildShell(titleText: string): HTMLElement {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('tf-modal');

		// 三段式骨架。布局全部内联 —— 不依赖 styles.css，
		// 也不依赖 Obsidian 外壳的 flex 行为，任何版本都不会把内容挤出可视区。
		style(contentEl, {
			display: 'flex',
			'flex-direction': 'column',
			'min-height': '0',
			'max-height': 'min(60vh, 520px)',
			overflow: 'hidden',
			padding: '0',
			'box-sizing': 'border-box',
		});

		const title = contentEl.createEl('h2', { text: titleText, cls: 'tf-modal-title' });
		style(title, {
			flex: '0 0 auto',
			margin: '0',
			padding: '20px 20px 12px',
			'font-size': '18px',
			'font-weight': '600',
			'line-height': '1.3',
		});

		const form = contentEl.createEl('div', { cls: 'tf-modal-form' });
		style(form, {
			flex: '1 1 auto',
			'min-height': '0',
			'overflow-y': 'auto',
			display: 'flex',
			'flex-direction': 'column',
			padding: '0 20px 12px',
			'box-sizing': 'border-box',
		});
		this.formEl = form;

		const footer = contentEl.createEl('div', { cls: 'tf-modal-buttons' });
		style(footer, {
			flex: '0 0 auto',
			display: 'flex',
			'align-items': 'center',
			'justify-content': 'space-between',
			gap: '12px',
			padding: '12px 20px',
			'border-top': '1px solid var(--tf-hairline, #e5e7eb)',
			'background-color': 'var(--tf-canvas, transparent)',
		});
		this.statusEl = footer.createEl('span', { cls: 'tf-modal-status' });
		const actions = footer.createEl('div', { cls: 'tf-modal-buttons-actions' });
		style(actions, { display: 'flex', 'align-items': 'center', gap: '8px' });
		// 刻意用原生 <button>，不走 Setting.addButton + setClass：
		// setClass 只接受单个类名，传 'a b' 会在新版 Obsidian 抛
		// InvalidCharacterError（详见 setClasses 的注释）。
		const btnStyle: Record<string, string> = {
			padding: '6px 16px',
			'border-radius': '8px',
			'font-size': '13px',
			'font-family': 'inherit',
			'line-height': '1.4',
			cursor: 'pointer',
		};

		const cancelBtn = actions.createEl('button', { text: t('common.cancel') });
		setClasses(cancelBtn, 'tf-btn tf-btn-secondary');
		style(cancelBtn, {
			...btnStyle,
			border: '1px solid var(--tf-hairline, #e5e7eb)',
			'background-color': 'transparent',
			color: 'var(--tf-ink, inherit)',
		});
		cancelBtn.addEventListener('click', () => this.close());

		const saveBtn = actions.createEl('button', { text: t('common.save') });
		setClasses(saveBtn, 'tf-btn tf-btn-primary');
		style(saveBtn, {
			...btnStyle,
			border: '1px solid var(--tf-primary, #111111)',
			'background-color': 'var(--tf-primary, #111111)',
			color: 'var(--tf-on-primary, #ffffff)',
			'font-weight': '500',
		});
		saveBtn.addEventListener('click', () => void this.submit());

		// ⌘/Ctrl + Enter 保存。可选调用：即使没有 scope 也不影响渲染
		try {
			this.scope?.register?.(['Mod'], 'Enter', (evt: KeyboardEvent) => {
				evt.preventDefault();
				void this.submit();
				return false;
			});
		} catch {
			/* 快捷键只是锦上添花，失败就算了 */
		}

		return form;
	}

	protected addField(spec: TFFieldSpec): TFFieldHandle {
		const handle = renderTFField(this.formEl ?? this.contentEl, spec);
		this.fields.push(handle);
		return handle;
	}

	protected markDirty(): void {
		this.dirty = true;
		this.setStatus(t('modal.unsaved'));
	}

	protected setStatus(text: string, kind: 'info' | 'error' | 'success' = 'info'): void {
		if (!this.statusEl) return;
		this.statusEl.textContent = text;
		this.statusEl.className =
			kind === 'info' ? 'tf-modal-status' : `tf-modal-status is-${kind}`;
	}

	/** 保存前整表校验，失败时滚动到第一个出错的字段 */
	private validateAll(): boolean {
		let firstBad: HTMLElement | null = null;
		for (const field of this.fields) {
			if (!field.spec.validation) continue;
			const error = field.spec.validation(field.read());
			paintField(field.el, error);
			if (error && !firstBad) firstBad = field.el;
		}
		if (firstBad) {
			try {
				firstBad.scrollIntoView({ block: 'center' });
			} catch {
				/* 老版本不支持 options 参数 */
			}
			this.setStatus(t('modal.fixFields'), 'error');
			return false;
		}
		return true;
	}

	protected async submit(): Promise<void> {
		if (this.saving) return;
		if (!this.dirty && !this.forceSave) {
			this.close();
			return;
		}
		if (!this.validateAll()) return;

		this.saving = true;
		this.setStatus(t('modal.saving'));
		try {
			await this.doSave();
			this.dirty = false;
			this.close();
		} catch (error: unknown) {
			this.setStatus(t('modal.saveFail', { msg: error?.message ?? String(error) }), 'error');
		} finally {
			this.saving = false;
		}
	}

	/** 真正的落盘动作，由子类实现 */
	protected abstract doSave(): void | Promise<void>;

	onClose(): void {
		// 先清理可能挂在 body 上的浮层（icon-picker），再清空内容，避免泄漏
		for (const field of this.fields) field.teardown?.();
		this.contentEl.empty();
		this.fields = [];
		this.formEl = null;
		this.statusEl = null;
		super.onClose();
	}
}
