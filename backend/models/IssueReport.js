const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const issueReportSchema = new Schema({
  username: { type: String, required: true },
  assetCode: { type: String, required: true },
  message: { type: String, required: true },
  departmentid: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'HOD Approved', 'HOD Rejected', 'Approved', 'Rejected'], default: 'Pending' },
  rejectionComments: { type: String },
  timestamp: { type: Date, default: Date.now },
});
module.exports = mongoose.model('IssueReport', issueReportSchema);