const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('./middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer'); // Added for file uploads
const { parse } = require('csv-parse'); // Added for CSV parsing

const app = express();

app.use(express.json());
app.use(cors());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Temporary storage for uploaded files

// Define models
const assetSchema = new mongoose.Schema({
  name: String,
  type: String,
  brand: String,
  model: String,
  dateOfBuying: String,
  status: { type: String, enum: ['Available', 'Assigned', 'Under Maintenance'], default: 'Available' },
  assetCode: { type: String, unique: true },
  qrCode: String,
  assignedTo: {
    userId: { type: String, default: null },
    username: { type: String, default: null },
  },
  departmentid: String,
});
const Asset = mongoose.models.Asset || mongoose.model('Asset', assetSchema);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'hod', 'admin'], default: 'user' },
  departmentid: String,
  departmentname: String,
  assignedAsset: { type: String, default: null },
  assetName: { type: String, default: null },
  assetModel: { type: String, default: null },
  assetId: { type: String, default: null },
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const requestSchema = new mongoose.Schema({
  username: String,
  assetCode: String,
  userId: String,
  departmentid: String,
  status: { type: String, enum: ['Pending', 'HOD Approved', 'HOD Rejected', 'Admin Approved', 'Admin Rejected'], default: 'Pending' },
  rejectionComments: String,
  timestamp: { type: Date, default: Date.now },
});
const Request = mongoose.models.Request || mongoose.model('Request', requestSchema);

const issueReportSchema = new mongoose.Schema({
  username: String,
  assetCode: String,
  userId: String,
  departmentid: String,
  message: String,
  status: { type: String, enum: ['Pending', 'HOD Approved', 'Approved', 'Rejected', 'Under Maintenance'], default: 'Pending' },
  rejectionComments: String,
  timestamp: { type: Date, default: Date.now },
});
const IssueReport = mongoose.models.IssueReport || mongoose.model('IssueReport', issueReportSchema);

const notificationSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// Public endpoints
// app.get('/api/assets', async (req, res) => {
//   try {
//     const { status, assetCode, departmentid } = req.query;
//     const query = {};
//     if (status) query.status = status;
//     if (assetCode) query.assetCode = assetCode;
//     if (departmentid) query.departmentid = departmentid;
//     const assets = await Asset.find(query);
//     res.json(assets);
//   } catch (e) {
//     console.error('Assets fetch error:', e);
//     res.status(500).json({ error: e.message });
//   }
// });

app.get('/api/assets', async (req, res) => {
  try {
    const { status, assetCode, departmentid, role, username } = req.query;
    const query = {};

    // Apply filters based on query parameters
    if (status) query.status = status;
    if (assetCode) query.assetCode = assetCode;
    if (departmentid) query.departmentid = departmentid;

    // For HOD role, filter by assignedTo.username if username is provided
    if (role === 'hod' && username) {
      query['assignedTo.username'] = username;
    }
    

    const assets = await Asset.find(query);
    res.json(assets);
  } catch (e) {
    console.error('Assets fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

// app.get('/api/assets', async (req, res) => {
//   try {
//     const { status, assetCode, departmentid, role, username } = req.query;
//     const query = {};

//     if (status) query.status = status;
//     if (assetCode) query.assetCode = assetCode;
//     if (departmentid) query.departmentid = departmentid;
//     if (role === 'hod' && username) {
//       query['assignedTo.username'] = username;
//     }

//     const assets = await Asset.find(query);
//     res.json(assets);
//   } catch (e) {
//     console.error('Assets fetch error:', e);
//     res.status(500).json({ error: e.message });
//   }
// });

// Assign asset to user (update assignedTo.username)
app.patch('/api/assets/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ msg: 'userId is required' });
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ msg: 'Invalid userId' });

    const [asset, user] = await Promise.all([
      Asset.findById(id),
      User.findById(userId)
    ]);

    if (!asset) return res.status(404).json({ msg: 'Asset not found' });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    asset.assignedTo = {
      userId: user._id,
      username: user.username,
    };
    asset.status = 'Assigned';

    await asset.save();

    res.json({ msg: 'Asset assigned successfully', asset });
  } catch (e) {
    console.error('Assign asset error:', e);
    res.status(500).json({ error: e.message });
  }
});


// Unassign asset (clear assignedTo)
app.patch('/api/assets/:id/unassign', async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);
    if (!asset) return res.status(404).json({ msg: 'Asset not found' });

    asset.assignedTo.userId = null;
    asset.assignedTo.username = null;
    asset.status = 'Available';
    await asset.save();

    res.json({ msg: 'Asset unassigned successfully' });
  } catch (e) {
    console.error('Unassign asset error:', e);
    res.status(500).json({ error: e.message });
  }
});


app.get('/api/assets/:assetCode', async (req, res) => {
  try {
    const asset = await Asset.findOne({ assetCode: req.params.assetCode });
    if (!asset) return res.status(404).json({ msg: 'Asset not found' });
    res.json(asset);
  } catch (e) {
    console.error('Asset fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/all-users', async (req, res) => {
  try {
    const { departmentid } = req.query;
    const query = departmentid ? { departmentid } : {};
    const users = await User.find(query).select('-password');
    res.json({ hods: users.filter((u) => u.role === 'hod'), users: users.filter((u) => u.role === 'user') });
  } catch (e) {
    console.error('Users fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Auth-protected endpoints
app.use('/api/login', authRoutes);
app.use('/api/register', authMiddleware, authRoutes);
app.use('/api/users-by-department', authMiddleware, authRoutes);

// Asset management endpoints
app.post('/api/assets', authMiddleware, async (req, res) => {
  const { name, type, brand, model, dateOfBuying, status, departmentid } = req.body;
  const assetCode = `ASSET-${Date.now()}`;
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
    const qrCodeImage = await QRCode.toBuffer(`Asset:${name},Code:${assetCode}`);
    const qrDir = path.join(__dirname, 'public', 'qrcodes');
    const qrPath = path.join(qrDir, `${assetCode}.png`);
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });
    fs.writeFileSync(qrPath, qrCodeImage);
    const asset = new Asset({ name, type, brand, model, dateOfBuying, status, assetCode, qrCode: `/qrcodes/${assetCode}.png`, departmentid });
    const savedAsset = await asset.save();
    res.status(201).json({ message: 'Asset added', asset: savedAsset });
  } catch (e) {
    console.error('Add asset error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/assets/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!asset) return res.status(404).json({ msg: 'Asset not found' });
    res.json({ msg: 'Asset updated', asset });
  } catch (e) {
    console.error('Update asset error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/assets/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ msg: 'Asset not found' });
    if (asset.status === 'Assigned') return res.status(400).json({ msg: 'Cannot delete an assigned asset' });
    await Asset.findByIdAndDelete(req.params.id);
    const qrPath = path.join(__dirname, 'public', asset.qrCode);
    if (fs.existsSync(qrPath)) fs.unlinkSync(qrPath);
    res.json({ msg: 'Asset deleted successfully' });
  } catch (e) {
    console.error('Delete asset error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user-assets', authMiddleware, async (req, res) => {
  try {
    // Fetch assets where the user is assigned
    const assets = await Asset.find({ 'assignedTo.userId': req.user.id });

    if (!assets || assets.length === 0) {
      return res.status(404).json({ msg: 'No assets found for this user' });
    }

    // Map assets to include only necessary fields
    const response = assets.map(asset => ({
      _id: asset._id,
      name: asset.name,
      assetCode: asset.assetCode,
      model: asset.model,
      status: asset.status,
      qrCode: asset.qrCode,
    }));

    res.json(response);
  } catch (e) {
    console.error('User assets fetch error:', e);
    res.status(500).json({ msg: 'Server error', error: e.message });
  }
});
app.get('/api/assigned-asset', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (!user.assignedAsset) return res.status(200).json({ assignedAsset: null });
    const asset = await Asset.findOne({ assetCode: user.assignedAsset });
    if (!asset) return res.status(404).json({ msg: 'Assigned asset not found' });
    res.json({
      assetCode: user.assignedAsset,
      assetName: user.assetName,
      assetModel: user.assetModel,
      assetId: user.assetId,
    });
  } catch (e) {
    console.error('Assigned asset fetch error:', e);
    res.status(500).json({ msg: 'Server error', error: e.message });
  }
});

// Notification endpoints
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    // No username filter, fetch all notifications
    const notifications = await Notification.find({}).sort({ timestamp: -1 });
    res.json(notifications);
  } catch (e) {
    console.error('Notifications fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const { username, message } = req.body;
    const notification = new Notification({ username, message });
    await notification.save();
    res.status(201).json({ msg: 'Notification created', notification });
  } catch (e) {
    console.error('Notification creation error:', e);
    res.status(500).json({ error: e.message });
  }
});

// User management endpoints
app.post('/api/add-user', authMiddleware, async (req, res) => {
  const { email, username, password, role, departmentid, departmentname } = req.body;

  if (!req.user) {
    return res.status(401).json({ msg: 'Unauthorized: no user info' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Unauthorized' });
  }

  try {
    if (!email || !username || !password || !role) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ msg: 'Username already exists' });
    }

    // Optional: Check if email exists too
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ msg: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ email, username, password: hashedPassword, role, departmentid, departmentname });
    await user.save();

    res.status(201).json({
      msg: 'User added',
      user: { email, username, role, departmentid, departmentname }
    });
  } catch (e) {
    console.error('Add user error:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});


app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (user.role === 'admin' && req.user.id !== user._id.toString()) {
      return res.status(403).json({ msg: 'Cannot delete another admin' });
    }
    if (user.assignedAsset) {
      const asset = await Asset.findOne({ assetCode: user.assignedAsset });
      if (asset) {
        asset.status = 'Available';
        asset.assignedTo = null;
        await asset.save();
      }
    }
    await Request.deleteMany({ userId: user._id });
    await Notification.deleteMany({ username: user.username });
    await IssueReport.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'User deleted successfully' });
  } catch (e) {
    console.error('Delete user error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/assign-user-asset', async (req, res) => {
  const { userId, assetId, username } = req.body;
  try {
    const asset = await Asset.findById(assetId);
    asset.status = 'Assigned';
    asset.assignedTo = {
      userId,
      username,
    };
    await asset.save();
    res.json({ msg: 'Asset assigned successfully', asset, userId});
  } catch (e) {
    console.error('Assign user asset error:', e);
    res.status(500).json({ msg: 'Server error', error: e.message });
  }
});

app.patch('/api/maintain-asset', async (req, res) => {
  const { assetId } = req.body;
  try {
    console.log('Received body:', req.body);
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({ msg: 'Invalid asset ID' });
    }
    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ msg: 'Asset not found' });
    if (asset.status === 'Under Maintenance') {
      asset.status = 'Assigned';
      await asset.save();
      res.json({ msg: 'Asset changed from under maintenance', assetId });
    } else {
      res.status(400).json({ msg: `Asset is not under maintenance, current status: ${asset.status}` });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error', error: e.message });
  }
});

// Asset assignment endpoint
app.post('/api/assign-asset', async (req, res) => {
  const { userId, assetCode, assetName, assetModel, assetId, action } = req.body;
  try {
    // if (req.user.role !== 'admin' && req.user.role !== 'hod') return res.status(403).json({ msg: 'Unauthorized' });
    if (!userId) return res.status(400).json({ msg: 'userId is required' });
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ msg: 'Invalid userId format' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Ensure assignedAssets is initialized
    if (!Array.isArray(user.assignedAssets)) {
      user.assignedAssets = [];
    }

    if (action === 'remove' && assetId) {
      // Remove specific asset from assignedAssets
      const assetIndex = user.assignedAssets.findIndex((a) => a.assetId.toString() === assetId);
      if (assetIndex === -1) return res.status(400).json({ msg: 'Asset not assigned to user' });

      const asset = await Asset.findById(assetId);
      if (!asset) return res.status(404).json({ msg: 'Asset not found' });

      // user.assignedAssets.splice(assetIndex, 1);
      asset.status = 'Available';
      asset.assignedTo = null;
      await Promise.all([user.save(), asset.save()]);

      return res.json({ msg: 'Asset unassigned successfully', user });
    }

    if (action === 'add') {
      if (!assetCode || !assetId) return res.status(400).json({ msg: 'assetCode and assetId are required for assignment' });
      if (!mongoose.Types.ObjectId.isValid(assetId)) return res.status(400).json({ msg: 'Invalid assetId format' });

      const asset = await Asset.findOne({ _id: assetId, assetCode });
      if (!asset) return res.status(404).json({ msg: 'Asset not found' });
      if (asset.status !== 'Available') return res.status(400).json({ msg: 'Asset not available' });

      // Check for duplicate assignment
      if (user.assignedAssets.some((a) => a.assetId.toString() === assetId)) {
        return res.status(400).json({ msg: 'Asset already assigned to user' });
      }

      // Add new asset to assignedAssets
      user.assignedAssets.push({
        assetId,
        assetCode,
        assetName: assetName || asset.name,
        assetModel: assetModel || asset.model,
      });

      asset.status = 'Assigned';
      asset.assignedTo = { userId, username: user.username };
      await Promise.all([user.save(), asset.save()]);

      return res.json({ msg: 'Asset assigned successfully', user });
    }

    // Backward compatibility for unassignment (if action is not specified and assetCode/assetId are null)
    if (assetCode === null && assetId === null) {
      if (user.assignedAssets.length > 0) {
        const assetIds = user.assignedAssets.map((a) => a.assetId);
        const assets = await Asset.find({ _id: { $in: assetIds } });
        for (const asset of assets) {
          asset.status = 'Available';
          asset.assignedTo = null;
          await asset.save();
        }
        user.assignedAssets = [];
        await user.save();
      }
      return res.json({ msg: 'All assets unassigned successfully', user });
    }

    return res.status(400).json({ msg: 'Invalid action or payload' });
  } catch (e) {
    console.error('Assign asset error:', e);
    res.status(500).json({ msg: 'Server error', error: e.message });
  }
});

// Bulk asset upload endpoint using multer and csv-parse
app.post('/api/bulk-upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ msg: 'No CSV file uploaded' });

    const filePath = req.file.path;
    const assets = [];
    const errors = [];
    let rowIndex = 0;

    // Parse CSV file
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
      .on('data', (row) => {
        rowIndex++;
        const { name, type, brand, model, dateOfBuying, status, departmentid } = row;

        // Validate required fields
        if (!name || !type || !brand || !model || !dateOfBuying || !departmentid) {
          errors.push({ row: rowIndex, msg: 'Missing required fields' });
          return;
        }

        // Validate status if provided
        if (status && !['Available', 'Assigned', 'Under Maintenance'].includes(status)) {
          errors.push({ row: rowIndex, msg: 'Invalid status value' });
          return;
        }

        assets.push({ name, type, brand, model, dateOfBuying, status, departmentid });
      })
      .on('end', async () => {
        try {
          if (assets.length === 0 && errors.length > 0) {
            fs.unlinkSync(filePath); // Clean up uploaded file
            return res.status(400).json({ msg: 'No valid assets found in CSV', errors });
          }

          const savedAssets = [];
          const qrDir = path.join(__dirname, 'public', 'qrcodes');
          if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

          for (const [index, assetData] of assets.entries()) {
            const { name, type, brand, model, dateOfBuying, status, departmentid } = assetData;
            const assetCode = `ASSET-${Date.now()}-${index}`;

            try {
              // Generate QR code
              const qrCodeImage = await QRCode.toBuffer(`Asset:${name},Code:${assetCode}`);
              const qrPath = path.join(qrDir, `${assetCode}.png`);
              fs.writeFileSync(qrPath, qrCodeImage);

              // Create and save asset
              const asset = new Asset({
                name,
                type,
                brand,
                model,
                dateOfBuying,
                status: status || 'Available',
                assetCode,
                qrCode: `/qrcodes/${assetCode}.png`,
                departmentid,
              });
              const savedAsset = await asset.save();
              savedAssets.push(savedAsset);
            } catch (e) {
              errors.push({ row: rowIndex - assets.length + index + 1, msg: e.message });
            }
          }

          fs.unlinkSync(filePath); // Clean up uploaded file

          if (savedAssets.length === 0 && errors.length > 0) {
            return res.status(400).json({ msg: 'No assets were saved', errors });
          }

          res.status(201).json({
            msg: `${savedAssets.length} assets added successfully`,
            savedAssets,
            errors: errors.length > 0 ? errors : undefined,
          });
        } catch (e) {
          fs.unlinkSync(filePath); // Clean up on error
          console.error('Bulk asset upload processing error:', e);
          res.status(500).json({ error: e.message });
        }
      })
      .on('error', (e) => {
        fs.unlinkSync(filePath); // Clean up on parse error
        console.error('CSV parse error:', e);
        res.status(400).json({ msg: 'Error parsing CSV file', error: e.message });
      });
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // Clean up on general error
    console.error('Bulk asset upload error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Asset request endpoints
app.post('/api/asset-requests', authMiddleware, async (req, res) => {
  const { username, assetCode, departmentid } = req.body;
  try {
    if (req.user.role !== 'user') return res.status(403).json({ msg: 'Unauthorized' });
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const request = new Request({ username, assetCode, userId: user._id, departmentid });
    await request.save();
    const notification = new Notification({ username, message: `Requested asset ${assetCode}` });
    await notification.save();
    res.status(201).json({ msg: 'Request sent', request });
  } catch (e) {
    console.error('Add request error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/asset-requests', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hod')
      return res.status(403).json({ msg: 'Unauthorized' });

    const { departmentid, status } = req.query;
    const query = {};

    if (departmentid) {
      query.departmentid = departmentid;
    } else if (req.user.role === 'hod') {
      if (req.user.departmentid) {
        query.departmentid = req.user.departmentid;
      }
    }

    if (status) {
      query.status = status;
    } else if (req.user.role === 'hod') {
      query.status = 'Pending';
    } else if (req.user.role === 'admin') {
      query.status = 'HOD Approved';
    }

    console.log('Final Asset Request Query:', query);
    const requests = await Request.find(query);
    res.json(requests);
  } catch (e) {
    console.error('Requests fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/asset-requests/:id', authMiddleware, async (req, res) => {
  const { status, rejectionComments } = req.body;
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hod') return res.status(403).json({ msg: 'Unauthorized' });
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found' });

    if (req.user.role === 'hod' && !['Pending'].includes(request.status)) {
      return res.status(400).json({ msg: 'HOD can only update Pending requests' });
    }
    if (req.user.role === 'admin' && !['HOD Approved'].includes(request.status)) {
      return res.status(400).json({ msg: 'Admin can only update HOD Approved requests' });
    }

    request.status = status;
    if (status === 'HOD Rejected' || status === 'Admin Rejected') {
      request.rejectionComments = rejectionComments;
    }
    await request.save();

    let message = '';
    if (status === 'HOD Approved') {
      message = `Your asset request for ${request.assetCode} has been approved by HOD and forwarded to admin.`;
    } else if (status === 'HOD Rejected') {
      message = `Your asset request for ${request.assetCode} was rejected by HOD. Reason: ${rejectionComments}`;
    } else if (status === 'Admin Approved') {
      message = `Your asset request for ${request.assetCode} has been approved by admin.`;
    } else if (status === 'Admin Rejected') {
      message = `Your asset request for ${request.assetCode} was rejected by admin. Reason: ${rejectionComments}`;
    }

    if (message) {
      const notification = new Notification({ username: request.username, message });
      await notification.save();
    }

    res.json({ msg: `Request ${status.toLowerCase()} successfully`, request });
  } catch (e) {
    console.error('Update request error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/asset-requests/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
    const request = await Request.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found' });
    res.json({ msg: 'Request deleted successfully' });
  } catch (e) {
    console.error('Delete request error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Issue report endpoints
app.post('/api/report-issue', authMiddleware, async (req, res) => {
  const { username, assetCode, message, departmentid } = req.body;
  try {
    if (req.user.role !== 'user') return res.status(403).json({ msg: 'Unauthorized' });
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const asset = await Asset.findOne({ assetCode });
    if (!asset) return res.status(404).json({ msg: 'Asset not found' });
    const report = new IssueReport({ username, assetCode, userId: user._id, message, departmentid });
    await report.save();
    const notification = new Notification({ username, message: `Issue reported for asset ${assetCode}: ${message}` });
    await notification.save();
    res.status(201).json({ msg: 'Issue reported successfully', report });
  } catch (e) {
    console.error('Report issue error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/issue-reports', authMiddleware, async (req, res) => {
  try {
    const reports = await IssueReport.find();
    res.json(reports);
  } catch (err) {
    console.error('Issue reports fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// app.put('/api/issue-reports/:id', authMiddleware, async (req, res) => {
//   const { status, rejectionComments } = req.body;
//   try {
//     if (req.user.role !== 'admin' && req.user.role !== 'hod') return res.status(403).json({ msg: 'Unauthorized' });
//     const report = await IssueReport.findById(req.params.id);
//     console.log('report:', report);
//     if (!report) return res.status(404).json({ msg: 'Issue report not found' });

//     if (req.user.role === 'hod' && !['Pending'].includes(report.status)) {
//       return res.status(400).json({ msg: 'HOD can only update Pending reports' });
//     }
//     if (req.user.role === 'admin' && !['HOD Approved'].includes(report.status)) {
//       return res.status(400).json({ msg: 'Admin can only update HOD Approved reports' });
//     }

//     report.status = status;
//     if (status === 'Rejected') {
//       if (!rejectionComments) return res.status(400).json({ msg: 'Rejection comments required' });
//       report.rejectionComments = rejectionComments;
//     }
//     await report.save();

//     let message = '';
//     if (status === 'HOD Approved') {
//       message = `Your issue report for asset ${report.assetCode} has been approved by HOD and forwarded to admin.`;
//     } else if (status === 'Approved') {
//       message = `Your issue report for asset ${report.assetCode} has been approved by admin. The issue will be resolved soon.`;
//     } else if (status === 'Rejected') {
//       message = `Your issue report for asset ${report.assetCode} was rejected by ${req.user.role === 'admin' ? 'admin' : 'HOD'}. Reason: ${rejectionComments}`;
//     }

//     if (message) {
//       const notification = new Notification({ username: report.username, message });
//       await notification.save();
//     }

//     res.json({ msg: `Issue report ${status.toLowerCase()} successfully`, report });
//   } catch (e) {
//     console.error('Update issue report error:', e);
//     res.status(500).json({ error: e.message });
//   }
// });

app.put('/api/issue-reports/:id', authMiddleware, async (req, res) => {
  const { status, rejectionComments } = req.body;
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hod') {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid issue report ID' });
    }

    const report = await IssueReport.findById(req.params.id);
    const asset = await Asset.findOne({ assetCode: report.assetCode });
    console.log('report:', report);
    if (!report) {
      return res.status(404).json({ msg: 'Issue report not found' });
    }

    if (!asset) {
      return res.status(404).json({ msg: 'Asset not found for this issue report' });
    }

    if (req.user.role === 'hod' && !['Pending'].includes(report.status)) {
      return res.status(400).json({ msg: 'HOD can only update Pending reports' });
    }
    if (req.user.role === 'admin' && !['HOD Approved'].includes(report.status)) {
      return res.status(400).json({ msg: 'Admin can only update HOD Approved reports' });
    }

    report.status = status;
    if (status === 'Under Maintenance') {
  asset.status = 'Under Maintenance';
} else if (asset.assignedTo && asset.assignedTo.username !== null) {
  asset.status = 'Assigned';
} else {
  asset.status = 'Available';
}

    if (status === 'Rejected') {
      if (!rejectionComments) {
        return res.status(400).json({ msg: 'Rejection comments required' });
      }
      report.rejectionComments = rejectionComments;
    }
    await report.save();
    await asset.save();

    let message = '';
    if (status === 'HOD Approved') {
      message = `Your issue report for asset ${report.assetCode} has been approved by HOD and forwarded to admin.`;
    } else if (status === 'Approved') {
      message = `Your issue report for asset ${report.assetCode} has been approved by admin. The issue will be resolved soon.`;
    } else if (status === 'Rejected') {
      message = `Your issue report for asset ${report.assetCode} was rejected by ${req.user.role === 'admin' ? 'admin' : 'HOD'}. Reason: ${rejectionComments}`;
    }

    if (message) {
      const notification = new Notification({
        username: report.username,
        message,
        departmentid: report.departmentid, // Ensure departmentid is included
      });
      await notification.save();
    }

    res.json({ msg: `Issue report ${status.toLowerCase()} successfully`, report });
  } catch (e) {
    console.error('Update issue report error:', {
      error: e.message,
      stack: e.stack,
      reportId: req.params.id,
      user: req.user,
      body: req.body,
    });
    res.status(500).json({ error: e.message });
  }
});


// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/AMS', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Serve static files for QR codes
app.use(express.static('public'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));