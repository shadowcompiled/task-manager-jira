// Vercel serverless entry: forwards all /api/* requests to the Express app.
// Ensure backend is built first: cd backend && npm run build
const app = require('../backend/dist/server').default;

// Ensure Express sees the full path (e.g. /api/tasks). Some rewrites invoke this function
// with path /api; the incoming request path is preserved in req.url by Vercel, but we
// normalize so Express routes always match.
function handler(req, res) {
  const u = req.url || '';
  if (u.length > 0 && !u.startsWith('/api')) {
    req.url = '/api' + (u.startsWith('/') ? u : '/' + u);
  }
  return app(req, res);
}

module.exports = handler;
