// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser, // Explicitly use the TypeScript parser
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
    },
  },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
);