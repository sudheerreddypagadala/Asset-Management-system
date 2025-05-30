const Asset = require('../models/Asset');
const AssetRequest = require('../models/Request');
const Notification = require('../models/Notification');

// controllers/requestController.js
const approveAssetRequest = async (req, res) => {
    try {
      const { requestId } = req.params;
  
      const request = await AssetRequest.findById(requestId);
      if (!request) return res.status(404).json({ message: 'Request not found' });
  
      if (request.status !== 'Pending') {
        return res.status(400).json({ message: 'Request already processed' });
      }
  
      const asset = await Asset.findOne({ assetCode: request.assetCode });
      if (!asset) return res.status(404).json({ message: 'Asset not found' });
  
      if (asset.status !== 'Available') {
        request.status = 'Rejected';
        await request.save();
  
        await Notification.create({
          username: request.username,
          message: `Your request for ${request.assetCode} was rejected because the asset is no longer available.`,
        });
  
        return res.status(400).json({ message: 'Asset not available. Request auto-rejected.' });
      }
  
      // Assign asset
      asset.status = 'Assigned';
      asset.assignedTo = request.username;
      await asset.save();
  
      // Mark request as approved
      request.status = 'Approved';
      await request.save();
  
      // Notify user
      await Notification.create({
        username: request.username,
        message: `Your request for ${asset.name} (${asset.assetCode}) was approved and assigned.`,
      });
  
      res.status(200).json({ message: 'Asset assigned and user notified.' });
  
    } catch (err) {
      console.error('Approve asset request error:', err);
      res.status(500).json({ message: 'Server error during approval' });
    }
  };
  
  module.exports = {
    approveAssetRequest
  };
  