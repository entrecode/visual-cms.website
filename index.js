const expressPromiseRouter = require('express-promise-router');
const configModule = require('config');
const libDatamanager = require('./datamanager');
const libExpress = require('./express');
const libNunjucksEnv = require('./nunjucksEnv');
const CSP = require('./CSP');
const cache = require('./cache');
const instances = new Map();

module.exports = function (projectName, basedir, disableDataManager = false) {
  if (instances.has(projectName)) {
    return instances.get(projectName);
  }

  const config = ('customers' in configModule && projectName in configModule.customers) ? configModule.customers[projectName] : configModule;
  config.basedir = basedir;
  const options = config.variableStart && config.variableEnd ? {
    tags: {
      variableStart: config.variableStart,
      variableEnd: config.variableEnd
    }
  } : {};
  const csp = new CSP();
  const expressApp = libExpress(config, csp);
  let datamanager;
  if (disableDataManager) {
    datamanager = false
  } else {
    datamanager = !disableDataManager || libDatamanager(config);
  }
  const nunjucksEnv = libNunjucksEnv(config, datamanager, options);

  nunjucksEnv.express(expressApp);

  const router = expressPromiseRouter();
  expressApp.use(router);

  const instance = {
    config,
    express: expressApp,
    router,
    csp,
    datamanager,
    nunjucksEnv,
    cache,
  };

  instances.set(projectName, instance);

  return instance;
};
