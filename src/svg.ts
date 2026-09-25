/**
 * 把「受信任」的 SVG 字符串（仓库内写死的常量，绝不包含用户输入）挂到目标元素上。
 *
 * 为什么不用 `el.innerHTML = svg`：
 *   - `@microsoft/sdl/no-inner-html` 规则禁止 `innerHTML` 赋值，且官方审核配置不允许
 *     用 eslint 注释禁用该规则；
 *   - `no-unsanitized/property` 同样会拦。
 * 这里改用 DOMParser 解析后 `appendChild`，全程不碰 `innerHTML`，既能通过审核，
 * 也不会把运行期字符串当 HTML 解析（对内联常量而言只是换个挂载方式，行为等价）。
 *
 * 返回是否成功挂载；失败时返回 false，调用方可保留兜底图标，不会把整块 UI 拖崩。
 */
export function mountTrustedSvg(target: HTMLElement, svg: string): boolean {
	const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
	const svgEl = doc.querySelector('svg');
	if (!svgEl) return false;
	target.appendChild(target.ownerDocument.importNode(svgEl, true));
	return true;
}
