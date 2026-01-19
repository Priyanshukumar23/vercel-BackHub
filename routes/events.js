/**
 * Event Routes
 * 
 * Handles creating and listing events for specific groups.
 */
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// @route   GET api/events/group/:groupId
// @desc    Get events for a specific group
// @access  Public
router.get('/group/:groupId', async (req, res) => {
    try {
        const events = await Event.find({ group: req.params.groupId });
        res.json(events);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/events
// @desc    Create a new event
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, date, location, groupId } = req.body;

        // Check if group is restricted
        const group = await require('../models/Group').findById(groupId);
        if (group && group.isRestricted) {
            return res.status(403).json({ msg: 'Group is restricted. Cannot create events.' });
        }

        const newEvent = new Event({
            title,
            description,
            date,
            location,
            group: groupId
        });

        const event = await newEvent.save();
        res.json(event);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
