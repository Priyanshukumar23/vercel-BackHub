/**
 * Post Routes
 * 
 * Handles feed, creating posts, uploads, likes, and comments.
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const multer = require('multer');
const path = require('path');

// Set up storage engine
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 50000000 }, // 50MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).fields([{ name: 'image', maxCount: 1 }, { name: 'music', maxCount: 1 }]);

// Check File Type
function checkFileType(file, cb) {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif|mp3|mpeg|wav/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images and Music Only!');
    }
}

// @route   POST api/posts
// @desc    Create a post
// @access  Private
router.post('/', [auth, upload], async (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ msg: 'Image is required' });
        }

        const newPost = new Post({
            user: req.user.id,
            caption: req.body.caption,
            image: `/uploads/${req.files.image[0].filename}`,
            music: req.files.music ? `/uploads/${req.files.music[0].filename}` : null
        });

        const post = await newPost.save();
        res.json(post);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   GET api/posts
// @desc    Get all posts
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Fetch posts
        const posts = await Post.find().sort({ createdAt: -1 })
            .populate('user', ['username', 'profilePicture'])
            .populate('comments.user', ['username', 'profilePicture']);

        // Filter out hidden posts unless the requester is an admin
        // Note: For efficiency, we could filter in DB query, but we need to check admin role first.
        // Let's assume req.user is populated by middleware but 'role' might need fetch or is in token payload.
        // If auth middleware decoded token has role, use it. Otherwise, DB check.
        // Assuming token payload: { user: { id: '...', role: '...' } }
        // If auth middleware doesn't provide role, we fetch user.

        const User = require('../models/User');
        const user = await User.findById(req.user.id);

        if (user.role === 'admin') {
            res.json(posts); // Admin sees all
        } else {
            res.json(posts.filter(p => !p.isHidden)); // Users see only visible
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/posts/:id/hide
// @desc    Toggle hide status of a post (Admin only)
// @access  Private
router.put('/:id/hide', auth, async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        post.isHidden = !post.isHidden;
        await post.save();
        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/posts/like/:id
// @desc    Like a post
// @access  Private
router.put('/like/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        // Check if the post has already been liked
        if (post.likes.filter(like => like.toString() === req.user.id).length > 0) {
            // Un-like
            const removeIndex = post.likes.map(like => like.toString()).indexOf(req.user.id);
            post.likes.splice(removeIndex, 1);
        } else {
            post.likes.unshift(req.user.id);
            // Also remove from dislikes if present
            if (post.dislikes.filter(dislike => dislike.toString() === req.user.id).length > 0) {
                const removeIndex = post.dislikes.map(dislike => dislike.toString()).indexOf(req.user.id);
                post.dislikes.splice(removeIndex, 1);
            }
        }

        await post.save();

        // Return likes and dislikes count to update UI efficiently
        res.json({ likes: post.likes, dislikes: post.dislikes });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/posts/dislike/:id
// @desc    Dislike a post
// @access  Private
router.put('/dislike/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        // Check if the post has already been disliked
        if (post.dislikes.filter(dislike => dislike.toString() === req.user.id).length > 0) {
            // Un-dislike
            const removeIndex = post.dislikes.map(dislike => dislike.toString()).indexOf(req.user.id);
            post.dislikes.splice(removeIndex, 1);
        } else {
            post.dislikes.unshift(req.user.id);
            // Also remove from likes if present
            if (post.likes.filter(like => like.toString() === req.user.id).length > 0) {
                const removeIndex = post.likes.map(like => like.toString()).indexOf(req.user.id);
                post.likes.splice(removeIndex, 1);
            }
        }

        await post.save();
        res.json({ likes: post.likes, dislikes: post.dislikes });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/posts/comment/:id
// @desc    Comment on a post
// @access  Private
router.post('/comment/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        const newComment = {
            text: req.body.text,
            user: req.user.id
        };

        post.comments.unshift(newComment);

        await post.save();

        // Populate the user of the new comment to return it fully
        const updatedPost = await Post.findById(req.params.id).populate('comments.user', ['username', 'profilePicture']);

        res.json(updatedPost.comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Check user
        if (post.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await post.deleteOne();

        res.json({ msg: 'Post removed' });
    } catch (err) {
        console.error(err);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
