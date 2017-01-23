const expressPromiseRouter = require('express-promise-router');
const configModule = require('config');
const libDatamanager = require('./datamanager');
const libExpress = require('./express');
const libNunjucksEnv = require('./nunjucksEnv');
const CSP = require('./CSP');

const instances = new Map();

module.exports = function(projectName, basedir) {
  if (instances.has(projectName)) {
    return instances.get(projectName);
  }

  const config = ('customers' in configModule && projectName in configModule.customers) ? configModule.customers[projectName] : configModule;
  config.basedir = basedir;
  const csp = new CSP();
  const expressApp = libExpress(config, csp);
  const datamanager = libDatamanager(config);
  const nunjucksEnv = libNunjucksEnv(config, datamanager);

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
  };

  instances.set(projectName, instance);

  return instance;
};
