/**
 * Contest Routes
 * 
 * Handles listing, creating, and deleting contests/events.
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Contest = require('../models/Contest');
const User = require('../models/User');

// @route   POST api/contests/register/:id
// @desc    Register for a contest
// @access  Private
router.post('/register/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const contest = await Contest.findById(req.params.id);

        if (!contest) {
            return res.status(404).json({ msg: 'Contest not found' });
        }

        // Check if already registered
        if (user.joinedContests.includes(req.params.id)) {
            return res.status(400).json({ msg: 'You have already registered for this contest' });
        }

        // Add to user's joinedContests
        user.joinedContests.push(req.params.id);
        await user.save();

        // Increment participants count
        contest.participants += 1;
        await contest.save();

        res.json(contest);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/contests
// @desc    Get all contests
// @access  Public (or Private if you prefer)
router.get('/', async (req, res) => {
    try {
        const contests = await Contest.find().sort({ createdAt: -1 });
        res.json(contests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/contests
// @desc    Create a contest
// @access  Private (Admin only)
router.post('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized. Admin access required.' });
        }

        const { title, description, details, rules, prize, deadline } = req.body;

        const newContest = new Contest({
            title,
            description,
            details,
            rules,
            prize,
            deadline
        });

        const contest = await newContest.save();
        res.json(contest);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/contests/:id
// @desc    Delete a contest
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized. Admin access required.' });
        }

        const contest = await Contest.findById(req.params.id);

        if (!contest) {
            return res.status(404).json({ msg: 'Contest not found' });
        }

        await contest.deleteOne();

        res.json({ msg: 'Contest removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Contest not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
