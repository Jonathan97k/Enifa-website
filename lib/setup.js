const express = require('express');
const bcrypt = require('bcryptjs');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const AdminUser = require('../models/AdminUser');

const router = express.Router();

// Setup/import endpoint — safe to visit any time; it only ever creates
// data if it doesn't already exist (won't duplicate or overwrite anything).
// Visit: /api/setup
router.get('/', async (req, res) => {
    const report = [];
    try {
        const fs = require('fs');
        const path = require('path');
        const dataPath = path.join(__dirname, '..', 'data', 'products.json');

        if (fs.existsSync(dataPath)) {
            const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

            const catCount = await Category.countDocuments();
            if (catCount === 0 && Array.isArray(raw.categories)) {
                await Category.insertMany(raw.categories);
                report.push(`Imported ${raw.categories.length} categories`);
            } else {
                report.push(`Categories already present (${catCount}), skipped`);
            }

            const prodCount = await Product.countDocuments();
            if (prodCount === 0 && Array.isArray(raw.products)) {
                await Product.insertMany(raw.products);
                report.push(`Imported ${raw.products.length} products`);
            } else {
                report.push(`Products already present (${prodCount}), skipped`);
            }

            const settingsExists = await Settings.findById('site');
            if (!settingsExists && raw.settings) {
                await Settings.create({ _id: 'site', ...raw.settings });
                report.push('Imported site settings');
            } else {
                report.push('Settings already present, skipped');
            }
        } else {
            report.push('No data/products.json found on server, skipped product import');
        }

        const username = (process.env.ADMIN_USERNAME || '').trim().toLowerCase();
        const password = process.env.ADMIN_PASSWORD || '';
        if (!username || !password) {
            report.push('ADMIN_USERNAME/ADMIN_PASSWORD not set — cannot create admin login');
        } else {
            const existing = await AdminUser.findOne({ username });
            if (existing) {
                report.push(`Admin user "${username}" already exists, skipped`);
            } else {
                const passwordHash = await bcrypt.hash(password, 12);
                await AdminUser.create({ username, passwordHash, displayName: 'Owner' });
                report.push(`Created admin login for "${username}"`);
            }
        }

        res.json({ ok: true, report });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message, report });
    }
});

module.exports = router;
