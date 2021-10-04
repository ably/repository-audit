module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
    'plugin:jsdoc/recommended',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  plugins: [
    'jest',
    'jsdoc',
  ],
  rules: {
    'no-console': ['off'],
    'max-len': ['off'],
    'no-use-before-define': ['off'],
    'max-classes-per-file': ['off'],
  },
};
