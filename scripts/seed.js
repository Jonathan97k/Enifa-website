/**
 * Run once: npm run seed
 * - Loads data/products.json into MongoDB (existing 8 categories, 53 products, settings)
 * - Creates the owner's admin login from ADMIN_USERNAME / ADMIN_PASSWORD in .env
 * Safe to re-run: it won't duplicate data or overwrite an existing admin account.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../models/db');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const AdminUser = require('../models/AdminUser');

async function main() {
    await connectDB();

    const dataPath = path.join(__dirname, '..', 'data', 'products.json');
    if (fs.existsSync(dataPath)) {
        const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const catCount = await Category.countDocuments();
        if (catCount === 0 && Array.isArray(raw.categories)) {
            await Category.insertMany(raw.categories);
            console.log(`  ✓ Imported ${raw.categories.length} categories`);
        } else {
            console.log('  (categories already in database, skipped)');
        }

        const prodCount = await Product.countDocuments();
        if (prodCount === 0 && Array.isArray(raw.products)) {
            await Product.insertMany(raw.products);
            console.log(`  ✓ Imported ${raw.products.length} products`);
        } else {
            console.log('  (products already in database, skipped)');
        }

        const settingsExists = await Settings.findById('site');
        if (!settingsExists && raw.settings) {
            await Settings.create({ _id: 'site', ...raw.settings });
            console.log('  ✓ Imported site settings');
        } else {
            console.log('  (settings already in database, skipped)');
        }
    } else {
        console.log('  (no data/products.json found — starting empty, that is fine)');
    }

    const username = (process.env.ADMIN_USERNAME || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    if (!username || !password) {
        console.log('  ⚠ ADMIN_USERNAME / ADMIN_PASSWORD not set in .env — skipping admin account creation.');
    } else {
        const existing = await AdminUser.findOne({ username });
        if (existing) {
            console.log(`  (admin user "${username}" already exists, skipped — change password from the admin panel instead)`);
        } else {
            const passwordHash = await bcrypt.hash(password, 12);
            await AdminUser.create({ username, passwordHash, displayName: 'Owner' });
            console.log(`  ✓ Created admin login for "${username}"`);
        }
    }

    console.log('\nDone. You can now log in at /admin with the username/password from your .env file.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
