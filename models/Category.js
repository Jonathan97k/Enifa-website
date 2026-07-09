const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    id:          { type: String, required: true, unique: true },
    title:       { type: String, required: true, trim: true },
    icon:        { type: String, default: '🛍️' },
    description: { type: String, default: '' },
    images:      { type: [String], default: [] }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Category', CategorySchema);
