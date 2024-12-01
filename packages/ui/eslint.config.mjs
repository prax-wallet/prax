import eslintConfig from '@penumbra-zone/configs/eslint';

export default [
  ...eslintConfig,
  {
    name: 'custom-local-ignores',
    rules: {
      // Existing disabled rules
      'no-nested-ternary': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Fragment-related rules
      'react/jsx-no-useless-fragment': 'off',

      // Parameter reassignment
      'no-param-reassign': 'off',

      // Comment formatting and descriptions
      '@eslint-community/eslint-comments/require-description': 'off',
      'spaced-comment': 'off',

      // Tailwind CSS rules
      'tailwindcss/no-unnecessary-arbitrary-value': 'off',

      // Bitwise operations
      'no-bitwise': 'off',

      // React Hooks dependencies
      'react-hooks/exhaustive-deps': 'off',

      // Switch exhaustiveness
      '@typescript-eslint/switch-exhaustiveness-check': 'off',

      // Deprecation warnings
      '@typescript-eslint/no-deprecated': 'off',

      // Type conversion and string representation
      '@typescript-eslint/no-base-to-string': 'off',
    },
    settings: {
      // Add React version to prevent the warning
      react: {
        version: 'detect',
      },
    },
  },
];
