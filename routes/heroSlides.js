const express = require('express');
const crypto = require('crypto');
const HeroSlide = require('../models/HeroSlide');
const { upload, uploadBufferToCloudinary } = require('../models/cloudinary');

const router = express.Router();

function newId() {
    return 'hs-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
}

router.get('/', async (_req, res) => {
    const slides = await HeroSlide.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json(slides);
});

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const body = req.body || {};
        let imageUrl = body.existingImage || '';
        if (req.file) {
            const result = await uploadBufferToCloudinary(req.file.buffer, 'enifa/hero');
            imageUrl = result.secure_url;
        }
        if (!imageUrl) return res.status(400).json({ error: 'An image is required.' });

        const slide = await HeroSlide.create({
            id: newId(),
            image: imageUrl,
            tagText: String(body.tagText || '').trim(),
            titleText: String(body.titleText || '').trim(),
            order: Number(body.order) || 0
        });
        res.status(201).json(slide);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const slide = await HeroSlide.findOne({ id: req.params.id });
        if (!slide) return res.status(404).json({ error: 'Slide not found' });

        const body = req.body || {};
        if (req.file) {
            const result = await uploadBufferToCloudinary(req.file.buffer, 'enifa/hero');
            slide.image = result.secure_url;
        } else if (body.existingImage) {
            slide.image = body.existingImage;
        }
        if (body.tagText != null) slide.tagText = String(body.tagText).trim();
        if (body.titleText != null) slide.titleText = String(body.titleText).trim();
        if (body.order != null) slide.order = Number(body.order) || 0;
        await slide.save();
        res.json(slide);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const removed = await HeroSlide.findOneAndDelete({ id: req.params.id });
    if (!removed) return res.status(404).json({ error: 'Slide not found' });
    res.json({ ok: true });
});

module.exports = router;
