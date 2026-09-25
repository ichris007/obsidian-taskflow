import { App, Modal } from 'obsidian';
import { t } from '../i18n';

/**
 * 轻量确认弹窗，替代原生 `confirm()`。
 *
 * 官方审查要求弃用 `window.confirm` / `alert` / `prompt`（`no-alert` 规则），
 * 因为它们是阻塞式原生对话框、在 Obsidian 里体验不一致。这里用 Obsidian 自带的
 * `Modal` 画一个非阻塞确认框，文案与「确定 / 取消」按钮走 i18n。
 *
 * 用法：
 *   new ConfirmModal(app, message, () => { 确认后的操作 }).open();
 */
export class ConfirmModal extends Modal {
	private readonly message: string;
	private readonly onConfirm: () => void;

	constructor(app: App, message: string, onConfirm: () => void) {
		super(app);
		this.message = message;
		this.onConfirm = onConfirm;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('tf-confirm');

		contentEl.createEl('div', { cls: 'tf-confirm-message', text: this.message });

		const actions = contentEl.createEl('div', { cls: 'tf-confirm-actions' });

		const cancelBtn = actions.createEl('button', {
			text: t('common.cancel'),
			attr: { type: 'button' },
		});
		cancelBtn.addEventListener('click', () => this.close());

		const okBtn = actions.createEl('button', {
			text: t('common.confirm'),
			attr: { type: 'button' },
		});
		okBtn.addEventListener('click', () => {
			this.onConfirm();
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
