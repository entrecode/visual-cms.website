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

function setupExpress(config) {

  const app = express();

  app.set('x-powered-by', false);
  app.set('env', 'production');
  app.set('trust proxy', true);

  const CSP = {
    NONE: '\'none\'',
    UNSAFEINLINE: '\'unsafe-inline\'',
    SELF: '\'self\'',
  };

  app.use((req, res, next) => {
    const contentSecurityPolicyDefinition = {
      'default-src': [CSP.NONE],
      'script-src': [
        CSP.SELF,
        '*.entrecode.de',
      ],
      'object-src': [CSP.NONE],
      'style-src': [CSP.SELF],
      'img-src': ['*'],
      'media-src': ['*'],
      'frame-src': ['*'],
      'font-src': [
        CSP.SELF,
        '*.entrecode.de',
      ],
      'connect-src': [
        CSP.SELF,
        '*.entrecode.de',
      ],
    };
    const contentSecurityPolicy = Object.keys(contentSecurityPolicyDefinition)
    .map(key => `${key} ${contentSecurityPolicyDefinition[key].join(' ')}`)
    .join('; ');
    res.header('Content-Security-Policy', contentSecurityPolicy);
    res.header('X-Content-Security-Policy', contentSecurityPolicy);
    res.header('X-WebKit-CSP', contentSecurityPolicy);

    res.header('Access-Control-Allow-Origin', config.publicURL);

    return next();
  });
  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({ limit: '1mb' }));

   app.use(express.static(path.resolve(config.basedir, './static'), {
   maxAge: '1 day',
   }));

  app.use((req, res, next) => {
    next();
  });
  return app;
}

module.exports = setupExpress;