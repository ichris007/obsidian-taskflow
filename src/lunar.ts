/* ═══════════════════════════════════════════════════════════════════════════
   公历 → 农历（查表法，覆盖 1900-2100）
   ───────────────────────────────────────────────────────────────────────────
   头部右侧那行「星期日 · 农历 八月初十」需要的就是这张表。农历没有可算的
   简单公式（闰月规则依赖天文观测），工业界通行做法是内置一张 1900-2100 的
   压缩位表：每 4 字节描述一年。

   表的编码（每个数 32 位）：
     bit 17-20  1-12 月每月是大月(30)还是小月(29)，1 表示 30 天
     bit 16     闰月是大月(30)还是小月(29)，1 表示 30 天
     bit 4-15   1-12 月每月的大小（同上，与 bit 17-20 重复，是两种写法的兼容位）
     bit 0-3    本年闰哪个月，0 表示不闰

   零依赖纯函数：不碰 obsidian、不碰 DOM，方便在 node 实验台里直接断言。
   ═══════════════════════════════════════════════════════════════════════════ */

const LUNAR_TABLE: number[] = [
	0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
	0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
	0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
	0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
	0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
	0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
	0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
	0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
	0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
	0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
	0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
	0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
	0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
	0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
	0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
	0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
	0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
	0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
	0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
	0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
	0x0d520,
];

const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];

const LUNAR_DAYS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
	'十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
	'廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

const WEEKDAYS_ZH = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

/** 星期名（英文界面用）。沿用 JS getDay() 的 0=周日 顺序。 */
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** 月份缩写（英文界面用），与 WEEKDAYS_EN 同理。 */
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

/** 某农历年的总天数 */
function lunarYearDays(year: number): number {
	const data = LUNAR_TABLE[year - 1900]!;
	let sum = 348; // 12 个月 × 29 天
	for (let bit = 0x8000; bit > 0x8; bit >>= 1) {
		if (data & bit) sum += 1;
	}
	return sum + lunarLeapDays(year);
}

/** 闰月的天数；该年不闰则为 0 */
function lunarLeapDays(year: number): number {
	if (!lunarLeapMonth(year)) return 0;
	return (LUNAR_TABLE[year - 1900]! & 0x10000) ? 30 : 29;
}

/** 本年闰几月，0 = 不闰 */
function lunarLeapMonth(year: number): number {
	return LUNAR_TABLE[year - 1900]! & 0xf;
}

/** 某农历年某月的天数 */
function lunarMonthDays(year: number, month: number): number {
	return (LUNAR_TABLE[year - 1900]! & (0x10000 >> month)) ? 30 : 29;
}

/** 某农历年依次经过的所有月份（闰月插在对应月份之后） */
function lunarYearMonths(year: number): { month: number; leap: boolean; days: number }[] {
	const leap = lunarLeapMonth(year);
	const out: { month: number; leap: boolean; days: number }[] = [];
	for (let m = 1; m <= 12; m++) {
		out.push({ month: m, leap: false, days: lunarMonthDays(year, m) });
		if (m === leap) out.push({ month: m, leap: true, days: lunarLeapDays(year) });
	}
	return out;
}

/**
 * 公历日期 → 农历月日，如「八月初十」「闰二月十五」。
 * 超出表范围（1900-2100）返回空串 —— 调用方据此决定要不要显示这一段。
 */
export function lunarCN(date: Date): string {
	const y = date.getFullYear();
	const m = date.getMonth() + 1;
	const d = date.getDate();
	if (y < 1900 || y > 2100) return '';

	// 1900-01-31 是这张表的原点（农历 1900 年正月初一）
	let offset = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000);
	let year = 1900;
	while (year < 2101) {
		const days = lunarYearDays(year);
		if (offset < days) break;
		offset -= days;
		year++;
	}

	for (const seg of lunarYearMonths(year)) {
		if (offset < seg.days) {
			const day = offset + 1;
			if (day < 1 || day > 30) return '';
			return (seg.leap ? '闰' : '') + LUNAR_MONTHS[seg.month - 1] + '月' + LUNAR_DAYS[day - 1];
		}
		offset -= seg.days;
	}
	return '';
}

/** 星期名：中文「星期日」…「星期六」，英文 "Sunday"…"Saturday" */
export function weekdayName(date: Date, lang: 'zh' | 'en'): string {
	const table = lang === 'en' ? WEEKDAYS_EN : WEEKDAYS_ZH;
	return table[date.getDay()] ?? '';
}

/**
 * 头部右侧那行大字：日期 + 时间。
 *   中文「2026/09/21 12:01」——年月日顺序，符合中文阅读习惯
 *   英文「Sep 21, 2026 12:01」——英文用「月 日, 年」并把月份写成缩写词
 */
export function formatHeadClock(date: Date, lang: 'zh' | 'en'): string {
	const time = pad2(date.getHours()) + ':' + pad2(date.getMinutes());
	if (lang === 'en') {
		const month = MONTHS_EN[date.getMonth()] ?? '';
		return `${month} ${date.getDate()}, ${date.getFullYear()} ${time}`;
	}
	return (
		date.getFullYear() +
		'/' +
		pad2(date.getMonth() + 1) +
		'/' +
		pad2(date.getDate()) +
		' ' +
		time
	);
}
