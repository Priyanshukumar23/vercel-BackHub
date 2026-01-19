const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional if reporting a post anonymously/generically, but usually linked
    reportedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, // Optional if reporting a user directly
    reason: { type: String, required: true }, // e.g., 'sexual content', 'abusive'
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema);
