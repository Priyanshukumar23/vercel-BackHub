/**
 * Event Model
 * 
 * Represents a scheduled event within a specific group.
 * Contains details about timing, location, and the list of attendees.
 */
const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true }, // The group hosting this event
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users who have RSWPed
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', EventSchema);
