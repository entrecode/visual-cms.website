const expressPromiseRouter = require('express-promise-router');
const configModule = require('config');
const libDatamanager = require('./datamanager');
const libExpress = require('./express');
const libNunjucksEnv = require('./nunjucksEnv');

module.exports = function(projectName, basedir) {
  const config = ('customers' in configModule && projectName in configModule.customers) ? configModule.customers[projectName] : configModule;
  config.basedir = basedir;
  const expressApp = libExpress(config);
  const datamanager = libDatamanager(config);
  const nunjucksEnv = libNunjucksEnv(config, datamanager);

  nunjucksEnv.express(expressApp);

  const router = expressPromiseRouter();
  expressApp.use(router);

  return {
    config,
    express: expressApp,
    router,
    datamanager,
    nunjucksEnv,
  };
};
