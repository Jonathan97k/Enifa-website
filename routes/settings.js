const express = require('express');
const Settings = require('../models/Settings');

const router = express.Router();

async function getOrCreate() {
    let doc = await Settings.findById('site');
    if (!doc) doc = await Settings.create({ _id: 'site' });
    return doc;
}

router.get('/', async (_req, res) => {
    const doc = await getOrCreate();
    res.json(doc);
});

router.put('/', async (req, res) => {
    const doc = await getOrCreate();
    const body = req.body || {};
    doc.businessName = String(body.businessName ?? doc.businessName ?? '').trim();
    doc.tagline = String(body.tagline ?? doc.tagline ?? '').trim();
    doc.whatsappNumber = String(body.whatsappNumber ?? doc.whatsappNumber ?? '').replace(/[^0-9]/g, '');
    doc.phones = Array.isArray(body.phones) ? body.phones.map(String) : (doc.phones || []);
    doc.email = String(body.email ?? doc.email ?? '').trim();
    doc.location = String(body.location ?? doc.location ?? '').trim();
    doc.hours = String(body.hours ?? doc.hours ?? '').trim();
    doc.heroHeadline = String(body.heroHeadline ?? doc.heroHeadline ?? '').trim();
    doc.heroSubheadline = String(body.heroSubheadline ?? doc.heroSubheadline ?? '').trim();
    doc.aboutText = String(body.aboutText ?? doc.aboutText ?? '').trim();
    await doc.save();
    res.json(doc);
});

module.exports = router;
