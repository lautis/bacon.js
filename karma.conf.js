// Karma configuration
// Generated on Thu Oct 29 2015 19:30:27 GMT+0200 (EET)

module.exports = function(config) {
  var customLaunchers = {
    sl_chrome: {
      base: 'SauceLabs',
      browserName: 'chrome',
    },
    sl_firefox: {
      base: 'SauceLabs',
      browserName: 'firefox',
    },
    sl_ios_safari: {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'OS X 10.11',
    },
    sl_ie_11: {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 8.1',
      version: '11'
    }
  };

  config.set({
    basePath: '',
    frameworks: ['mocha'],
    files: [
      'node_modules/jquery/dist/jquery.js',
      'browsertest/bundle.js',
    ],
    sauceLabs: {
      testName: 'Bacon.js Unit Tests'
    },
    customLaunchers: customLaunchers,
    browsers: Object.keys(customLaunchers),
    exclude: [],
    preprocessors: {},
    reporters: ['progress', 'saucelabs'],
    singleRun: true,
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    concurrency: Infinity
  });
};
