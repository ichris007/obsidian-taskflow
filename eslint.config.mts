import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores } from 'eslint/config';

export default tseslint.config(
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		// 项目级微调：
		// - sentence-case 与品牌名「TaskFlow」冲突（规则会把 TaskFlow 改成 Taskflow），关闭以免误伤 UI 文案。
		// - prefer-active-doc 仅影响 popout 窗口兼容，且测试桩未定义 activeDocument，关闭避免误改/测不过。
		rules: {
			'obsidianmd/ui/sentence-case': 'off',
			'obsidianmd/prefer-active-doc': 'off',
		},
	},
);
