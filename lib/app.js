require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { connectDB } = require('../models/db');

const authRoutes = require('../routes/auth');
const categoryRoutes = require('../routes/categories');
const productRoutes = require('../routes/products');
const settingsRoutes = require('../routes/settings');
const setupRoutes = require('./setup');

const ROOT_DIR = path.join(__dirname, '..');
const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Make sure the database is connected before handling any /api request.
// Cheap no-op once connected; this is what makes serverless cold starts safe.
app.use('/api', async (_req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({ error: 'Database unavailable: ' + err.message });
    }
});

// ---------- API ----------
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/setup', setupRoutes);

// Combined read for the public site (one request instead of three)
app.get('/api/data', async (_req, res) => {
    const Category = require('../models/Category');
    const Product = require('../models/Product');
    const Settings = require('../models/Settings');
    const [categories, products, settings] = await Promise.all([
        Category.find().sort({ createdAt: 1 }).lean(),
        Product.find().sort({ createdAt: -1 }).lean(),
        Settings.findById('site').lean()
    ]);
    res.json({ categories, products, settings: settings || {} });
});

// ---------- Static files (only used when NOT on Vercel — see README-DEPLOY.md) ----------
if (!process.env.VERCEL) {
    app.use('/images', express.static(path.join(ROOT_DIR, 'images'), { maxAge: '7d' }));
    app.use('/admin', express.static(path.join(ROOT_DIR, 'admin')));
    app.use(express.static(ROOT_DIR));
    app.get('/admin', (_req, res) => res.sendFile(path.join(ROOT_DIR, 'admin', 'index.html')));
}

// ---------- Error handler ----------
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

module.exports = app;
