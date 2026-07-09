const mongoose = require('mongoose');

const AdminUserSchema = new mongoose.Schema({
    username:     { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    displayName:  { type: String, default: '' }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('AdminUser', AdminUserSchema);
