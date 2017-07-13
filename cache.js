const NO_CACHE = 'no-cache';
const NO_STORE = 'no-store';
const PRIVATE = 'private';

function set(res, ttl, ...args) {
  args.push(`max-age=${ttl}`);
  res.set('Cache-Control', args.join(', '));
}

function middleware(ttl, ...args) {
  return (req, res, next) => {
    set(res, ttl, ...args);
    next();
  };
}

module.exports = {
  NO_CACHE,
  NO_STORE,
  PRIVATE,
  middleware,
  set,
};
