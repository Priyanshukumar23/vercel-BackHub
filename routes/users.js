/**
 * User Management Routes
 * 
 * Admin routes for managing users (list, block, delete, update profile).
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

const multer = require('multer');
const path = require('path');

// Set up storage engine (Same as in posts.js)
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 50000000 }, // 50MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('profilePicture');

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

// @route   PUT api/users/profile
// @desc    Update user profile (username, picture)
// @access  Private
router.put('/profile', auth, async (req, res) => {
    // Wrap with multer upload to handle file
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ msg: 'File Upload Error: ' + err.message });
        } else if (err) {
            return res.status(400).json({ msg: err });
        }

        try {
            const { username } = req.body;
            const updates = {};

            if (username) updates.username = username;
            if (req.file) {
                updates.profilePicture = `/uploads/${req.file.filename}`;
            }

            // Check if username is taken (if being changed)
            if (username) {
                const existingUser = await User.findOne({ username });
                if (existingUser && existingUser._id.toString() !== req.user.id) {
                    return res.status(400).json({ msg: 'Username already taken' });
                }
            }

            const user = await User.findByIdAndUpdate(
                req.user.id,
                { $set: updates },
                { new: true }
            ).select('-password');

            res.json(user);
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Server Error');
        }
    });
});

// @route   GET api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized. Admin access required.' });
        }

        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/:id/block
// @desc    Block/Unblock user from global chat
// @access  Private (Admin only)
router.put('/:id/block', auth, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.id);
        if (adminUser.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.isChatBlocked = !user.isChatBlocked;
        await user.save();

        res.json({ msg: `User ${user.isChatBlocked ? 'blocked' : 'unblocked'} from chat`, isChatBlocked: user.isChatBlocked });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/:id/access-block
// @desc    Block/Unblock user access (Login block)
// @access  Private (Admin only)
router.put('/:id/access-block', auth, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.id);
        if (adminUser.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({ msg: `User ${user.isBlocked ? 'blocked' : 'unblocked'} from platform`, isBlocked: user.isBlocked });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/users/:id
// @desc    Delete a user
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const requestingUser = await User.findById(req.user.id);
        if (requestingUser.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized. Admin access required.' });
        }

        // Prevent admin from deleting themselves (optional but good practice)
        if (req.params.id === req.user.id) {
            return res.status(400).json({ msg: 'Cannot delete your own admin account.' });
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({ msg: 'User deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
