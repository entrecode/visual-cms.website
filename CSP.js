// symbols for "private" properties of Shop class

const defaultSymbol = Symbol('default-src');
const scriptSymbol = Symbol('script-src');
const objectSymbol = Symbol('object-src');
const styleSymbol = Symbol('style-src');
const imgSymbol = Symbol('img-src');
const mediaSymbol = Symbol('media-src');
const frameSymbol = Symbol('frame-src');
const fontSymbol = Symbol('font-src');
const connectSymbol = Symbol('connect-src');

/**
 * A Content Security Policy
 */
class CSP {

   get NONE() {
    return '\'none\'';
  }

   get UNSAFEINLINE() {
    return '\'unsafe-inline\'';
  }

   get SELF() {
    return '\'self\'';
  }

  constructor() {
    this[defaultSymbol] = [CSP.NONE];
    this[scriptSymbol] = [
      CSP.SELF,
      '*.entrecode.de',
    ];
    this[objectSymbol] = [CSP.NONE];
    this[styleSymbol] = [CSP.SELF];
    this[imgSymbol] = ['*'];
    this[mediaSymbol] = ['*'];
    this[frameSymbol] = ['*'];
    this[fontSymbol] = [
      CSP.SELF,
      '*.entrecode.de',
    ];
    this[connectSymbol] = [
      CSP.SELF,
      '*.entrecode.de',
    ];
  }

  get 'default-src'() {
    return this[defaultSymbol];
  }

  get 'script-src'() {
    return this[scriptSymbol];
  }

  set 'script-src'(newValue) {
    if (!Array.isArray(newValue)) {
      throw new Error('could not set CSP property, expected Array');
    }
    this[scriptSymbol] = newValue;
  }

  get 'object-src'() {
    return this[objectSymbol];
  }

  get 'style-src'() {
    return this[styleSymbol];
  }

  set 'style-src'(newValue) {
    if (!Array.isArray(newValue)) {
      throw new Error('could not set CSP property, expected Array');
    }
    this[styleSymbol] = newValue;
  }

  get 'img-src'() {
    return this[imgSymbol];
  }

  get 'media-src'() {
    return this[mediaSymbol];
  }

  get 'frame-src'() {
    return this[frameSymbol];
  }

  get 'font-src'() {
    return this[fontSymbol];
  }

  set 'font-src'(newValue) {
    if (!Array.isArray(newValue)) {
      throw new Error('could not set CSP property, expected Array');
    }
    this[fontSymbol] = newValue;
  }

  get 'connect-src'() {
    return this[connectSymbol];
  }

  middleware(req, res, next) {
    const contentSecurityPolicy = [
      'default-src',
      'script-src',
      'object-src',
      'style-src',
      'img-src',
      'media-src',
      'frame-src',
      'font-src',
      'connect-src',
    ]
    .map(key => `${key} ${this[key].join(' ')}`)
    .join('; ');
    res.header('Content-Security-Policy', contentSecurityPolicy);
    res.header('X-Content-Security-Policy', contentSecurityPolicy);
    res.header('X-WebKit-CSP', contentSecurityPolicy);
    next();
  }

}

module.exports = CSP;
