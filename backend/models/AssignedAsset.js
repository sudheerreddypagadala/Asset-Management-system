// models/AssignedAsset.js
const mongoose = require('mongoose');

const assignedAssetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  assetCode: String,
  assetName: String,
  assetModel: String,
  assignedBy: String,
  assignedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AssignedAsset', assignedAssetSchema);
