/**
 * Group Routes
 * 
 * Manages group CRUD operations, membership (join/leave), and admin actions.
 */
const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const auth = require('../middleware/auth');

const multer = require('multer');
const path = require('path');

// Set up storage engine
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, 'group-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 50000000 }, // 50MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('image');

// Check File Type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// @route   GET api/groups
// @desc    Get all groups
// @access  Public
router.get('/', async (req, res) => {
    try {
        const groups = await Group.find().populate('createdBy', 'username');
        res.json(groups);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/groups/:id
// @desc    Get single group by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const group = await Group.findById(req.params.id).populate('createdBy', 'username').populate('members', ['username', 'profilePicture']);
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        res.json(group);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'Group not found' });
        res.status(500).send('Server Error');
    }
});

// @route   POST api/groups
// @desc    Create a new group
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, category, image } = req.body;
        const newGroup = new Group({
            name,
            description,
            category,
            image, // Expecting URL string
            createdBy: req.user.id,
            members: [req.user.id]
        });

        const group = await newGroup.save();

        // Add to user's joinedGroups
        const User = require('../models/User');
        await User.findByIdAndUpdate(req.user.id, { $addToSet: { joinedGroups: group._id } });

        res.json(group);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/groups/:id/join
// @desc    Join a group
// @access  Private
router.post('/:id/join', auth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ msg: 'Group not found' });

        // Check if already member
        if (group.members.some(member => member.toString() === req.user.id)) {
            return res.status(400).json({ msg: 'Already a member' });
        }

        // Check if group is restricted
        if (group.isRestricted) {
            return res.status(403).json({ msg: 'Group is restricted by admin. Cannot join.' });
        }

        group.members.push(req.user.id);
        await group.save();

        // Add group to user's joinedGroups
        const User = require('../models/User');
        await User.findByIdAndUpdate(req.user.id, { $addToSet: { joinedGroups: group._id } });

        res.json(group);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/groups/:id/leave
// @desc    Leave a group
// @access  Private
router.post('/:id/leave', auth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ msg: 'Group not found' });

        // Check if member
        if (!group.members.includes(req.user.id)) {
            return res.status(400).json({ msg: 'Not a member of this group' });
        }

        // Remove from group members
        group.members = group.members.filter(memberId => memberId.toString() !== req.user.id);
        await group.save();

        // Remove group from user's joinedGroups
        const User = require('../models/User');
        await User.findByIdAndUpdate(req.user.id, { $pull: { joinedGroups: group._id } });

        res.json({ msg: 'Left group successfully', group });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Admin: Delete Group
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await require('../models/User').findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }

        await Group.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Group removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Admin: Restrict Group
router.put('/:id/restrict', auth, async (req, res) => {
    try {
        const user = await require('../models/User').findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }

        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ msg: 'Group not found' });

        group.isRestricted = !group.isRestricted; // Toggle
        await group.save();
        res.json(group);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;
