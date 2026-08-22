import js from '@eslint/js';

// ESLint 9 flat config。
// 范围：仅 lint 本次新增 / 修改的 ESM 文件（public/viewport.js 与 test/**）。
// index.html 内联脚本与 api/*.js 未纳入，避免对既有可用代码引入 lint 改动。
export default [
  { ignores: ['node_modules/**', '.vercel/**'] },
  {
    files: ['public/**/*.js', 'test/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
