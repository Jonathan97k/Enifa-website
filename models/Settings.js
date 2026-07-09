const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    _id:             { type: String, default: 'site' },
    businessName:    { type: String, default: '' },
    tagline:         { type: String, default: '' },
    whatsappNumber:  { type: String, default: '' },
    phones:          { type: [String], default: [] },
    email:           { type: String, default: '' },
    location:        { type: String, default: '' },
    hours:           { type: String, default: '' },
    heroHeadline:    { type: String, default: '' },
    heroSubheadline: { type: String, default: '' },
    aboutText:       { type: String, default: '' }
}, { versionKey: false });

module.exports = mongoose.model('Settings', SettingsSchema);
