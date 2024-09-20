import globals from 'globals';
import pluginJs from '@eslint/js';
import stylisticJs from '@stylistic/eslint-plugin-js';
import babelParser from '@babel/eslint-parser';


export default [
	pluginJs.configs.recommended,
	{
		plugins: {
			'@stylistic/js': stylisticJs
		},
		rules: {
			'semi': 'error',
			'no-sparse-arrays': 'off',
			'@stylistic/js/indent': ['error', 'tab'],
			'@stylistic/js/arrow-spacing': ['error', { 'before': true, 'after': true }],
			'@stylistic/js/block-spacing': ['error', 'never'],
			'@stylistic/js/no-trailing-spaces': 'error',
			'@stylistic/js/lines-between-class-members': ['error', 'always'],
			'@stylistic/js/no-whitespace-before-property': 'error',
			'@stylistic/js/padding-line-between-statements': [
				'error',
				{'blankLine': 'always', 'prev': 'function', 'next':  'function'},
				{'blankLine': 'always', 'prev': 'class', 'next': 'class'},
			],
			'@stylistic/js/max-len': ['error', { 'code': 120 }],
		},
		ignores: ['eslint.config.mjs', 'Backup/**/*'],
		files: ['**/*.js'],
		languageOptions: {
			globals: globals.browser, 
			sourceType: 'script', 
			parser: babelParser,
			parserOptions: {
				ecmaVersion: 6,
				sourceType: 'module',
				ecmaFeatures: {
					jsx: true,
				},
				requireConfigFile: false,
				babelOptions: {
					babelrc: false,
					configFile: false,
					presets: ['@babel/preset-env']
				},
			},
		},
	},
];
