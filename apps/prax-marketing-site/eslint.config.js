import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';
import js from '@eslint/js';

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  recommendedConfig: js.configs.recommended,
  baseDirectory: __dirname,
});

export default [
  // mimic ESLintRC-style extends
  ...compat.extends('@repo/eslint-config/index.js'),
];
