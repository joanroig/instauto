module.exports = {
  extends: ['mifi'],
  rules: {
    'unicorn/prefer-global-this': 0,
  },
  env: {
    browser: true, // puppeteer
  },
};
