import penumbraConfig from '@penumbra-zone/configs/eslint';

export default [
  ...penumbraConfig,
  {
    name: 'allow-console-in-tests',
    files: ['**/*.test.ts', 'tests-setup.ts', '__mocks__/**/*.ts'],
    rules: {
      'no-console': { allow: ['debug', 'count'] },
    },
  },
];
