/**
 * TaskFlow 品牌视觉资源（全部自绘 SVG，零外部图片文件）。
 *
 * 两件东西：
 *   1. `TASKFLOW_ICON_SVG` —— 插件标识。Ribbon 左侧图标与设置面板「关于」页共用，
 *      对着用户给的设计稿画：蓝→紫渐变圆角方块 + 两道白色水波。
 *      水波呼应 slogan「让任务像水一样流动」，是唯一能一眼认出插件的元素。
 *   2. `defaultBannerSvg()` —— 头部默认横幅。用户没放自己的横幅图时顶上，
 *      避免头部空一块灰底；背景是同一套品牌的渐变 + 淡白水波，中间压一句话。
 *      做成**内联 SVG 而不是图片文件**：不往用户库里写文件、不产生孤儿图、
 *      任何缩放都不糊，也省掉打包二进制资源与跨主题适配。
 *
 * 单独成文件的原因：main.ts（Ribbon）、view.ts（默认横幅）、settings.ts（关于页）
 * 都要用，而 settings.ts 只以 `import type` 引 main.ts，常量若放 main.ts 会形成
 * 值层面的循环依赖。这里零依赖，谁都能安全引用。
 *
 * 图标用 SVG `fill`（不是 currentColor 描边）：标识本身有固定品牌色，
 * 与主题无关；深浅主题下都是同一个蓝紫方块，识别度不随主题漂移。
 */
export const TASKFLOW_ICON_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" class="tf-brand-mark" viewBox="0 0 24 24" ' +
	'width="18" height="18" aria-hidden="true" focusable="false">' +
	'<defs>' +
	'<linearGradient id="tfBrandMarkGrad" x1="0" y1="0" x2="1" y2="1">' +
	'<stop offset="0" stop-color="#5b8cff"/>' +
	'<stop offset="1" stop-color="#7357f5"/>' +
	'</linearGradient>' +
	'</defs>' +
	'<rect x="0.4" y="0.4" width="23.2" height="23.2" rx="6.8" fill="url(#tfBrandMarkGrad)"/>' +
	'<path d="M5.4 9.6c1.9-3.1 4.6-3.1 6.5-.1s4.6 3 6.5-.1" fill="none" ' +
	'stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>' +
	'<path d="M5.4 14.3c1.9-3.1 4.6-3.1 6.5-.1s4.6 3 6.5-.1" fill="none" ' +
	'stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>' +
	'</svg>';

/** SVG 文本节点转义：品牌语由 i18n 提供，用户改文案时不能把 SVG 结构撑破。 */
function escapeXml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * 一句话要多大的字号才塞得进横幅。
 *
 * 横幅是「很扁的长条」（容器 aspect-ratio 16/2.4），且不同语言同一句话的字宽差一倍
 * （中文一字一 em，英文约 0.55em）。写死字号的话，中文太挤、英文出框。
 * 这里按「估算宽度 → 反推字号」：中文字符算 1em、其余算 0.55em，可用宽度 1000（画布 1200，左右各留 100）。
 */
function bannerFontSize(text: string): number {
	let width = 0;
	for (const ch of text) {
		width += /[\u2e80-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.55;
	}
	if (width <= 0) return 46;
	return Math.max(22, Math.min(46, 1000 / width));
}

/**
 * 头部默认横幅（内联 SVG，随容器等比裁切，等价于 object-fit:cover）。
 *
 * 竖版构图刻意压在中带（y 70~230）：`slice` 缩放会裁掉上下两端，
 * 内容放太靠边会被裁没。水波只作肌理，透明度压到 0.16 / 0.10，不抢那行字。
 */
export function defaultBannerSvg(sentence: string): string {
	const size = bannerFontSize(sentence);
	const safe = escapeXml(sentence);
	return (
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" ' +
		'preserveAspectRatio="xMidYMid slice" width="100%" height="100%" ' +
		'class="tf-default-banner-svg" aria-hidden="true" focusable="false">' +
		'<defs>' +
		'<linearGradient id="tfBannerBg" x1="0" y1="0" x2="1" y2="1">' +
		'<stop offset="0" stop-color="#5b8cff"/>' +
		'<stop offset="0.55" stop-color="#6b6bf9"/>' +
		'<stop offset="1" stop-color="#7c4ff2"/>' +
		'</linearGradient>' +
		'</defs>' +
		'<rect width="1200" height="300" fill="url(#tfBannerBg)"/>' +
		'<path d="M-60 244c95-48 200-48 295 0s200 48 295 0 200-48 295 0 200 48 295 0" ' +
		'fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="18" stroke-linecap="round"/>' +
		'<path d="M-60 292c95-48 200-48 295 0s200 48 295 0 200-48 295 0 200 48 295 0" ' +
		'fill="none" stroke="#ffffff" stroke-opacity="0.10" stroke-width="18" stroke-linecap="round"/>' +
		'<text x="600" y="112" text-anchor="middle" fill="#ffffff" fill-opacity="0.72" ' +
		'font-family="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" ' +
		'font-size="26" font-weight="700" letter-spacing="7">TASKFLOW</text>' +
		'<text x="600" y="182" text-anchor="middle" fill="#ffffff" ' +
		'font-family="Inter, PingFang SC, Hiragino Sans GB, Microsoft YaHei, -apple-system, sans-serif" ' +
		`font-size="${size.toFixed(1)}" font-weight="600" letter-spacing="1">${safe}</text>` +
		'</svg>'
	);
}
