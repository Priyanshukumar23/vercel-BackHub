/**
 * Message Routes
 * 
 * Retrieves chat history for groups.
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');

// @route   GET api/messages/:groupId
// @desc    Get chat messages for a specific group
// @access  Private
router.get('/:groupId', auth, async (req, res) => {
    try {
        const messages = await Message.find({ group: req.params.groupId })
            .populate('sender', ['username', 'profilePicture']) // Populate sender's username & pic
            .sort({ createdAt: 1 }); // Sort by oldest to newest
        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
