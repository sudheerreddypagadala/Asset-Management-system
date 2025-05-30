import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../css/Dashboard.css';
import logo from '../assets/logo.png';

const HodDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userType, departmentid, token, username } = location.state || {
    userType: 'unknown',
    departmentid: null,
    token: null,
    username: '',
  };
  const [assets, setAssets] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [users, setUsers] = useState({ hods: [], users: [] });
  const [requests, setRequests] = useState([]);
  const [issueReports, setIssueReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [showAssignAssetPopup, setShowAssignAssetPopup] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [rejectionComments, setRejectionComments] = useState({});
  const [error, setError] = useState(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingIssueReports, setLoadingIssueReports] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortOption, setSortOption] = useState('all');
  const [assetNames, setAssetNames] = useState([]);
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
    if (userType !== 'hod') {
      setError('Unauthorized access. Only HODs can view this dashboard.');
      navigate('/login');
      return;
    }
    if (!departmentid) {
      setError('Department ID is missing. Please log in again.');
      navigate('/login');
      return;
    }

    // Fetch department-specific assets
    const fetchDepartmentAssets = async () => {
      setLoadingAssets(true);
      try {
        const response = await fetch(
          `${BASIC_URL}/api/assets?role=hod&username=${encodeURIComponent(username)}`,
          {
            headers: { 'x-auth-token': token },
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setAssets(Array.isArray(data) ? data : []);
      } catch (error) {
        setError(error.message);
        console.error('Fetch department assets error:', error);
      } finally {
        setLoadingAssets(false);
      }
    };

    // Fetch all assets
    const fetchAllAvailableAssets = async () => {
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
        setAllAssets(Array.isArray(data) ? data : []);

        // Process unique asset names
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
        console.error('Fetch all assets error:', error);
      } finally {
        setLoading(false);
      }
    };

    // Execute fetches
    fetchDepartmentAssets();
    fetchAllAvailableAssets();
    fetchUsers();
    fetchNotifications();
  }, [userType, departmentid, token, navigate, username]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`${BASIC_URL}/api/all-users`, {
        headers: { 'x-auth-token': token },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      // Ensure assignedAssets is an array for each user
      const processedHods = Array.isArray(data.hods)
        ? data.hods
            .filter((user) => user.username !== username)
            .map((user) => ({
              ...user,
              assignedAssets: Array.isArray(user.assignedAssets) ? user.assignedAssets : [],
            }))
        : [];
      const processedUsers = Array.isArray(data.users)
        ? data.users
            .filter((user) => user.username !== username)
            .map((user) => ({
              ...user,
              assignedAssets: Array.isArray(user.assignedAssets) ? user.assignedAssets : [],
            }))
        : [];
      setUsers({
        hods: processedHods,
        users: processedUsers,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await fetch(`${BASIC_URL}/api/asset-requests`, {
        headers: { 'x-auth-token': token },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.msg || response.statusText}`);
      }
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(`Failed to fetch requests: ${error.message}`);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchIssueReports = async () => {
    setLoadingIssueReports(true);
    try {
      if (!departmentid) throw new Error('Department ID is missing');
      const response = await fetch(
        `${BASIC_URL}/api/issue-reports?departmentid=${departmentid}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setIssueReports(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(`Failed to fetch issue reports: ${error.message}`);
    } finally {
      setLoadingIssueReports(false);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      if (!departmentid) throw new Error('Department ID is missing');
      const response = await fetch(`${BASIC_URL}/api/notifications?departmentid=${departmentid}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! statuses: ${response.status}, Message: ${errorData.msg || response.statusText}`);
      }
      const data = await response.json();
      const filteredNotifications = Array.isArray(data) ? data : [];
      setNotifications(filteredNotifications);
    } catch (error) {
      setError(`Failed to fetch notifications: ${error.message}`);
    } finally {
      setLoadingNotifications(false);
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
      const response = await fetch(`${BASIC_URL}/api/assets/${selectedAsset._id}/assign`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'x-auth-token': token 
        },
        body: JSON.stringify({ 
          userId: selectedUser._id,
          username: selectedUser.username 
        }),
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
            username: selectedUser.username,
            message: `Asset ${selectedAsset.name} (${selectedAsset.assetCode}) has been assigned to you.`,
            departmentid: selectedUser.departmentid,
          }),
        }),
        fetch(`${BASIC_URL}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({
            username: 'hod',
            message: `Asset ${selectedAsset.name} (${selectedAsset.assetCode}) has been assigned to ${selectedUser.username} by ${username}.`,
            departmentid: selectedUser.departmentid,
          }),
        }),
      ]);

      alert('Asset assigned successfully!');
      setShowAssignAssetPopup(false);
      setSelectedUser(null);
      setSelectedAsset(null);
      fetchUsers();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (user, assetId) => {
    setLoadingAssets(true);
    try {
      const asset = allAssets.find((a) => a._id === assetId);
      if (!asset) throw new Error('Asset not found');

      const assetRemoveResponse = await fetch(`${BASIC_URL}/api/assets/${assetId}/unassign`, {
        method: 'PATCH',
        headers: { 'x-auth-token': token },
      });

      if (!assetRemoveResponse.ok) {
        const errorData = await assetRemoveResponse.json();
        throw new Error(errorData.msg || `HTTP error! Status: ${assetRemoveResponse.status}`);
      }

      await Promise.all([
        fetch(`${BASIC_URL}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({
            username: user.username,
            message: `Asset ${asset.name} (${asset.assetCode}) has been unassigned from you.`,
            departmentid: user.departmentid,
          }),
        }),
        fetch(`${BASIC_URL}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({
            username: 'hod',
            message: `Asset ${asset.name} (${asset.assetCode}) has been unassigned from ${user.username} by ${username}.`,
            departmentid: user.departmentid,
          }),
        }),
      ]);

      alert('Asset assignment removed successfully!');
      fetchUsers();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleApproveRequest = async (request) => {
    try {
      const response = await fetch(`${BASIC_URL}/api/asset-requests/${request._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ status: 'HOD Approved' }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Update request failed: ${errorData.msg || response.statusText}`);
      }

      await fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: request.username,
          message: `Your request for asset ${request.assetCode} has been approved by HOD.`,
          departmentid,
        }),
      });

      alert('Request approved and forwarded to admin!');
      fetchRequests();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
      alert(`Failed to approve request: ${error.message}`);
    }
  };

  const handleRejectRequest = async (request) => {
    const comments = rejectionComments[request._id] || '';
    if (!comments) {
      alert('Please provide comments for rejection');
      return;
    }
    try {
      const response = await fetch(`${BASIC_URL}/api/asset-requests/${request._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ status: 'HOD Rejected', rejectionComments: comments }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Update request failed: ${errorData.msg || response.statusText}`);
      }

      await fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: request.username,
          message: `Your request for asset ${request.assetCode} was rejected by HOD. Reason: ${comments}`,
          departmentid,
        }),
      });

      alert('Request rejected and user notified!');
      setRejectionComments((prev) => ({ ...prev, [request._id]: '' }));
      fetchRequests();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
      alert(`Failed to reject request: ${error.message}`);
    }
  };

  const handleApproveIssueReport = async (report) => {
    try {
      const response = await fetch(`${BASIC_URL}/api/issue-reports/${report._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ status: 'HOD Approved' }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Update issue report failed: ${errorData.msg || response.statusText}`);
      }

      await fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: report.username,
          message: `Your issue report for asset ${report.assetCode} has been approved by HOD.`,
          departmentid,
        }),
      });

      alert('Issue report approved and forwarded to admin!');
      fetchIssueReports();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
      alert(`Failed to approve issue report: ${error.message}`);
    }
  };

  const handleRejectIssueReport = async (report) => {
    const comments = rejectionComments[report._id] || '';
    if (!comments) {
      alert('Please provide comments for rejection');
      return;
    }
    try {
      const response = await fetch(`${BASIC_URL}/api/issue-reports/${report._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ status: 'Rejected', rejectionComments: comments }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Update issue report failed: ${errorData.msg || response.statusText}`);
      }

      await fetch(`${BASIC_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          username: report.username,
          message: `Your issue report for asset ${report.assetCode} was rejected by HOD. Reason: ${comments}`,
          departmentid,
        }),
      });

      alert('Issue report rejected and user notified!');
      setRejectionComments((prev) => ({ ...prev, [report._id]: '' }));
      fetchIssueReports();
      fetchNotifications();
    } catch (error) {
      setError(error.message);
      alert(`Failed to reject issue report: ${error.message}`);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.username}?`)) return;
    try {
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
    } catch (error) {
      setError(error.message);
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
        break;
      case 'requests':
        setShowRequests(true);
        fetchRequests();
        break;
      case 'users':
        fetchUsers();
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
        break;
      default:
        break;
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowAssignAssetPopup(true);
  };

  const handleUserSetClick = (user) => {
    setSelectedUser(user);
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
          <p className="tagline">HOD Dashboard</p>
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
          </nav>
        </aside>
        <main className="main-content">
          {activeSection === 'home' && (
            <div className="assets-section">
              <h2>HOD Dashboard</h2>
              <p>Welcome, {username}! Manage assets, users, requests, and issue reports from the sidebar.</p>
            </div>
          )}

          {showAssetDetails && activeSection === 'assets' && (
            <div className="assets-section">
              <div className="section-header">
                <span className="back-arrow" onClick={() => setShowAssetDetails(false)}>⬅</span>
                <h2>Assets Details</h2>
              </div>
              {loadingAssets ? (
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
              {loadingUsers ? (
                <p>Loading users...</p>
              ) : users.hods.length > 0 || users.users.length > 0 ? (
                <div className="assets-grid">
                  {[...users.hods, ...users.users]
                  .filter((user) => user.departmentid === departmentid)
                  .map((user) => (
                    <div key={user._id} className="user-card-container">
                      <div
                        id={`details-card-${user._id}`}
                        className="details-card"
                        onClick={() => {
                          const section = document.getElementById(`assets-details-${user._id}`);
                          if (section) section.classList.toggle('show');
                          handleUserSetClick(user);
                        }}
                      >
                        <h3>{user.username}</h3>
                        <p>Email: {user.email}</p>
                        <p>Role: {user.role}</p>
                        <p>Department: {user.departmentname || 'N/A'}</p>
                      </div>
                      <div id={`assets-details-${user._id}`} className="assignment-cards hidden">
                        <div>
                          <strong>Assigned Assets:</strong>{' '}
                          {allAssets && allAssets.length > 0 ? (
                            allAssets
                              .filter((asset) => selectedUser && asset.assignedTo && asset.assignedTo.username === selectedUser.username)
                              .map((asset, index) => (
                                <div key={asset._id || `asset-${index}`} style={{ marginBottom: '1rem' }}>
                                  <div>
                                    {asset.name || asset.assetName || asset.assetCode || 'Unnamed Asset'}
                                  </div>
                                  <div>{asset.assetCode || 'N/A'}</div>
                                  <button
                                    className="remove-button"
                                    onClick={() => handleRemoveAssignment(user, asset._id)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))
                          ) : (
                            <span>None</span>
                          )}
                        </div>
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
              {loadingRequests ? (
                <p className="loading-text">Loading requests...</p>
              ) : requests.length > 0 ? (
                <div className="requests-grid">
                  {requests
                  .filter((request) => request.departmentid === departmentid)
                  .map((request) => (
                    <div key={request._id} className="request-card">
                      <h3 className="request-user">User: {request.username}</h3>
                      <p className="request-asset">Requested Asset: {request.assetCode}</p>
                      <p className="request-status">Status: {request.status || 'Pending'}</p>
                      <p className="request-time">Time: {new Date(request.timestamp).toLocaleString()}</p>
                      {request.status === 'Pending' && (
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
                      {request.status === 'HOD Rejected' && (
                        <p className="rejection-note">
                          <strong>Rejection Reason:</strong> {request.rejectionComments}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-requests">No requests assigned.</p>
              )}
            </div>
          )}

          {activeSection === 'reports' && showReports && (
            <div className="request-container">
              <div className="header-section">
                <span className="return-arrow" onClick={() => setShowReports(false)}>←</span>
                <h2 className="section-title">Issue Reports</h2>
              </div>
              {loadingIssueReports ? (
                <p className="loading-text">Loading issue reports...</p>
              ) : issueReports.length > 0 ? (
                <div className="requests-grid">
                  {issueReports
                  .filter((report) => report.departmentid === departmentid)
                  .map((report) => (
                    <div key={report._id} className="request-card">
                      <h3 className="request-user">User: {report.username || 'Unknown'}</h3>
                      <p className="request-asset">Asset Code: {report.assetCode || 'N/A'}</p>
                      <p className="request-issue">Issue: {report.message || 'No description'}</p>
                      <p className="request-status">Status: {report.status || 'Unknown'}</p>
                      <p className="request-time">Time: {report.timestamp ? new Date(report.timestamp).toLocaleString() : 'N/A'}</p>
                      {report.status === 'Pending' && (
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
                          <strong>Rejection Reason:</strong> {report.rejectionComments}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-requests">No issue reports found for this department.</p>
              )}
            </div>
          )}

          {activeSection === 'maintenance' && showMaintenance && (
            <div className="assets-section">
              <div className="section-header">
                <span className="back-arrow" onClick={() => setShowMaintenance(false)}>⬅</span>
                <h2>Maintenance</h2>
              </div>
              {loadingAssets ? (
                <p>Loading maintenance assets...</p>
              ) : maintenanceAssets.length > 0 ? (
                <div className="assets-grid">
                  {maintenanceAssets.map((asset) => (
                    <div key={asset._id} className="asset-card">
                      <h3>{asset.name}</h3>
                      <p>Asset Code: {asset.assetCode}</p>
                      <p>Model: {asset.model}</p>
                      <p>Status: {asset.status}</p>
                      {asset.qrCode && (
                        <img src={`${BASIC_URL}${asset.qrCode}`} alt="QR Code" style={{ width: '100px' }} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No assets found under maintenance.</p>
              )}
            </div>
          )}

          {activeSection === 'notifications' && showNotifications && (
            <div className="assets-section">
              <div className="section-header">
                <span className="back-arrow" onClick={() => setShowNotifications(false)}>⬅</span>
                <h2>Notifications</h2>
              </div>
              {loadingNotifications ? (
                <p>Loading notifications...</p>
              ) : notifications.length > 0 ? (
                <div className="assets-grid">
                  {notifications
                    .filter((notif) => notif.username === username)
                  .map((notif, index) => (
                    <div key={notif._id || `notif-${index}`} className="asset-card">
                      <p>{notif.message || 'No message'}</p>
                      <p>Timestamp: {notif.timestamp ? new Date(notif.timestamp).toLocaleString() : 'N/A'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No notifications available for HOD.</p>
              )}
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
                    <label htmlFor="assetSelect">Select Asset</label>
                    <select
                      id="assetSelect"
                      value={selectedAsset ? selectedAsset.assetCode : ''}
                      onChange={(e) => {
                        const asset = allAssets.find((a) => a.assetCode === e.target.value);
                        setSelectedAsset(asset);
                      }}
                      required
                    >
                      <option value="">Select an asset...</option>
                      {allAssets
                        .filter((asset) => !asset.assignedTo || !asset.assignedTo.username)
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
        </main>
      </div>
    </div>
  );
};

export default HodDashboard;