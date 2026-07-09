/**
 * Use this entry point on always-on hosts: Render, Railway, Fly.io, a VPS, etc.
 * Command: npm start
 *
 * If you're deploying to Vercel instead, Vercel uses api/index.js automatically —
 * you do not run this file there.
 */
const app = require('./lib/app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n  Uniform Solution — server running`);
    console.log(`  Website : http://localhost:${PORT}`);
    console.log(`  Admin   : http://localhost:${PORT}/admin\n`);
});
