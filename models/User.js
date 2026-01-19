/**
 * User Model
 * 
 * Represents a user in the system.
 * Stores authentication details, profile information, and references to joined groups/events.
 */
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, // Unique display name
    email: { type: String, required: true, unique: true },    // Unique email address
    password: { type: String, required: true },               // Hashed password
    interests: [{ type: String }],                            // List of user interests
    joinedGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }], // Groups the user is a member of
    joinedContests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contest' }], // Events/Contests the user has registered for
    role: { type: String, enum: ['user', 'admin'], default: 'user' }, // Authorization role
    profilePicture: { type: String, default: '' },            // URL/Path to profile image
    isChatBlocked: { type: Boolean, default: false },         // Moderation flag (true to block from global chat)
    isBlocked: { type: Boolean, default: false },             // General block (prevent login/access)
    createdAt: { type: Date, default: Date.now }              // Registration timestamp
});

module.exports = mongoose.model('User', UserSchema);
