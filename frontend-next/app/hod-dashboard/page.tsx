"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

const BASIC_URL = process.env.NEXT_PUBLIC_BASIC_URL || "";

export default function HodDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [departmentid, setDepartmentId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setToken(sessionStorage.getItem("token"));
    setUserType(sessionStorage.getItem("userType"));
    setUsername(sessionStorage.getItem("username") || "");
    setDepartmentId(sessionStorage.getItem("departmentid") || "");
  }, []);

  const [assets, setAssets] = useState<any[]>([]);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<{ hods: any[]; users: any[] }>({ hods: [], users: [] });
  const [requests, setRequests] = useState<any[]>([]);
  const [issueReports, setIssueReports] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [showAssignAssetPopup, setShowAssignAssetPopup] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [rejectionComments, setRejectionComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingIssueReports, setLoadingIssueReports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState("all");

  useEffect(() => {
    if (!token) {
      setError("No authentication token. Please log in again.");
      router.replace("/");
      return;
    }
    if (userType !== "hod") {
      setError("Unauthorized access. Only HODs can view this dashboard.");
      router.replace("/");
      return;
    }
    if (!departmentid) {
      setError("Department ID is missing. Please log in again.");
      router.replace("/");
      return;
    }

    (async () => {
      await fetchDepartmentAssets();
      await fetchAllAvailableAssets();
      await fetchUsers();
      await fetchNotifications();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userType, departmentid, username]);

  const normalize = (name: string) => {
    if (!name) return "";
    const lower = name.toLowerCase();
    if (lower.endsWith("es")) return lower.slice(0, -2);
    if (lower.endsWith("s")) return lower.slice(0, -1);
    return lower;
  };

  const fetchDepartmentAssets = async () => {
    setLoadingAssets(true);
    try {
      const res = await fetch(`${BASIC_URL}/api/assets?role=hod&username=${encodeURIComponent(username)}`, { headers: { "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e.message); } finally { setLoadingAssets(false); }
  };

  const fetchAllAvailableAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASIC_URL}/api/assets`, { headers: { "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAllAssets(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${BASIC_URL}/api/all-users`, { headers: { "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers({
        hods: (data.hods || []).filter((u: any) => u.username !== username).map((u: any) => ({ ...u, assignedAssets: Array.isArray(u.assignedAssets) ? u.assignedAssets : [] })),
        users: (data.users || []).filter((u: any) => u.username !== username).map((u: any) => ({ ...u, assignedAssets: Array.isArray(u.assignedAssets) ? u.assignedAssets : [] })),
      });
    } catch (e: any) { setError(e.message); } finally { setLoadingUsers(false); }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(`${BASIC_URL}/api/asset-requests`, { headers: { "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(`Failed to fetch requests: ${e.message}`); } finally { setLoadingRequests(false); }
  };

  const fetchIssueReports = async () => {
    setLoadingIssueReports(true);
    try {
      const res = await fetch(`${BASIC_URL}/api/issue-reports?departmentid=${departmentid}`, { headers: { "Content-Type": "application/json", "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIssueReports(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(`Failed to fetch issue reports: ${e.message}`); } finally { setLoadingIssueReports(false); }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch(`${BASIC_URL}/api/notifications?departmentid=${departmentid}`, { headers: { "Content-Type": "application/json", "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(`Failed to fetch notifications: ${e.message}`); } finally { setLoadingNotifications(false); }
  };

  const filteredAssets = sortOption === "all" ? assets : assets.filter((a: any) => normalize(a.name) === sortOption);
  const maintenanceAssets = assets.filter((a: any) => a.status === "Under Maintenance");

  const goHome = () => router.push("/");

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo-container">
          <img src="/logo.png" alt="Asset Manager Logo" className="dashboard-logo" />
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
        {error && <div className="error-message">{error}</div>}
        <aside className="sidebar">
          <button className={`home-button ${activeSection === 'home' ? 'active' : ''}`} onClick={() => setActiveSection('home')}><span className="home-icon">🏠</span> Home</button>
          <nav>
            <button className={`sidebar-button ${activeSection === 'assets' ? 'active' : ''}`} onClick={() => { setActiveSection('assets'); setShowAssetDetails(true); }}>📋 Asset Details</button>
            <button className={`sidebar-button ${activeSection === 'users' ? 'active' : ''}`} onClick={() => { setActiveSection('users'); fetchUsers(); }}>👥 Users</button>
            <button className={`sidebar-button ${activeSection === 'requests' ? 'active' : ''}`} onClick={() => { setActiveSection('requests'); setShowRequests(true); fetchRequests(); }}>📥 User Requests</button>
            <button className={`sidebar-button ${activeSection === 'reports' ? 'active' : ''}`} onClick={() => { setActiveSection('reports'); setShowReports(true); fetchIssueReports(); }}>⚠️ Issue Reports</button>
            <button className={`sidebar-button ${activeSection === 'maintenance' ? 'active' : ''}`} onClick={() => { setActiveSection('maintenance'); setShowMaintenance(true); }}>🔧 Maintenance</button>
            <button className={`sidebar-button ${activeSection === 'notifications' ? 'active' : ''}`} onClick={() => { setActiveSection('notifications'); setShowNotifications(true); fetchNotifications(); }}>🔔 Notifications</button>
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
              <div className="section-header"><span className="back-arrow" onClick={() => setShowAssetDetails(false)}>⬅</span><h2>Assets Details</h2></div>
              {loadingAssets ? <p>Loading assets...</p> : (
                <>
                  <div className="assets-grid">
                    {filteredAssets.map((asset: any) => (
                      <div key={asset._id} className="asset-card">
                        <div className="asset-visible">
                          {asset.qrCode && <img src={`${BASIC_URL}${asset.qrCode}`} alt="QR Code" />}
                          <div className="asset-code">Asset Code: {asset.assetCode}</div>
                        </div>
                        <div className="asset-details">
                          <h3>{asset.name}</h3>
                          <p>Model: {asset.model}</p>
                          <p>Status: {asset.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'requests' && showRequests && (
            <div className="request-container">
              <div className="header-section"><span className="return-arrow" onClick={() => setShowRequests(false)}>←</span><h2 className="section-title">User Requests</h2></div>
              {loadingRequests ? <p className="loading-text">Loading requests...</p> : requests.length > 0 ? (
                <div className="requests-grid">
                  {requests.filter((r: any) => r.departmentid === departmentid).map((request: any) => (
                    <div key={request._id} className="request-card">
                      <h3 className="request-user">User: {request.username}</h3>
                      <p className="request-asset">Requested Asset: {request.assetCode}</p>
                      <p className="request-status">Status: {request.status || 'Pending'}</p>
                      <p className="request-time">Time: {new Date(request.timestamp).toLocaleString()}</p>
                      {request.status === 'Pending' && (
                        <div className="request-buttons">
                          <button className="btn-approve" onClick={async () => {
                            try {
                              const res = await fetch(`${BASIC_URL}/api/asset-requests/${request._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-auth-token': token as string }, body: JSON.stringify({ status: 'HOD Approved' }) });
                              if (!res.ok) throw new Error(`HTTP ${res.status}`);
                              await fetchRequests();
                              await fetchNotifications();
                            } catch (e: any) { setError(e.message); }
                          }}>Approve</button>
                          <button className="btn-reject" onClick={() => setRejectionComments((prev) => ({ ...prev, [request._id]: prev[request._id] || '' }))}>Reject</button>
                          <div className="comment-box">
                            <label htmlFor={`comment-${request._id}`} className="comment-label">Rejection Reason</label>
                            <textarea id={`comment-${request._id}`} className="comment-input" value={rejectionComments[request._id] || ''} onChange={(e) => setRejectionComments((prev) => ({ ...prev, [request._id]: e.target.value }))} placeholder="Enter reason for rejection" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p className="no-requests">No requests assigned.</p>}
            </div>
          )}

          {activeSection === 'notifications' && showNotifications && (
            <div className="assets-section">
              <div className="section-header"><span className="back-arrow" onClick={() => setShowNotifications(false)}>⬅</span><h2>Notifications</h2></div>
              {loadingNotifications ? <p>Loading notifications...</p> : notifications.length > 0 ? (
                <div className="assets-grid">
                  {notifications.filter((n: any) => n.username === username).map((notif: any, index: number) => (
                    <div key={notif._id || `notif-${index}`} className="asset-card">
                      <p>{notif.message || 'No message'}</p>
                      <p>Timestamp: {notif.timestamp ? new Date(notif.timestamp).toLocaleString() : 'N/A'}</p>
                    </div>
                  ))}
                </div>
              ) : <p>No notifications available for HOD.</p>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

