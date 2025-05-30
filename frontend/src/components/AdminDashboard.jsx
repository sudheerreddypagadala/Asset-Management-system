import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../css/Dashboard.css';
import logo from '../assets/logo.png';

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userType, departmentid, token, username } = location.state || { userType: 'unknown', departmentid: null, token: null, username: '' };
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState({ hods: [], users: [] });
  const [requests, setRequests] = useState([]);
  const [issueReports, setIssueReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [showAddAssetPopup, setShowAddAssetPopup] = useState(false);
  const [showAddUserPopup, setShowAddUserPopup] = useState(false);
  const [showAssignAssetPopup, setShowAssignAssetPopup] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [newAsset, setNewAsset] = useState({ name: '', type: '', brand: '', model: '', dateOfBuying: '', status: 'Available', departmentid: departmentid || '' });
  const [newUser, setNewUser] = useState({ email: '', username: '', password: '', role: 'user', departmentid: departmentid || '', departmentname: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [rejectionComments, setRejectionComments] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBulkUploadPopup, setShowBulkUploadPopup] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [sortOption, setSortOption] = useState('all');
  const [assetNames, setAssetNames] = useState([]);
  const fetchedUsername = sessionStorage.getItem('username') || username || 'Admin';
  const BASIC_URL = import.meta.env.VITE_REACT_APP_BASIC_URL;

  const normalizeAssetName = (name) => {
    if (!name) return '';
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith('es')) return lowerName.slice(0, -2);
    if (lowerName.endsWith('s')) return lowerName.slice(0, -1);
    return lowerName;
  };

  useEffect(() => {
    if (!token) {
      setError('No authentication token. Please log in again.');
      navigate('/login');
      return;
    }
    if (userType !== 'admin') {
      setError('Unauthorized access. Only admins can view this dashboard.');
      navigate('/login');
      return;
    }
    fetchAssets();
    fetchUsers();
    fetchRequests();
    fetchIssueReports();
    fetchNotifications();
  }, [userType, token, navigate]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASIC_URL}/api/assets`, {
        headers: { 'x-auth-token': token },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setAssets(Array.isArray(data) ? data : []);

      const nameMap = new Map();
      data.forEach((asset) => {
        if (asset.name) {
          const normalizedName = normalizeAssetName(asset.name);
          if (!nameMap.has(normalizedName)) {
            nameMap.set(normalizedName, asset.name);
          }
        }
      });
      const uniqueNames = [...nameMap.entries()]
        .map(([normalizedName, displayName]) => ({ normalizedName, displayName }))
        .sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
      setAssetNames(uniqueNames);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${BASIC_URL}/api/all-users`, {
      headers: { 'x-auth-token': token },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    // Fetch assigned assets for each user
    const usersWithAssets = await Promise.all(
      [...data.hods, ...data.users].map(async (user) => {
        const assetResponse = await fetch(`${BASIC_URL}/api/assets?userId=${user._id}`, {
          headers: { 'x-auth-token': token },
        });
        if (!assetResponse.ok) {
          console.error(`Failed to fetch assets for user ${user._id}`);
          return { ...user, assignedAssets: [] };
        }
        const assets = await assetResponse.json();
        return {
          ...user,
          assignedAssets: assets.map((asset) => ({
            assetId: asset._id,
            assetCode: asset.assetCode,
            assetName: asset.name,
            assetModel: asset.model,
          })),
        };
      })
    );

    setUsers({
      hods: usersWithAssets.filter((u) => u.role === 'hod'),
      users: usersWithAssets.filter((u) => u.role === 'user'),
    });
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASIC_URL}/api/asset-requests?status=HOD%20Approved`, {
        headers: { 'x-auth-token': token },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssueReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASIC_URL}/api/issue-reports`, {
        headers: { 'x-auth-token': token },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setIssueReports(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASIC_URL}/api/notifications`, {
        headers: { 'x-auth-token': token },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!newAsset.departmentid) {
      setError('Department ID is required');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BASIC_URL}/api/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(newAsset),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();
      alert(`Asset added successfully! QR Code: ${result.asset.qrCode}`);
      setNewAsset({ name: '', type: '', brand: '', model: '', dateOfBuying: '', status: 'Available', departmentid: departmentid || '' });
      setShowAddAssetPopup(false);
      fetchAssets();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.departmentid || !newUser.departmentname) {
      setError('Department ID and name are required');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BASIC_URL}/api/add-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(newUser),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
      }
      alert(`User added successfully! Credentials: Username: ${newUser.username}, Password: ${newUser.password}`);
      setNewUser({ email: '', username: '', password: '', role: 'user', departmentid: departmentid || '', departmentname: '' });
      setShowAddUserPopup(false);
      fetchUsers();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAsset = async (e) => {
    e.preventDefault();
    if (!selectedUser || !selectedAsset) {
      setError('Please select a user and an asset');
      return;
    }
    if (!selectedAsset._id) {
      setError('Invalid asset selected');
      return;
    }
    setLoading(true);
    try {
      const assignPayload = {
        userId: selectedUser._id,
        assetCode: selectedAsset.assetCode,
        assetName: selectedAsset.name,
        assetModel: selectedAsset.model,
        assetId: selectedAsset._id,
        action: 'add',
      };
      const assignResponse = await fetch(`${BASIC_URL}/api/assign-asset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(assignPayload),
      });
      if (!assignResponse.ok) {
        const assignError = await assignResponse.json();
        throw new Error(assignError.msg || `HTTP error! Status: ${assignResponse.status}`);
      }

      await Promise.all([
        fetch(`${BASIC_URL}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({
            username: selectedUser.username,
            message: `Asset ${selectedAsset.name} (${selectedAsset.assetCode}) has been assigned to you.`,
            departmentid: selectedUser.departmentid,
          }),
        }),
        fetch(`${BASIC_URL}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({
            username: selectedUser.username,
            message: `Asset ${selectedAsset.name} (${selectedAsset.assetCode}) has been assigned to ${selectedUser.username} by Admin.`,
            departmentid: selectedUser.departmentid,
          }),
        }),
      ]);

      alert('Asset assigned successfully!');
      setShowAssignAssetPopup(false);
      setSelectedUser(null);
      setSelectedAsset(null);
      fetchAssets();
      fetchUsers();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (user, assetId) => {
    if (!user.assignedAssets || !user.assignedAssets.find((asset) => asset.assetId.toString() === assetId)) {
      setError('No such asset assigned to remove');
      return;
    }
    setLoading(true);
    try {
      const asset = assets.find((a) => a._id === assetId);
      if (!asset) throw new Error('Asset not found');

      const removePayload = {
        userId: user._id,
        assetId: assetId,
        action: 'remove',
      };
      const removeResponse = await fetch(`${BASIC_URL}/api/assign-asset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(removePayload),
      });
      if (!removeResponse.ok) {
        const removeError = await removeResponse.json();
        throw new Error(removeError.msg || `HTTP error! Status: ${removeResponse.status}`);
      }

      await fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: user.username,
          message: `Asset ${asset.name} (${asset.assetCode}) has been unassigned from you.`,
          departmentid: user.departmentid,
        }),
      });

      alert('Asset assignment removed successfully!');
      fetchAssets();
      fetchUsers();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.username}?`)) return;
    setLoading(true);
    try {
      if (user.assignedAssets && user.assignedAssets.length > 0) {
        await Promise.all(
          user.assignedAssets.map((asset) => handleRemoveAssignment(user, asset.assetId))
        );
      }
      const response = await fetch(`${BASIC_URL}/api/users/${user._id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
      }
      alert('User deleted successfully!');
      fetchUsers();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsset = async (asset) => {
    if (!window.confirm(`Are you sure you want to delete asset ${asset.name} (${asset.assetCode})?`)) return;
    setLoading(true);
    try {
      if (asset.status === 'Assigned') {
        setError('Cannot delete an assigned asset. Please unassign it first.');
        return;
      }
      const response = await fetch(`${BASIC_URL}/api/assets/${asset._id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
      }
      await fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: 'hod',
          message: `Asset ${asset.name} (${asset.assetCode}) has been deleted by Admin.`,
          departmentid: asset.departmentid,
        }),
      });
      alert('Asset deleted successfully!');
      fetchAssets();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (request) => {
    setLoading(true);
    try {
      const user = [...users.hods, ...users.users].find((u) => u.username === request.username);
      if (!user) throw new Error('User not found');

      const asset = assets.find((a) => a.assetCode === request.assetCode);
      if (!asset) throw new Error('Asset not found');

      const assignPayload = {
        userId: user._id,
        username: user.username,
        assetCode: asset.assetCode,
        assetName: asset.name,
        assetModel: asset.model,
        assetId: asset._id,
        action: 'add',
      };

      const assigAsset = await fetch(`${BASIC_URL}/api/assign-user-asset`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(assignPayload),
      });
      if (!assigAsset.ok) {
        const assignError = await assigAsset.json();
        throw new Error(assignError.msg || `HTTP error! Status: ${assigAsset.status}`);
      }

      const requestResponse = await fetch(`${BASIC_URL}/api/asset-requests/${request._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ status: 'Admin Approved' }),
      });
      if (!requestResponse.ok) {
        const requestError = await requestResponse.json();
        throw new Error(requestError.msg || `HTTP error! Status: ${requestResponse.status}`);
      }

      await Promise.all([
        fetch(`${BASIC_URL}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({
            username: request.username,
            message: `Your request for asset ${request.assetCode} has been approved and assigned to you.`,
            departmentid: request.departmentid,
          }),
        }),
        fetch(`${BASIC_URL}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({
            username: 'hod',
            message: `Request for asset ${request.assetCode} by ${request.username} has been approved and assigned.`,
            departmentid: request.departmentid,
          }),
        }),
      ]);

      alert('Request approved and asset assigned!');
      fetchRequests();
      fetchAssets();
      fetchUsers();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (request) => {
    const comments = rejectionComments[request._id] || '';
    if (!comments) {
      setError('Please provide rejection comments');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BASIC_URL}/api/asset-requests/${request._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ status: 'Admin Rejected', rejectionComments: comments }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
      }

      await Promise.all([
        fetch(`${BASIC_URL}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({
            username: request.username,
            message: `Your request for asset ${request.assetCode} was rejected. Reason: ${comments}`,
            departmentid: request.departmentid,
          }),
        }),
        fetch(`${BASIC_URL}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({
            username: 'hod',
            message: `Request for asset ${request.assetCode} by ${request.username} was rejected. Reason: ${comments}`,
            departmentid: request.departmentid,
          }),
        }),
      ]);

      alert('Request rejected!');
      setRejectionComments((prev) => ({ ...prev, [request._id]: '' }));
      fetchRequests();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  
  // const handleApproveIssueReport = async (report) => {
  //   setLoading(true);
  //   try {
  //     const response = await fetch(`http://localhost:5000/api/issue-reports/${report._id}`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
  //       body: JSON.stringify({ status: 'Under Maintenance' }),
  //     });
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
  //     }

  //     await Promise.all([
  //       fetch('http://localhost:5000/api/notifications', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
  //         body: JSON.stringify({
  //           username: report.username,
  //           message: `Your issue report for asset ${report.assetCode} has been approved. It will be resolved soon.`,
  //           departmentid: report.departmentid,
  //         }),
  //       }),
  //       fetch('http://localhost:5000/api/notifications', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
  //         body: JSON.stringify({
  //           username: 'hod',
  //           message: `Issue report for asset ${report.assetCode} by ${report.username} has been approved.`,
  //           departmentid: report.departmentid,
  //         }),
  //       }),
  //     ]);

  //     alert('Issue report approved successfully!');
  //     fetchIssueReports();
  //     fetchNotifications();
  //   } catch (error) {
  //     setError(error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleRejectIssueReport = async (report) => {
  //   const comments = rejectionComments[report._id] || '';
  //   if (!comments) {
  //     setError('Please provide rejection comments');
  //     return;
  //   }
  //   setLoading(true);
  //   try {
  //     const response = await fetch(`http://localhost:5000/api/issue-reports/${report._id}`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
  //       body: JSON.stringify({ status: 'Rejected', rejectionComments: comments }),
  //     });
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
  //     }

  //     await Promise.all([
  //       fetch('http://localhost:5000/api/notifications', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
  //         body: JSON.stringify({
  //           username: report.username,
  //           message: `Your issue report for asset ${report.assetCode} was rejected. Reason: ${comments}`,
  //           departmentid: report.departmentid,
  //         }),
  //       }),
  //       fetch('http://localhost:5000/api/notifications', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
  //         body: JSON.stringify({
  //           username: 'hod',
  //           message: `Issue report for asset ${report.assetCode} by ${report.username} was rejected. Reason: ${comments}`,
  //           departmentid: report.departmentid,
  //         }),
  //       }),
  //     ]);

  //     alert('Issue report rejected successfully!');
  //     setRejectionComments((prev) => ({ ...prev, [report._id]: '' }));
  //     fetchIssueReports();
  //     fetchNotifications();
  //   } catch (error) {
  //     setError(error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

 const handleMaintenanceApproveRequest = async (asset) => {
  setLoading(true);
  try {
    const response = await fetch(`${BASIC_URL}/api/maintain-asset`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assetId: asset._id }),
    });
    if (!response.ok) {
      let errorMessage = `HTTP error! Status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.msg || errorMessage;
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
      }
      throw new Error(errorMessage);
    }

    await Promise.all([
      fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: asset.assignedTo.username,
          message: `Your Asset ${asset.assetCode} has been repaierd.`,
          departmentid: asset.departmentid,
        }),
      }),
      fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: 'hod',
          message: `Your Asset ${asset.assetCode} has been repaierd.`,
          departmentid: asset.departmentid,
        }),
      }),
    ]);
    alert('Asset removed from under maintenance');
  } catch (error) {
    console.error('Approve issue report error:', error);
    setError(`Failed to approve issue report: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const handleApproveIssueReport = async (report) => {
  setLoading(true);
  try {
    const response = await fetch(`${BASIC_URL}/api/issue-reports/${report._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify({ status: 'Under Maintenance' }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.msg || `HTTP error! Status: ${response.status}`);
    }

    await Promise.all([
      fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: report.username,
          message: `Your issue report for asset ${report.assetCode} has been approved. It will be resolved soon.`,
          departmentid: report.departmentid,
        }),
      }),
      fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: 'hod',
          message: `Issue report for asset ${report.assetCode} by ${report.username} has been approved.`,
          departmentid: report.departmentid,
        }),
      }),
    ]);

    alert('Issue report approved successfully!');
    fetchIssueReports();
    fetchNotifications();
  } catch (error) {
    console.error('Approve issue report error:', error);
    setError(`Failed to approve issue report: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

const handleRejectIssueReport = async (report) => {
  const comments = rejectionComments[report._id] || '';
  if (!comments) {
    setError('Please provide rejection comments');
    return;
  }
  setLoading(true);
  try {
    const response = await fetch(`${BASIC_URL}/api/issue-reports/${report._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify({ status: 'Rejected', rejectionComments: comments }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.msg || `HTTP error! Status: ${response.status}`);
    }

    await Promise.all([
      fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: report.username,
          message: `Your issue report for asset ${report.assetCode} was rejected. Reason: ${comments}`,
          departmentid: report.departmentid,
        }),
      }),
      fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: 'hod',
          message: `Issue report for asset ${report.assetCode} by ${report.username} was rejected. Reason: ${comments}`,
          departmentid: report.departmentid,
        }),
      }),
    ]);

    alert('Issue report rejected successfully!');
    setRejectionComments((prev) => ({ ...prev, [report._id]: '' }));
    fetchIssueReports();
    fetchNotifications();
  } catch (error) {
    console.error('Reject issue report error:', error);
    setError(`Failed to reject issue report: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkUploadFile) {
      setError('Please select a CSV file');
      return;
    }
    if (!bulkUploadFile.name.endsWith('.csv')) {
      setError('Please select a valid CSV file');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', bulkUploadFile);
      const response = await fetch(`${BASIC_URL}/api/bulk-upload`, {
        method: 'POST',
        headers: { 'x-auth-token': token },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized: Please log in as an admin');
        } else if (response.status === 403) {
          throw new Error('Forbidden: Admin access required');
        } else if (response.status === 400) {
          const errorMsg = result.errors
            ? `Invalid CSV: ${result.errors.map((e) => `Row ${e.row}: ${e.msg}`).join('; ')}`
            : result.msg || 'Bad request';
          throw new Error(errorMsg);
        } else {
          throw new Error(result.msg || `HTTP error! Status: ${response.status}`);
        }
      }
      alert(`Successfully processed ${result.savedAssets.length} assets!`);
      setBulkUploadFile(null);
      setShowBulkUploadPopup(false);
      fetchAssets();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => {
    navigate('/');
  };

  const handleSidebarClick = (section) => {
    setActiveSection(section);
    setShowAssetDetails(false);
    setShowRequests(false);
    setShowReports(false);
    setShowNotifications(false);
    setShowMaintenance(false);

    switch (section) {
      case 'assets':
        setShowAssetDetails(true);
        fetchAssets();
        break;
      case 'users':
        fetchUsers();
        break;
      case 'requests':
        setShowRequests(true);
        fetchRequests();
        break;
      case 'reports':
        setShowReports(true);
        fetchIssueReports();
        break;
      case 'notifications':
        setShowNotifications(true);
        fetchNotifications();
        break;
      case 'maintenance':
        setShowMaintenance(true);
        fetchAssets();
        break;
      default:
        break;
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowAssignAssetPopup(true);
  };

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  const filteredAssets = sortOption === 'all'
    ? assets
    : assets.filter((asset) => normalizeAssetName(asset.name) === sortOption);
  const maintenanceAssets = assets.filter((asset) => asset.status === 'Under Maintenance');

  const dismissError = () => {
    setError(null);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo-container">
          <img src={logo} alt="Asset Manager Logo" className="dashboard-logo" />
        </div>
        <div className="header-center">
          <h1>Asset Manager</h1>
          <p className="tagline">Admin Dashboard</p>
        </div>
        <div className="header-right">
          <input type="text" placeholder="Search..." className="search-bar" />
          <div className="user-profile" onClick={goHome}>👤 {username}</div>
        </div>
      </header>
      <div className="dashboard-content">
        {error && (
          <div className="error-message">
            {error}
            <button onClick={dismissError} className="dismiss-error">✖</button>
          </div>
        )}
        {loading && <div className="loading">Loading...</div>}
        <aside className="sidebar">
          <button
            className={`home-button ${activeSection === 'home' ? 'active' : ''}`}
            onClick={() => handleSidebarClick('home')}
          >
            <span className="home-icon">🏠</span> Home
          </button>
          <nav>
            <button
              className={`sidebar-button ${activeSection === 'assets' ? 'active' : ''}`}
              onClick={() => handleSidebarClick('assets')}
            >
              <span className="icon">📋</span> Asset Details
            </button>
            <button
              className={`sidebar-button ${activeSection === 'users' ? 'active' : ''}`}
              onClick={() => handleSidebarClick('users')}
            >
              <span className="icon">👥</span> Users
            </button>
            <button
              className={`sidebar-button ${activeSection === 'requests' ? 'active' : ''}`}
              onClick={() => handleSidebarClick('requests')}
            >
              <span className="icon">📥</span> User Requests
            </button>
            <button
              className={`sidebar-button ${activeSection === 'reports' ? 'active' : ''}`}
              onClick={() => handleSidebarClick('reports')}
            >
              <span className="icon">⚠️</span> Issue Reports
            </button>
            <button
              className={`sidebar-button ${activeSection === 'maintenance' ? 'active' : ''}`}
              onClick={() => handleSidebarClick('maintenance')}
            >
              <span className="icon">🔧</span> Maintenance
            </button>
            <button
              className={`sidebar-button ${activeSection === 'notifications' ? 'active' : ''}`}
              onClick={() => handleSidebarClick('notifications')}
            >
              <span className="icon">🔔</span> Notifications
            </button>
            <button
              className="sidebar-button"
              onClick={() => setShowAddAssetPopup(true)}
            >
              <span className="icon">➕</span> Add Asset
            </button>
            <button
              className="sidebar-button"
              onClick={() => setShowAddUserPopup(true)}
            >
              <span className="icon">➕</span> Add User
            </button>
            <button
              className="sidebar-button"
              onClick={() => setShowBulkUploadPopup(true)}
            >
              <span className="icon">📤</span> Bulk Upload
            </button>
          </nav>
        </aside>
        <main className="main-content">
          {activeSection === 'home' && (
            <div className="assets-section">
              <h2>Admin Dashboard</h2>
              <p>Welcome, {username}! Manage assets, users, requests, and issue reports from the sidebar.</p>
            </div>
          )}

          {showAssetDetails && activeSection === 'assets' && (
            <div className="assets-section">
              <div className="section-header">
                <span className="back-arrow" onClick={() => setShowAssetDetails(false)}>⬅</span>
                <h2>Assets Details</h2>
              </div>
              {loading ? (
                <p>Loading assets...</p>
              ) : (
                <>
                  <div className="sort-section">
                    <label htmlFor="sort">Sort by Asset Name: </label>
                    <select id="sort" value={sortOption} onChange={handleSortChange}>
                      <option value="all">All Assets</option>
                      {assetNames.map(({ normalizedName, displayName }) => (
                        <option key={normalizedName} value={normalizedName}>
                          {displayName.charAt(0).toUpperCase() + displayName.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {filteredAssets.length > 0 ? (
                    <div className="assets-grid">
  
                      {filteredAssets.map((asset) => (
                        <div key={asset._id} className="asset-card">
                          <div className="asset-visible">
                            {asset.qrCode && (
                              <img src={`${BASIC_URL}${asset.qrCode}`} alt="QR Code" />
                            )}
                            <div className="asset-code">Asset Code: {asset.assetCode}</div>
                          </div>

                          <div className="asset-details">
                            <h3>{asset.name}</h3>
                            <p>Model: {asset.model}</p>
                            <p>Status: {asset.status}</p>
                            {asset.assignedTo && (
                              <>
                                <p>Assigned To: {asset.assignedTo.username}</p>
                                <p>User ID: {asset.assignedTo.userId}</p>
                              </>
                            )}
                          </div>
                        

    

                          <button className="delete-button" onClick={() => handleDeleteAsset(asset)}>
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No assets found.</p>
                  )}
                </>
              )}
            </div>
          )}

          {activeSection === 'users' && !showAssetDetails && (
  <div className="assets-section">
    <div className="section-header">
      <span className="back-arrow" onClick={() => setActiveSection('home')}>⬅</span>
      <h2>Users</h2>
    </div>
    {loading ? (
      <p>Loading users...</p>
    ) : users.hods.length > 0 || users.users.length > 0 ? (
      <div className="assets-grid">
        {[...users.hods, ...users.users].map((user) => (
          <div key={user._id} className="user-card-container">
            <div
              id={`details-card-${user._id}`}
              className="details-card"
              onClick={() => {
                const section = document.getElementById(`assets-details-${user._id}`);
                if (section) section.classList.toggle('show');
              }}
            >
              <h3>{user.username}</h3>
              <p>Email: {user.email}</p>
              <p>Role: {user.role}</p>
              <p>Department: {user.departmentname || 'N/A'}</p>
            </div>
            <div id={`assets-details-${user._id}`} className="assignment-cards hidden">
  <p>Assigned Assets: </p>
  {assets &&
  assets.filter(
    (asset) =>
      asset.assignedTo &&
      asset.assignedTo.userId === user._id // make sure types match
  ).length > 0 ? (
    assets
      .filter(
        (asset) =>
          asset.assignedTo &&
          asset.assignedTo.userId === user._id
      )
      .map((asset) => (
        <div key={asset._id} style={{ marginBottom: '1rem' }}>
          <p style={{ margin: 0 }}>{asset.name}</p>
          <p style={{ margin: 0 }}>{asset.assetCode}</p>
          <button
            className="remove-button"
            onClick={() => handleRemoveAssignment(user, asset._id)}
          >
            Remove
          </button>
        </div>
      ))
  ) : (
    'None'
  )}

  <button className="assign-button" onClick={() => handleUserClick(user)}>
    Assign Asset
  </button>
  <button className="delete-button" onClick={() => handleDeleteUser(user)}>
    Delete User
  </button>
</div>

          </div>
        ))}
      </div>
    ) : (
      <p>No users found.</p>
    )}
  </div>
)}

          {activeSection === 'requests' && showRequests && (
            <div className="request-container">
              <div className="header-section">
                <span className="return-arrow" onClick={() => setShowRequests(false)}>←</span>
                <h2 className="section-title">User Requests</h2>
              </div>
              {loading ? (
                <p className="loading-text">Loading requests...</p>
              ) : requests.length > 0 ? (
                <div className="requests-grid">
                  {requests.map((request) => (
                    <div key={request._id} className="request-card">
                      <h3 className="request-user">User: {request.username}</h3>
                      <p className="request-asset">Asset: {request.assetCode}</p>
                      <p className="request-status">Status: {request.status || 'HOD Approved'}</p>
                      <p className="request-time">Time: {new Date(request.timestamp).toLocaleString()}</p>
                      {request.status === 'HOD Approved' && (
                        <>
                          <button className="btn-approve" onClick={() => handleApproveRequest(request)}>
                            Approve
                          </button>
                          <button className="btn-reject" onClick={() => handleRejectRequest(request)}>
                            Reject
                          </button>
                          <div className="comment-box">
                            <label htmlFor={`comment-${request._id}`} className="comment-label">
                              Rejection Reason
                            </label>
                            <textarea
                              id={`comment-${request._id}`}
                              className="comment-input"
                              value={rejectionComments[request._id] || ''}
                              onChange={(e) =>
                                setRejectionComments((prev) => ({ ...prev, [request._id]: e.target.value }))
                              }
                              placeholder="Enter reason for rejection"
                            />
                          </div>
                        </>
                      )}
                      {request.status === 'Admin Rejected' && (
                        <p className="rejection-note">
                          <strong>Rejection Reason:</strong> {request.rejectionComments}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-requests">No requests found.</p>
              )}
            </div>
          )}

                    {activeSection === 'reports' && showReports && (
            <div className="request-container">
              <div className="header-section">
                <span className="return-arrow" onClick={() => setShowReports(false)}>←</span>
                <h2 className="section-title">Issue Reports</h2>
              </div>
              {loading ? (
                <p className="loading-text">Loading issue reports...</p>
              ) : issueReports.length > 0 ? (
                <div className="requests-grid">
                  {issueReports.map((report) => (
                    <div key={report._id} className="request-card">
                      <h3 className="request-user">User: {report.username || 'Unknown'}</h3>
                      <p className="request-asset">Asset Code: {report.assetCode || 'N/A'}</p>
                      <p className="request-issue">Issue: {report.message || 'No description'}</p>
                      <p className="request-status">Status: {report.status || 'HOD Approved'}</p>
                      <p className="request-time">Time: {new Date(report.timestamp).toLocaleString()}</p>
                      {report.status === 'HOD Approved' && (
                        <>
                          <button className="btn-approve" onClick={() => handleApproveIssueReport(report)}>
                            Approve
                          </button>
                          <button className="btn-reject" onClick={() => handleRejectIssueReport(report)}>
                            Reject
                          </button>
                          <div className="comment-box">
                            <label htmlFor={`comment-${report._id}`} className="comment-label">
                              Rejection Reason
                            </label>
                            <textarea
                              id={`comment-${report._id}`}
                              className="comment-input"
                              value={rejectionComments[report._id] || ''}
                              onChange={(e) =>
                                setRejectionComments((prev) => ({ ...prev, [report._id]: e.target.value }))
                              }
                              placeholder="Enter reason for rejection"
                            />
                          </div>
                        </>
                      )}
                      {report.status === 'Rejected' && (
                        <p className="rejection-note">
                          <strong>Rejection Reason:</strong> {report.rejectionComments || 'None'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-requests">No issue reports found.</p>
              )}
            </div>
          )}
          {activeSection === 'maintenance' && showMaintenance && (
            <div className="request-container">
              <div className="header-section">
                <span className="return-arrow" onClick={() => setShowMaintenance(false)}>←</span>
                <h2 className="section-title">Maintenance</h2>
              </div>
              {loading ? (
                <p className="loading-text">Loading maintenance assets...</p>
              ) : maintenanceAssets.length > 0 ? (
                <div className="requests-grid">
                  {maintenanceAssets.map((asset) => (
                    <div key={asset._id} className="request-card">
                      <div className="request-card-visible">
                        {asset.qrCode && (
                          <img
                            src={`${BASIC_URL}${asset.qrCode}`}
                            alt="QR Code"
                            className="request-qr-code"
                          />
                        )}
                        <p className="request-asset">Asset Code: {asset.assetCode}</p>
                      </div>
                      <div className="request-card-hover">
                        <h3 className="request-asset-name">{asset.name}</h3>
                        <p className="request-model">Model: {asset.model}</p>
                        <p className="request-status">Status: {asset.status}</p>
                        <div>
                          <button className="btn-approve" onClick={() => handleMaintenanceApproveRequest(asset)}>
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-requests">No assets under maintenance.</p>
              )}
            </div>
          )}

          {activeSection === 'notifications' && showNotifications && (
          <div className="assets-section">
            <div className="section-header">
              <span className="back-arrow" onClick={() => setShowNotifications(false)}>⬅</span>
              <h2>Notifications</h2>
            </div>
            {loading ? (
              <p>Loading notifications...</p>
            ) : notifications.filter(notif => notif.username === fetchedUsername).length > 0 ? (
              <div className="assets-grid">
                {notifications
                  .filter(notif => notif.username === fetchedUsername)
                  .map((notif, index) => (
                    <div key={index} className="asset-card">
                      <p>{notif.message}</p>
                      <p>Timestamp: {new Date(notif.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p>No notifications found.</p>
            )}
          </div>
        )}

          {showAddAssetPopup && (
            <div className="popup-overlay">
              <div className="popup-content">
                <div className="popup-header">
                  <span className="back-arrow" onClick={() => setShowAddAssetPopup(false)}>⬅</span>
                  <h2>Add Asset</h2>
                </div>
                <form className="asset-adds" onSubmit={handleAddAsset}>
                  <div className="input-group">
                    <label htmlFor="assetName">Asset Name</label>
                    <input
                      type="text"
                      id="asset-name"
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="assetType">Type</label>
                    <input
                      type="text"
                      id="asset-type"
                      value={newAsset.type}
                      onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="assetBrand">Brand</label>
                    <input
                      type="text"
                      id="asset-brand"
                      value={newAsset.brand}
                      onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="assetModel">Model</label>
                    <input
                      type="text"
                      id="asset-model"
                      value={newAsset.model}
                      onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="dateOfBuying">Date of Buying</label>
                    <input
                      type="date"
                      id="date-of-buying"
                      value={newAsset.dateOfBuying}
                      onChange={(e) => setNewAsset({ ...newAsset, dateOfBuying: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="assetStatus">Status</label>
                    <select
                      id="asset-status"
                      value={newAsset.status}
                      onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })}
                      required
                    >
                      <option value="Available">Available</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label htmlFor="departmentid">Department ID</label>
                    <input
                      type="text"
                      id="department-id"
                      value={newAsset.departmentid}
                      onChange={(e) => setNewAsset({ ...newAsset, departmentid: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="submit-button">Add Asset</button>
                </form>
              </div>
            </div>
          )}

          {showAddUserPopup && (
            <div className="popup-overlay">
              <div className="popup-content">
                <div className="popup-header">
                  <span className="back-arrow" onClick={() => setShowAddUserPopup(false)}>⬅</span>
                  <h2>Add User</h2>
                </div>
                <form className="asset-adds" onSubmit={handleAddUser}>
                  <div className="input-group">
                    <label htmlFor="userEmail">Email</label>
                    <input
                      type="email"
                      id="user-email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="username">Username</label>
                    <input
                      type="text"
                      id="user-username"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      id="user-password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="userRole">Role</label>
                    <select
                      id="user-role"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      required
                    >
                      <option value="user">User</option>
                      <option value="hod">HOD</option>
                      
                    </select>
                  </div>
                  <div className="input-group">
                    <label htmlFor="userDepartmentid">Department ID</label>
                    <input
                      type="text"
                      id="user-department-id"
                      value={newUser.departmentid}
                      onChange={(e) => setNewUser({ ...newUser, departmentid: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="departmentname">Department</label>
                    <input
                      type="text"
                      id="department-name"
                      value={newUser.departmentname}
                      onChange={(e) => setNewUser({ ...newUser, departmentname: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="submit-button">Add User</button>
                </form>
              </div>
            </div>
          )}

          {showAssignAssetPopup && selectedUser && (
            <div className="popup-overlay">
              <div className="popup-content">
                <div className="popup-header">
                  <span className="back-arrow" onClick={() => setShowAssignAssetPopup(false)}>⬅</span>
                  <h2>Assign Asset to {selectedUser.username}</h2>
                </div>
                <form onSubmit={handleAssignAsset}>
                  <div className="input-group">
                    <label htmlFor="asset-select">Select Asset</label>
                    <select
                      id="asset-select"
                      value={selectedAsset ? selectedAsset.assetCode : ''}
                      onChange={(e) => {
                        const asset = assets.find((a) => a.assetCode === e.target.value);
                        setSelectedAsset(asset);
                      }}
                      required
                    >
                      <option value="">Select an asset...</option>
                      {assets
                        .filter((asset) => asset.status === 'Available')
                        .map((asset) => (
                          <option key={asset._id} value={asset.assetCode}>
                            {asset.name} ({asset.assetCode})
                          </option>
                        ))}
                    </select>
                  </div>
                  <button type="submit" className="submit-button">Assign</button>
                </form>
              </div>
            </div>
          )}

          {showBulkUploadPopup && (
            <div className="popup-overlay">
              <div className="popup-content">
                <div className="popup-header">
                  <span className="back-arrow" onClick={() => setShowBulkUploadPopup(false)}>⬅</span>
                  <h2>Bulk Upload Assets</h2>
                </div>
                <form onSubmit={handleBulkUpload}>
                  <div className="input-group">
                    <h3 className='bulk-details'>Details Format</h3>
                    <p className='bulk-format'>Name</p>
                    <p className='bulk-format'>Type</p>
                    <p className='bulk-format'>brand</p>
                    <p className='bulk-format'>Model</p>
                    <p className='bulk-format'>Date of Buying</p>
                    <p className='bulk-format'>Status</p>
                    <label htmlFor="bulkUploadFile">Upload CSV File</label>
                    <input
                      type="file"
                      id="bulk-upload-file"
                      accept=".csv"
                      onChange={(e) => setBulkUploadFile(e.target.files[0])}
                      required
                    />
                  </div>
                  <button type="submit" className="submit-button">Upload</button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;