const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Report = require('../models/Report');
const User = require('../models/User');

// @route   POST api/reports
// @desc    Create a report
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { reportedUser, reportedPost, reason } = req.body;

        const newReport = new Report({
            reporter: req.user.id,
            reportedUser, // ID of user being reported
            reportedPost, // ID of post being reported (optional)
            reason
        });

        const report = await newReport.save();
        res.json(report);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/reports
// @desc    Get all reports (Admin only)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }

        const reports = await Report.find()
            .populate('reporter', ['username', 'email'])
            .populate('reportedUser', ['username', 'email'])
            .populate({
                path: 'reportedPost',
                populate: { path: 'user', select: 'username' } // Get owner of reported post
            })
            .sort({ createdAt: -1 });

        res.json(reports);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/reports/:id/resolve
// @desc    Mark report as resolved (Admin only)
// @access  Private
router.put('/:id/resolve', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }

        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ msg: 'Report not found' });

        report.status = 'resolved';
        await report.save();
        res.json(report);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
