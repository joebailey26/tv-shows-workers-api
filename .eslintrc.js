// https://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'module',
    parser: '@babel/eslint-parser',
    requireConfigFile: false
  },
  env: {
    browser: true,
    node: true
  },
  // https://github.com/standard/standard/blob/master/docs/RULES-en.md
  extends: [
    '@nuxtjs',
    'plugin:nuxt/recommended'
  ],
  // add your custom rules here
  rules: {
    // allow async-await
    'generator-star-spacing': 'off',
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'vue/comment-directive': 0,
    'vue/no-v-html': 0,
    'vue/component-tags-order': ['error', {
      order: ['style', 'template', 'script']
    }],
    'no-console': 'off',
    'vue/require-default-prop': 0,
    'vue/require-prop-types': 0
  }
}
