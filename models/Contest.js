/**
 * Contest Model
 * 
 * Represents a timed event or competition users can register for.
 */
const mongoose = require('mongoose');

const ContestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    details: {
        type: String
    },
    rules: {
        type: [String]
    },
    prize: {
        type: String
    },
    deadline: {
        type: String
    },
    participants: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Contest', ContestSchema);
