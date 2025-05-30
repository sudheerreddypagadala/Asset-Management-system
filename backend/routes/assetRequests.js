const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.js');
const Request = require('../models/Notification.js'); // Assuming this is a typo, should be Request.js
const Notification = require('../models/Notification.js');
const User = require('../models/User.js');
const Asset = require('../models/Assets.js');

const { approveAssetRequest } = require('../controllers/assetRequestController.js');

// PUT /api/asset-requests/:requestId/approve
// PUT /api/asset-requests/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, rejectionComments } = req.body;
    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      {
        status,
        ...(rejectionComments && { rejectionComments })
      },
      { new: true }
    );
    if (!updatedRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }
    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Request status update error:', error);
    res.status(500).json({ message: 'Request status update failed', error: error.message });
  }
});

// routes/requestRoutes.js
// server/routes/assetRequests.js or wherever routes are defined
router.post('/approve-request/:id', async (req, res) => {
  const requestId = req.params.id;
  // your logic here
});




router.post('/asset-requests', auth, async (req, res) => {
  try {
    const { username, assetCode, departmentid } = req.body;
    if (req.user.userType !== 'user' || req.user.departmentid !== departmentid) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const asset = await Asset.findOne({ assetCode, departmentid, status: 'Available' });
    if (!asset) {
      return res.status(400).json({ message: 'Asset not available' });
    }
    const request = await Request.create({
      userId: req.user._id,
      username,
      assetCode,
      departmentid,
      status: 'Pending',
    });

    // Notify HOD
    const hods = await User.find({ userType: 'hod', departmentid });
    for (const hod of hods) {
      await Notification.create({
        userId: hod._id,
        message: `New asset request from ${username} for asset ${assetCode}.`,
        fromUser: username,
        departmentid,
      });
    }

    // Notify admin
    const admins = await User.find({ userType: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        message: `New asset request from ${username} for asset ${assetCode} in department ${departmentid}.`,
        fromUser: username,
        departmentid,
      });
    }

    res.status(201).json(request);
  } catch (err) {
    console.error('Asset request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;