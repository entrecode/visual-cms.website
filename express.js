/**
 * express.js class
 *
 * DO NOT CHANGE THIS FILE!
 *
 * sets up express and filters
 */

const bodyParser = require('body-parser');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const express = require('express');
const http = require('http');
const path = require('path');

const packageJson = require('./package');

function setupExpress(config, csp) {
  const app = express();
  const server = http.createServer(app);
  server.listen(config.port, () =>
    console.info(`${process.title} ${process.pid} started and listening on port ${server.address().port} (v.${packageJson.version})`)); // eslint-disable-line

  app.set('x-powered-by', false);
  app.set('env', 'production');
  app.set('trust proxy', true);

  app.enable('trust proxy'); // tell Express that it is being reverse-proxied

  app.use(compression());
  app.use((req, res, next) => csp.middleware(req, res, next));
  app.use((req, res, next) => {
    // some basic security headers
    res.header('X-Powered-By', `entrecode ${config.friendlyName} v${packageJson.version} (w${process.pid})`);
    res.header('Strict-Transport-Security', 'max-age=31536000');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('X-Content-Type-Options', 'nosniff');

    // and cors <3
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    if (
      config.corsRoutes &&
      Array.isArray(config.corsRoutes) &&
      config.corsRoutes.length &&
      config.corsRoutes.find((route) => req.path.startsWith(route))
    ) {
      res.header('Access-Control-Allow-Origin', '*');
    } else {
      res.header('Access-Control-Allow-Origin', config.publicURL);
    }
    res.header('Access-Control-Expose-Headers', 'Allow');
    if (req.get('Access-Control-Request-Headers')) {
      res.header('Access-Control-Allow-Headers', req.get('Access-Control-Request-Headers'));
    }

    // explicitly end preflight requests here
    if (req.method.toUpperCase() === 'OPTIONS') {
      return res.status(200).send('GET,HEAD,POST,PUT,DELETE');
    }

    return next();
  });

  app.get('/health', (req, res) => res.send({ health: 'ok' }));

  // lowercase all query parameter keys
  app.use((req, res, next) => {
    Object.keys(req.query).forEach((key) => {
      req.query[key.toLowerCase()] = req.query[key];
      if (key !== key.toLowerCase()) {
        delete req.query[key];
      }
    });
    return next();
  });

  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({ limit: '1mb' }));

  // TODO ec.logger middleware

  app.use(
    express.static(path.resolve(config.basedir, './static'), {
      maxAge: `${365.25 / 12} days`, // 1 month
    }),
  );

  function errorHandler(err, req, res, next) {
    // TODO ec.error handler?
    console.error(err.stack);  // eslint-disable-line
    try {
      // stop taking new requests.
      server.close();

      // try to send an error to the request that triggered the problem
      // res.status(500);
      // res.send({error: err.message});
      if (process.env.NODE_ENV !== 'testing') {
        process.exit(1); // eslint-disable-line
      }
    } catch (er2) {
      // oh well, not much we can do at this point.
    }
    next(err);
  }

  return {
    app,
    server,
    errorHandler,
  };
}

module.exports = setupExpress;
