const express = require('express');
const Category = require('../models/Category');
const { upload, uploadBufferToCloudinary } = require('../models/cloudinary');

const router = express.Router();

function slugify(s) {
    return String(s || '').toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
        || ('cat-' + Date.now().toString(36));
}
async function ensureUniqueId(base) {
    let candidate = base;
    let n = 2;
    while (await Category.exists({ id: candidate })) {
        candidate = `${base}-${n++}`;
    }
    return candidate;
}
function parseJsonField(v, fallback) {
    if (v == null || v === '') return fallback;
    if (Array.isArray(v) || typeof v === 'object') return v;
    try { return JSON.parse(v); } catch { return fallback; }
}
async function uploadAll(files) {
    const urls = [];
    for (const f of files || []) {
        const result = await uploadBufferToCloudinary(f.buffer, 'enifa/categories');
        urls.push(result.secure_url);
    }
    return urls;
}

// Public: anyone visiting the site can read categories
router.get('/', async (_req, res) => {
    const cats = await Category.find().sort({ createdAt: 1 }).lean();
    res.json(cats);
});

// Everything below requires the owner to be logged in
router.post('/', upload.array('images', 10), async (req, res) => {
    try {
        const body = req.body || {};
        if (!body.title) return res.status(400).json({ error: 'Title is required' });

        const newImgs = await uploadAll(req.files);
        const keepImgs = parseJsonField(body.existingImages, []);
        const id = await ensureUniqueId(slugify(body.id || body.title));

        const cat = await Category.create({
            id,
            title: String(body.title).trim(),
            icon: String(body.icon || '🛍️').trim(),
            description: String(body.description || '').trim(),
            images: [...keepImgs, ...newImgs]
        });
        res.status(201).json(cat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', upload.array('images', 10), async (req, res) => {
    try {
        const current = await Category.findOne({ id: req.params.id });
        if (!current) return res.status(404).json({ error: 'Category not found' });

        const body = req.body || {};
        const newImgs = await uploadAll(req.files);
        const keepImgs = parseJsonField(body.existingImages, current.images);

        current.title = body.title != null ? String(body.title).trim() : current.title;
        current.icon = body.icon != null ? String(body.icon).trim() : current.icon;
        current.description = body.description != null ? String(body.description).trim() : current.description;
        current.images = [...keepImgs, ...newImgs];
        await current.save();
        res.json(current);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const removed = await Category.findOneAndDelete({ id: req.params.id });
    if (!removed) return res.status(404).json({ error: 'Category not found' });
    res.json({ ok: true, removed });
});

module.exports = router;
