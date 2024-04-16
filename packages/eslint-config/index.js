module.exports = {
  extends: ['prettier', 'eslint:recommended', 'turbo', 'plugin:tailwindcss/recommended'],
  plugins: ['turbo', 'react-refresh'],
  rules: {},
  overrides: [],
  ignorePatterns: ['dist/*'],
  settings: {
    'import/resolver': {
      typescript: true,
    },
  },
};
