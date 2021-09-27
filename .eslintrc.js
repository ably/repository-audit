module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'no-console': ['off'],
    'max-len': ['off'],
    'no-use-before-define': ['off'],

    // This rule was complaing at: require('jose/jwt/sign')
    // Even though the code was executing fine.
    'import/no-unresolved': ['off'],
  },
};
