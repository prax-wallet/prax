import eslintConfig from '@penumbra-zone/configs/eslint';

export default [
  ...eslintConfig,

  {
    name: 'custom-local-ignores',
    rules: {
      /**
       * Deprecation warnings are too broad, due to a typescript issue. This
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

  {
    /**
     * Rules to prevent unexpected changes in versioned storage definitions. If
     * you update these rules, you should also update ./src/versions/README.md
     */
    name: 'versions-rules',
    files: ['src/versions/*.ts'],
    rules: {
      /**
       * Enforces use of `type` instead of `interface` for storage definitions.
       * This is necessary due to use as type parameters that must meet the
       * restriction `Record<string, unknown>`.
       */
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],

      'import/no-named-export': 'error',

      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [{ group: ['*'], message: 'Imported items may change.' }] },
      ],
    },
  },

  {
    /**
     * Rules to prevent unexpected changes in storage migrations. If you update
     * these rules, you should also update ./src/migrations/README.md
     */
    name: 'migrations-rules',
    files: ['src/migrations/*.ts'],
    ignores: ['src/migrations/util.ts', 'src/migrations/types.ts'],
    rules: {
      'import/no-named-export': 'error',

      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['../*', '!../versions', '!../versions/*'],
              message: 'Only import from `../versions/*` in parent directories.',
            },
            { group: ['./*', '!./util'], message: 'Only import from `./util` in this directory.' },
          ],
        },
      ],

      /**
       * Migrations should avoid imports, but some imports are necessary for
       * things like message parsing, and should be mostly safe.
       *
       * Items in package.json `dependencies` are allowed.
       */
      'import/no-extraneous-dependencies': [
        'error',
        {
          includeTypes: true,
          includeInternal: true,

          bundledDependencies: false,
          devDependencies: false,
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
    },
  },
];
