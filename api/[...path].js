// Catch-all: handles /api/auth, /api/auth/login etc. so Express gets the full path.
const app = require('../backend/dist/server').default;

function handler(req, res) {
  const raw = req.url || '';
  const q = raw.indexOf('?');
  const pathOnly = q >= 0 ? raw.slice(0, q) : raw;
  const search = q >= 0 ? raw.slice(q) : '';
  const params = new URLSearchParams(search);
  params.delete('path');
  const query = params.toString() ? '?' + params.toString() : '';
  if (pathOnly.startsWith('/api/')) {
    req.url = pathOnly + query;
  } else {
    const path = req.query.path;
    const segments = Array.isArray(path) ? path : path ? [path] : [];
    req.url = segments.length ? '/api/' + segments.join('/') + query : '/api' + query;
  }
  return app(req, res);
}

module.exports = handler;
