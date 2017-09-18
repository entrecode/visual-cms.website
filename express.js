/**
 * express.js class
 *
 * DO NOT CHANGE THIS FILE!
 *
 * sets up express and filters
 */

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

function setupExpress(config, csp) {

  const app = express();

  app.set('x-powered-by', false);
  app.set('env', 'production');
  app.set('trust proxy', true);

  app.use((req, res, next) => csp.middleware(req, res, next));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', config.publicURL);
    return next();
  });
  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({ limit: '1mb' }));

  app.use(express.static(path.resolve(config.basedir, './static'), {
    maxAge: `${365.25 / 12} days`, // 1 month
  }));

  return app;
}

module.exports = setupExpress;
