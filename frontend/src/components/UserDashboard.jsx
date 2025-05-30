import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../css/Dashboard.css';
import logo from '../assets/logo.png';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

const UserDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userType, departmentid, token, username } = location.state || { userType: 'unknown', departmentid: null, token: null, username: '' };

  const [assets, setAssets] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showAssetDetailsPopup, setShowAssetDetailsPopup] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedAssetCode, setSelectedAssetCode] = useState('');
  const [issueMessage, setIssueMessage] = useState('');
  const [error, setError] = useState(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // New state for search input
  const fetchedUsername = sessionStorage.getItem('username') || 'Guest';

  useEffect(() => {
    if (!token) {
      setError('Unauthorized: No token provided');
      return;
    }

    // Load assets by default to make assets the home view
    fetchAssets().catch(setError);
    fetchAvailableAssets().catch(setError);
  }, [token]);

  useEffect(() => {
    let html5QrCode;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode('qr-reader');
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            console.log('Scanned QR content:', decodedText);
            const assetCode = decodedText.split('Code:')[1]?.trim();
            console.log('Extracted asset code:', assetCode);

            if (!assetCode) {
              setError('Invalid QR code format. Expected "Code: <assetCode>"');
              await html5QrCode.stop();
              return;
            }

            try {
              const response = await fetch(`http://localhost:5000/api/assets/${assetCode}`, {
                headers: { 'x-auth-token': token },
              });
              if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
              const asset = await response.json();
              console.log('Fetched asset:', asset);
              setSelectedAsset(asset);
              setShowAssetDetailsPopup(true);
              setShowQRScanner(false);
              await html5QrCode.stop();
            } catch (err) {
              setError(`Failed to fetch asset: ${err.message}`);
              if (html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
                await html5QrCode.stop();
              }
            }
          },
          (err) => {
            console.error('QR scan error:', err);
          }
        );
      } catch (err) {
        setError(`QR scanner initialization failed: ${err.message}`);
      }
    };

    if (showQRScanner) startScanner();

    return () => {
      if (html5QrCode && html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
        html5QrCode.stop().catch((err) => console.error('Failed to stop QR scanner:', err));
      }
    };
  }, [showQRScanner, token]);

  const fetchAssets = async () => {
    const response = await fetch('http://localhost:5000/api/user-assets', {
      headers: { 'x-auth-token': token },
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    setAssets(data);
    console.log('Fetched assets:', data);
  };

  const fetchAvailableAssets = async () => {
    const response = await fetch('http://localhost:5000/api/assets', {
      headers: { 'x-auth-token': token },
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    setAvailableAssets(data.filter(asset => asset.status === 'Available'));
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);

      if (!token) {
        console.warn("Token not found");
        setError("Unauthorized: No token provided");
        return;
      }

      const response = await fetch('http://localhost:5000/api/notifications', {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Notifications data:', data);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setError(error.message);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleRequestAsset = async (e) => {
    e.preventDefault();
    if (!selectedAssetCode) return alert('Please select an asset');

    try {
      await fetch('http://localhost:5000/api/asset-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ username, assetCode: selectedAssetCode, departmentid, status: 'Pending' }),
      });

      await Promise.all([
        fetch('http://localhost:5000/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ username: 'hod', message: `User ${username} requested asset ${selectedAssetCode}.`, departmentid }),
        }),
        fetch('http://localhost:5000/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ username: 'admin', message: `User ${username} requested asset ${selectedAssetCode}.`, departmentid }),
        }),
      ]);

      alert('Asset request sent successfully to HOD and Admin!');
      setShowRequestPopup(false);
      setSelectedAssetCode('');
      fetchNotifications();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReportIssue = async (e) => {
    e.preventDefault();
    
    if (!selectedAsset || !issueMessage) return alert('Please provide an issue description');

    try {
      await fetch('http://localhost:5000/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ username, assetCode: selectedAsset.assetCode, message: issueMessage, departmentid, status: 'Pending' }),
      });

      await Promise.all([
        fetch('http://localhost:5000/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ username: 'hod', message: `User ${username} reported an issue for asset ${selectedAsset.assetCode}: ${issueMessage}`, departmentid }),
        }),
        fetch('http://localhost:5000/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ username: 'admin', message: `User ${username} reported an issue for asset ${selectedAsset.assetCode}: ${issueMessage}`, departmentid }),
        }),
      ]);

      alert('Issue reported successfully!');
      setShowAssetDetailsPopup(false);
      setSelectedAsset(null);
      setIssueMessage('');
      fetchNotifications();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const goHome = () => {
    navigate('/');
  };

  // Filter assets based on search query
  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.assetCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo-container">
          <img src={logo} alt="Asset Manager Logo" className="dashboard-logo" />
        </div>
        <div className="header-center">
          <h1>Asset Manager</h1>
          <p className="tagline">User Dashboard</p>
        </div>
        <div className="header-right">
          <input
            type="text"
            placeholder="Search assets..."
            className="search-bar"
            value={searchQuery}
            onChange={handleSearch}
          />
          <div className="user-profile" onClick={goHome}>👤 {username}</div>
        </div>
      </header>

      <div className="dashboard-content">
        <aside className="sidebar">
          <nav>
                        <button className="sidebar-button" onClick={() => { fetchAssets(); setShowNotifications(false); setSearchQuery(''); }}>📋 My Assets</button>

            <button className="sidebar-button" onClick={() => setShowQRScanner(true)}>📷 Scan QR Code</button>
            <button className="sidebar-button" onClick={() => { fetchAvailableAssets(); setShowRequestPopup(true); }}>➕ Request Asset</button>
            <button className="sidebar-button" onClick={() => { fetchNotifications(); setShowNotifications(true); }}>🔔 Notifications</button>
          </nav>
        </aside>

        <main className="main-content">
          {showNotifications ? (
              loadingNotifications ? (
                <p>Loading notifications...</p>
              ) : notifications.length > 0 ? (
                <div className="assets-section">
                  <h2>Notifications</h2>
                  <div className="assets-grid">
                    {notifications
                      .filter(notif => notif.username === fetchedUsername)
                      .map((notif, index) => (
                        <div key={index} className="asset-card">
                          <p>{notif.message}</p>
                          <p>{new Date(notif.timestamp).toLocaleString()}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p>No notifications available.</p>
              )
            ) : (
              <div className="assets-section">
                <h2>Dashboard</h2>
                {filteredAssets.length > 0 ? (
                  <div className="assets-grid">
                    {filteredAssets.map((asset) => (
                      <div key={asset._id} className="asset-card">
                        <h3>{asset.name}</h3>
                        <p>Asset Code: {asset.assetCode}</p>
                        <p>Status: {asset.status}</p>
                        {asset.qrCode && <img src={`http://localhost:5000${asset.qrCode}`} alt="QR Code" style={{ width: '100px' }} />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{searchQuery ? 'No assets match your search.' : 'No assets assigned.'}</p>
                )}
              </div>
            )}

          {showQRScanner && (
            <div className="popup-overlay">
              <div className="popup-content">
                <div className="popup-header">
                  <span className="back-arrow" onClick={() => setShowQRScanner(false)}>⬅</span>
                  <h2>Scan QR Code</h2>
                </div>
                <div id="qr-reader" style={{ width: '100%' }}></div>
              </div>
            </div>
          )}

          {showAssetDetailsPopup && selectedAsset && (
            <div className="popup-overlay">
              <div className="popup-content">
                <div className="popup-header">
                  <span className="back-arrow" onClick={() => setShowAssetDetailsPopup(false)}>⬅</span>
                  <h2>Asset Details</h2>
                </div>
                <div className="report-details">
                  <p><strong>Name:</strong> {selectedAsset.name}</p>
                  <p><strong>Asset Code:</strong> {selectedAsset.assetCode}</p>
                  <p><strong>Type:</strong> {selectedAsset.type}</p>
                  <p><strong>Brand:</strong> {selectedAsset.brand}</p>
                  <p><strong>Model:</strong> {selectedAsset.model}</p>
                  <p><strong>Status:</strong> {selectedAsset.status}</p>
                  {selectedAsset.qrCode && (
                    <img src={`http://localhost:5000${selectedAsset.qrCode}`} alt="QR Code" style={{ width: '100px' }} />
                  )}
                
                <form onSubmit={handleReportIssue}>
                  <label className="report-issue-label" htmlFor="issueMessage">Report Issue</label>
                  <textarea
                    className="report-issues-textarea"
                    id="issueMessage"
                    value={issueMessage}
                    onChange={(e) => setIssueMessage(e.target.value)}
                    placeholder="Describe the issue"
                    required
                  />
                  <button type="submit" className="submit-button">Report Issue</button>
                </form>
                </div>
              </div>
            </div>
          )}

          {showRequestPopup && (
            <div className="popup-overlay">
              <div className="popup-content">
                <div className="popup-header">
                  <span className="back-arrow" onClick={() => setShowRequestPopup(false)}>⬅</span>
                  <h2>Request Asset</h2>
                </div>
                <form onSubmit={handleRequestAsset}>
                  <label htmlFor="assetSelect">Select Asset</label>
                  <select
                    id="assetSelect"
                    value={selectedAssetCode}
                    onChange={(e) => setSelectedAssetCode(e.target.value)}
                    required
                  >
                    <option value="">Select an asset...</option>
                    {availableAssets.map((asset) => (
                      <option key={asset._id} value={asset.assetCode}>
                        {asset.name} ({asset.assetCode})
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="submit-button">Request</button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;