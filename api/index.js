// Vercel serverless entry: forwards all /api/* requests to the Express app.
// Ensure backend is built first: cd backend && npm run build
const app = require('../backend/dist/server').default;
module.exports = app;
