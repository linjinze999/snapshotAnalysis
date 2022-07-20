module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'plugin:vue/essential',
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  plugins: [
    'vue',
    '@typescript-eslint',
  ],
  rules: {
    camelcase: 'off',
    'no-plusplus': 'off',
    'max-len': 'off',
    'no-bitwise': 'off',
    'class-methods-use-this': 'off',
    'no-continue': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'no-shadow': 'off',
    'no-unused-vars': 'off',
  },
};
