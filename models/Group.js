/**
 * Group Model
 * 
 * Represents a user-created hobby group/community.
 */
const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    image: { type: String }, // URL for group image
    isRestricted: { type: Boolean, default: false }, // Admin moderation flag
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', GroupSchema);
