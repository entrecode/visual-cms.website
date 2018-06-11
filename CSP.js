// symbols for "private" properties of Shop class

const defaultSymbol = Symbol('default-src');
const scriptSymbol = Symbol('script-src');
const objectSymbol = Symbol('object-src');
const styleSymbol = Symbol('style-src');
const imgSymbol = Symbol('img-src');
const mediaSymbol = Symbol('media-src');
const childSymbol = Symbol('child-src');
const fontSymbol = Symbol('font-src');
const connectSymbol = Symbol('connect-src');
const manifestSymbol = Symbol('manifest-src');

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
    this[childSymbol] = [CSP.NONE];
    this[fontSymbol] = [
      CSP.SELF,
      '*.entrecode.de',
    ];
    this[connectSymbol] = [
      CSP.SELF,
      '*.entrecode.de',
    ];
    this[manifestSymbol] = [CSP.SELF];
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

  set 'img-src'(newValue) {
    if (!Array.isArray(newValue)) {
      throw new Error('could not set CSP property, expected Array');
    }
    this[imgSymbol] = newValue;
  }

  get 'media-src'() {
    return this[mediaSymbol];
  }

  get 'child-src'() {
    return this[childSymbol];
  }

  set 'child-src'(newValue) {
    if (!Array.isArray(newValue)) {
      throw new Error('could not set CSP property, expected Array');
    }
    this[childSymbol] = newValue;
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

  set 'connect-src'(newValue) {
    if (!Array.isArray(newValue)) {
      throw new Error('could not set CSP property, expected Array');
    }
    this[connectSymbol] = newValue;
  }

  get 'manifest-src'() {
    return this[manifestSymbol];
  }

  set 'manifest-src'(newValue) {
    if (!Array.isArray(newValue)) {
      throw new Error('could not set CSP property, expected Array');
    }
    this[manifestSymbol] = newValue;
  }

  middleware(req, res, next) {
    const contentSecurityPolicy = [
      'default-src',
      'script-src',
      'object-src',
      'style-src',
      'img-src',
      'media-src',
      'child-src',
      'font-src',
      'connect-src',
      'manifest-src',
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
