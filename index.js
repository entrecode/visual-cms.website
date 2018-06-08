const expressPromiseRouter = require('express-promise-router');
const configModule = require('config');
const libDatamanager = require('./datamanager');
const libExpress = require('./express');
const libNunjucksEnv = require('./nunjucksEnv');
const CSP = require('./CSP');
const cache = require('./cache');

const instances = new Map();

module.exports = (projectName, basedir, disableDataManager = false) => {
  if (instances.has(projectName)) {
    return instances.get(projectName);
  }

  const config = 'customers' in configModule && projectName in configModule.customers ? configModule.customers[projectName] : configModule;
  config.basedir = basedir;
  const options = config.variableStart && config.variableEnd ? {
    tags: {
      variableStart: config.variableStart,
      variableEnd: config.variableEnd,
    },
  } : {};
  const csp = new CSP();
  const { app, server, errorHandler } = libExpress(config, csp);
  let datamanager;
  if (disableDataManager) {
    datamanager = false;
  } else {
    datamanager = libDatamanager(config);
  }
  const nunjucksEnv = libNunjucksEnv(config, datamanager, options);

  nunjucksEnv.express(app);

  const router = expressPromiseRouter();
  app.use(router);
  app.use(errorHandler);

  const instance = {
    config,
    express: app,
    server,
    router,
    csp,
    datamanager,
    nunjucksEnv,
    cache,
    newNunjucksEnv: () => libNunjucksEnv(config, datamanager, options),
  };

  instances.set(projectName, instance);

  return instance;
};
