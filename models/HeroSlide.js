const mongoose = require('mongoose');

const HeroSlideSchema = new mongoose.Schema({
    id:       { type: String, required: true, unique: true },
    image:    { type: String, required: true },
    tagText:  { type: String, default: '' },   // small label, e.g. "Limited Offer"
    titleText:{ type: String, default: '' },   // bigger headline, e.g. "50% Off School Blazers"
    order:    { type: Number, default: 0 }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('HeroSlide', HeroSlideSchema);
