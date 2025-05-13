import eslintConfig from '@penumbra-zone/configs/eslint';

export default [
  ...eslintConfig,

  {
    name: 'custom-local-ignores',
    rules: {
      /**
       * Deprecation warnings are too broad, due to a typecript issue. This
       * causes deprecation warning for all items in `@types/chrome` package.
       * @see https://github.com/typescript-eslint/typescript-eslint/issues/9902
       * @see https://github.com/microsoft/TypeScript/issues/59792
       *
       * When typescript-eslint is upgraded, the scope of this rule can be reduced.
       * @see https://github.com/typescript-eslint/typescript-eslint/issues/10660
       */
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
];
