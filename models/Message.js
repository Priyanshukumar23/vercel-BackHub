/**
 * Message Model
 * 
 * Represents a chat message within a group.
 * Can be of type text, image, or poll.
 */
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'image', 'poll'],
        default: 'text'
    },
    content: {
        type: String,  // Used for text message or image URL
        default: ''
    },
    originalContent: { // Stores original content if restricted
        type: String,
        default: ''
    },
    isRestricted: {
        type: Boolean,
        default: false
    },
    // Fields specific to 'poll' type messages
    pollQuestion: {
        type: String
    },
    pollOptions: [{
        text: String,
        votes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', messageSchema);
