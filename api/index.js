// Vercel turns this file into a serverless function at /api/*.
// vercel.json rewrites all /api/... requests here.
// Static files (images, admin panel, public pages) are served directly by
// Vercel's static hosting — this function only ever handles /api routes.
module.exports = require('../lib/app');
