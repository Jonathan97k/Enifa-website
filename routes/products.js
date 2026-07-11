const express = require('express');
const crypto = require('crypto');
const Product = require('../models/Product');
const { upload, uploadBufferToCloudinary } = require('../models/cloudinary');

const router = express.Router();

function newId() {
    return 'p-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
}
function parseJsonField(v, fallback) {
    if (v == null || v === '') return fallback;
    if (Array.isArray(v) || typeof v === 'object') return v;
    try { return JSON.parse(v); } catch { return fallback; }
}
async function uploadAll(files) {
    const urls = [];
    for (const f of files || []) {
        const result = await uploadBufferToCloudinary(f.buffer, 'enifa/products');
        urls.push(result.secure_url);
    }
    return urls;
}

// Public: anyone visiting the site can read products
router.get('/', async (_req, res) => {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    res.json(products);
});

// Everything below requires the owner to be logged in
router.post('/', upload.array('images', 10), async (req, res) => {
    try {
        const body = req.body || {};
        if (!body.name) return res.status(400).json({ error: 'Product name is required' });

        const newImgs = await uploadAll(req.files);
        const keepImgs = parseJsonField(body.existingImages, []);

        const product = await Product.create({
            id: newId(),
            name: String(body.name).trim(),
            categoryId: String(body.categoryId || '').trim(),
            description: String(body.description || '').trim(),
            price: String(body.price || '').trim(),
            images: [...keepImgs, ...newImgs],
            createdAt: new Date()
        });
        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', upload.array('images', 10), async (req, res) => {
    try {
        const current = await Product.findOne({ id: req.params.id });
        if (!current) return res.status(404).json({ error: 'Product not found' });

        const body = req.body || {};
        const newImgs = await uploadAll(req.files);
        const keepImgs = parseJsonField(body.existingImages, current.images);

        current.name = body.name != null ? String(body.name).trim() : current.name;
        current.categoryId = body.categoryId != null ? String(body.categoryId).trim() : current.categoryId;
        current.description = body.description != null ? String(body.description).trim() : current.description;
        current.price = body.price != null ? String(body.price).trim() : current.price;
        current.images = [...keepImgs, ...newImgs];
        await current.save();
        res.json(current);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const removed = await Product.findOneAndDelete({ id: req.params.id });
    if (!removed) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true, removed });
});

module.exports = router;
