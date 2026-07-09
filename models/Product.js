const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    id:          { type: String, required: true, unique: true },
    name:        { type: String, required: true, trim: true },
    categoryId:  { type: String, default: '' },
    description: { type: String, default: '' },
    price:       { type: String, default: '' },
    images:      { type: [String], default: [] },
    createdAt:   { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('Product', ProductSchema);
