import eslintConfig from '@penumbra-zone/configs/eslint';

export default [
  ...eslintConfig,
  {
    name: 'custom-local-ignores',
    rules: {
      // Existing disabled rules
      'no-nested-ternary': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Chrome-related deprecation warnings
      '@typescript-eslint/no-deprecated': 'off',

      // React Hooks warnings
      'react-hooks/exhaustive-deps': 'off',

      // Global object usage
      'no-restricted-globals': 'off',

      // Fragment usage
      'react/jsx-no-useless-fragment': 'off',

      // Parameter reassignment
      'no-param-reassign': 'off',

      // Import duplicates
      'import/no-duplicates': 'off',

      // Unused vars and expressions
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',

      // Await and promise-related rules
      '@typescript-eslint/await-thenable': 'off',
      'no-promise-executor-return': 'off',

      // Type parameter rules
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',

      // Switch exhaustiveness
      '@typescript-eslint/switch-exhaustiveness-check': 'off',

      // Console statements
      'no-console': 'off',

      // Comment formatting
      'spaced-comment': 'off',
      '@eslint-community/eslint-comments/require-description': 'off',

      // Catch callback type
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',

      // Global definition (for tests)
      'no-undef': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
