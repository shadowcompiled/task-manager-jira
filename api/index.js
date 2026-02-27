// Vercel serverless entry: forwards all /api/* requests to the Express app.
// Ensure backend is built first: cd backend && npm run build
const app = require('../backend/dist/server').default;

// Rewrites send /api/foo/bar as /api?path=foo/bar so we restore the path for Express.
function handler(req, res) {
  const raw = req.url || '';
  const q = raw.indexOf('?');
  const pathOnly = q >= 0 ? raw.slice(0, q) : raw;
  const search = q >= 0 ? raw.slice(q) : '';
  const params = new URLSearchParams(search);
  const pathParam = params.get('path');
  if (pathParam != null && pathParam !== '') {
    params.delete('path');
    const rest = params.toString();
    req.url = '/api/' + decodeURIComponent(pathParam).replace(/^\/+/, '') + (rest ? '?' + rest : '');
  } else if (!pathOnly.startsWith('/api')) {
    req.url = '/api' + (pathOnly.startsWith('/') ? pathOnly : '/' + pathOnly) + search;
  }
  return app(req, res);
}

module.exports = handler;
