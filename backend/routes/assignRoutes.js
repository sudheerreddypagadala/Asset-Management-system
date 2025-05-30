const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AssignedAsset = require('../models/AssignedAsset'); // Your Mongoose model
const User = require('../models/User');
const Asset = require('../models/Assets');

router.post('/assign-asset', auth, async (req, res) => {
  try {
    const { userId, assetId, assetCode, assetName, assetModel, assignedBy } = req.body;

    // Validate required fields
    if (!userId || !assetId || !assetCode || !assetName || !assetModel) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Update user's assignedAsset info
    await User.findByIdAndUpdate(userId, {
      assignedAsset: assetCode,
      assetName,
      assetModel,
    });

    // Create assignment record (optional: if you want to track assignments separately)
    const assignment = new AssignedAsset({
      userId,
      assetId,
      assetCode,
      assetName,
      assetModel,
      assignedBy: assignedBy || 'admin',
      assignedAt: new Date()
    });

    await assignment.save();

    res.status(200).json({ message: 'Asset assigned successfully' });
  } catch (err) {
    console.error('Assign asset backend error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
});

module.exports = router;
