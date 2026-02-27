// Vercel serverless entry: forwards all /api/* requests to the Express app.
// Ensure backend is built first: cd backend && npm run build
const app = require('../backend/dist/server').default;

// Restore path for Express: rewrites send /api/foo/bar as /api?path=foo/bar or path=foo&path=bar
function forward(req, res) {
  const raw = req.url || '';
  const q = raw.indexOf('?');
  const pathOnly = q >= 0 ? raw.slice(0, q) : raw;
  const search = q >= 0 ? raw.slice(q) : '';
  const params = new URLSearchParams(search);
  let pathSeg = params.get('path');
  if (pathSeg == null || pathSeg === '') {
    const allPath = params.getAll('path');
    pathSeg = allPath.length ? allPath.map(decodeURIComponent).join('/') : null;
  } else {
    pathSeg = decodeURIComponent(pathSeg);
  }
  // Fallback: if path not in query (e.g. POST), try headers Vercel or other runtimes may set
  if (pathSeg == null || pathSeg === '') {
    const h = req.headers;
    pathSeg = (h['x-invoke-path'] || h['x-vercel-url'] || h['x-original-url'] || h['x-forwarded-path'] || '')
      .replace(/^https?:\/\/[^/]+/, '')
      .replace(/^\/api\/?/, '')
      .trim() || null;
  }
  if (pathSeg != null && pathSeg !== '') {
    params.delete('path');
    const rest = params.toString();
    req.url = '/api/' + pathSeg.replace(/^\/+/, '') + (rest ? '?' + rest : '');
  } else if (!pathOnly.startsWith('/api')) {
    req.url = '/api' + (pathOnly.startsWith('/') ? pathOnly : '/' + pathOnly) + search;
  }
  return app(req, res);
}

// Single default handler (Node.js style) – supports all methods
module.exports = forward;
// Explicit method exports so Vercel routes POST/PUT/PATCH/DELETE to this function (avoids 405)
module.exports.get = forward;
module.exports.post = forward;
module.exports.put = forward;
module.exports.patch = forward;
module.exports.delete = forward;
