import { eslintConfig } from '@penumbra-zone/configs/eslint';
import { config, parser } from 'typescript-eslint';

export default config({
  ...eslintConfig,
  languageOptions: {
    parser,
    parserOptions: {
      project: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
