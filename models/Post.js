/**
 * Post Model
 * 
 * Represents a social feed post created by a user.
 * Supports images, captions, and interactions (likes/dislikes/comments).
 */
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    image: {
        type: String,
        required: true
    },
    caption: {
        type: String
    },
    music: {
        type: String // Optional path to music file
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    dislikes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    comments: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            text: {
                type: String,
                required: true
            },
            date: {
                type: Date,
                default: Date.now
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    },
    isHidden: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Post', PostSchema);
