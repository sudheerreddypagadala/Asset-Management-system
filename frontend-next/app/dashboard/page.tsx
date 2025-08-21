"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

const BASIC_URL = process.env.NEXT_PUBLIC_BASIC_URL || "";

type Asset = any;
type User = any;
type Request = any;
type IssueReport = any;
type Notification = any;

export default function AdminDashboardPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<{ hods: User[]; users: User[] }>({ hods: [], users: [] });
  const [requests, setRequests] = useState<Request[]>([]);
  const [issueReports, setIssueReports] = useState<IssueReport[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeSection, setActiveSection] = useState<string>("home");
  const [showAssetDetails, setShowAssetDetails] = useState<boolean>(false);
  const [showAddAssetPopup, setShowAddAssetPopup] = useState<boolean>(false);
  const [showAddUserPopup, setShowAddUserPopup] = useState<boolean>(false);
  const [showAssignAssetPopup, setShowAssignAssetPopup] = useState<boolean>(false);
  const [showRequests, setShowRequests] = useState<boolean>(false);
  const [showReports, setShowReports] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showMaintenance, setShowMaintenance] = useState<boolean>(false);
  const [newAsset, setNewAsset] = useState<any>({ name: "", type: "", brand: "", model: "", dateOfBuying: "", status: "Available", departmentid: "" });
  const [newUser, setNewUser] = useState<any>({ email: "", username: "", password: "", role: "user", departmentid: "", departmentname: "" });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [rejectionComments, setRejectionComments] = useState<Record<string, string>>({});
  const [showRejectCommentBox, setShowRejectCommentBox] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>("all");

  const [username, setUsername] = useState<string>("Admin");
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [departmentid, setDepartmentId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUsername(sessionStorage.getItem("username") || "Admin");
    setToken(sessionStorage.getItem("token"));
    setUserType(sessionStorage.getItem("userType"));
    setDepartmentId(sessionStorage.getItem("departmentid"));
  }, []);

  useEffect(() => {
    if (!token) {
      setError("No authentication token. Please log in again.");
      router.replace("/");
      return;
    }
    if (userType !== "admin") {
      setError("Unauthorized access. Only admins can view this dashboard.");
      router.replace("/");
      return;
    }
    fetchAssets();
    fetchUsers();
    fetchRequests();
    fetchIssueReports();
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userType]);

  const normalizeAssetName = (name: string) => {
    if (!name) return "";
    const lower = name.toLowerCase();
    if (lower.endsWith("es")) return lower.slice(0, -2);
    if (lower.endsWith("s")) return lower.slice(0, -1);
    return lower;
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASIC_URL}/api/assets`, { headers: { "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASIC_URL}/api/all-users`, { headers: { "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const usersWithAssets = await Promise.all(
        [...(data.hods || []), ...(data.users || [])].map(async (u: any) => {
          const ar = await fetch(`${BASIC_URL}/api/assets?userId=${u._id}`, { headers: { "x-auth-token": token as string } });
          if (!ar.ok) return { ...u, assignedAssets: [] };
          const assets = await ar.json();
          return { ...u, assignedAssets: assets.map((a: any) => ({ assetId: a._id, assetCode: a.assetCode, assetName: a.name, assetModel: a.model })) };
        })
      );
      setUsers({ hods: usersWithAssets.filter((u) => u.role === "hod"), users: usersWithAssets.filter((u) => u.role === "user") });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASIC_URL}/api/asset-requests?status=HOD%20Approved`, { headers: { "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssueReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASIC_URL}/api/issue-reports`, { headers: { "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIssueReports(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASIC_URL}/api/notifications`, { headers: { "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const assetNames = useMemo(() => {
    const map = new Map<string, string>();
    assets.forEach((a: any) => {
      if (a?.name) {
        const normalized = normalizeAssetName(a.name);
        if (!map.has(normalized)) map.set(normalized, a.name);
      }
    });
    return [...map.entries()].map(([normalizedName, displayName]) => ({ normalizedName, displayName })).sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
  }, [assets]);

  const filteredAssets = useMemo(() => (sortOption === "all" ? assets : assets.filter((a: any) => normalizeAssetName(a.name) === sortOption)), [assets, sortOption]);

  const goHome = () => router.push("/");

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo-container">
          <img src="/logo.png" alt="Asset Manager Logo" className="dashboard-logo" />
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
        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loading">Loading...</div>}
        <aside className="sidebar">
          <button className={`home-button ${activeSection === "home" ? "active" : ""}`} onClick={() => setActiveSection("home")}>
            <span className="home-icon">🏠</span> Home
          </button>
          <nav>
            <button className={`sidebar-button ${activeSection === "assets" ? "active" : ""}`} onClick={() => { setActiveSection("assets"); setShowAssetDetails(true); fetchAssets(); }}>📋 Asset Details</button>
            <button className={`sidebar-button ${activeSection === "users" ? "active" : ""}`} onClick={() => { setActiveSection("users"); fetchUsers(); }}>👥 Users</button>
            <button className={`sidebar-button ${activeSection === "requests" ? "active" : ""}`} onClick={() => { setActiveSection("requests"); setShowRequests(true); fetchRequests(); }}>📥 User Requests</button>
            <button className={`sidebar-button ${activeSection === "reports" ? "active" : ""}`} onClick={() => { setActiveSection("reports"); setShowReports(true); fetchIssueReports(); }}>⚠️ Issue Reports</button>
            <button className={`sidebar-button ${activeSection === "maintenance" ? "active" : ""}`} onClick={() => { setActiveSection("maintenance"); fetchAssets(); }}>🔧 Maintenance</button>
            <button className={`sidebar-button ${activeSection === "notifications" ? "active" : ""}`} onClick={() => { setActiveSection("notifications"); setShowNotifications(true); fetchNotifications(); }}>🔔 Notifications</button>
            <button className="sidebar-button" onClick={() => setShowAddAssetPopup(true)}>➕ Add Asset</button>
            <button className="sidebar-button" onClick={() => setShowAddUserPopup(true)}>➕ Add User</button>
          </nav>
        </aside>
        <main className="main-content">
          {activeSection === "home" && (
            <div className="assets-section">
              <h2>Admin Dashboard</h2>
              <p>Welcome, {username}! Manage assets, users, requests, and issue reports from the sidebar.</p>
            </div>
          )}

          {showAssetDetails && activeSection === "assets" && (
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
                    <select id="sort" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                      <option value="all">All Assets</option>
                      {assetNames.map(({ normalizedName, displayName }) => (
                        <option key={normalizedName} value={normalizedName}>{displayName.charAt(0).toUpperCase() + displayName.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  {filteredAssets.length > 0 ? (
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
                            {asset.assignedTo && (<><p>Assigned To: {asset.assignedTo.username}</p><p>User ID: {asset.assignedTo.userId}</p></>)}
                          </div>
                          <button className="delete-button" onClick={async () => {
                            if (!confirm(`Delete asset ${asset.name} (${asset.assetCode})?`)) return;
                            setLoading(true);
                            try {
                              const res = await fetch(`${BASIC_URL}/api/assets/${asset._id}`, { method: "DELETE", headers: { "x-auth-token": token as string } });
                              if (!res.ok) throw new Error(`HTTP ${res.status}`);
                              await fetchAssets();
                              await fetchNotifications();
                            } catch (e: any) { setError(e.message); } finally { setLoading(false); }
                          }}>Delete</button>
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

          {activeSection === "users" && !showAssetDetails && (
            <div className="assets-section">
              <div className="section-header">
                <span className="back-arrow" onClick={() => setActiveSection("home")}>⬅</span>
                <h2>Users</h2>
              </div>
              {loading ? (
                <p>Loading users...</p>
              ) : users.hods.length > 0 || users.users.length > 0 ? (
                <div className="assets-grid">
                  {[...users.hods, ...users.users].map((user: any) => (
                    <div key={user._id} className="user-card-container">
                      <div id={`details-card-${user._id}`} className="details-card" onClick={() => {
                        const section = document.getElementById(`assets-details-${user._id}`);
                        if (section) section.classList.toggle("show");
                        setSelectedUser(user);
                      }}>
                        <h3>{user.username}</h3>
                        <p>Email: {user.email}</p>
                        <p>Role: {user.role}</p>
                        <p>Department: {user.departmentname || "N/A"}</p>
                      </div>
                      <div id={`assets-details-${user._id}`} className="assignment-cards hidden">
                        <p>Assigned Assets: </p>
                        {assets && assets.filter((a: any) => a.assignedTo && a.assignedTo.userId === user._id).length > 0 ? (
                          assets.filter((a: any) => a.assignedTo && a.assignedTo.userId === user._id).map((asset: any) => (
                            <div key={asset._id} style={{ marginBottom: "1rem" }}>
                              <p style={{ margin: 0 }}>{asset.name}</p>
                              <p style={{ margin: 0 }}>{asset.assetCode}</p>
                              <button className="remove-button" onClick={async () => {
                                setLoading(true);
                                try {
                                  const res = await fetch(`${BASIC_URL}/api/assign-asset`, { method: "POST", headers: { "Content-Type": "application/json", "x-auth-token": token as string }, body: JSON.stringify({ userId: user._id, assetId: asset._id, action: "remove" }) });
                                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                  await fetchUsers();
                                  await fetchAssets();
                                  await fetchNotifications();
                                } catch (e: any) { setError(e.message); } finally { setLoading(false); }
                              }}>Remove</button>
                            </div>
                          ))
                        ) : (
                          <span>None</span>
                        )}
                        <button className="assign-button" onClick={() => setShowAssignAssetPopup(true)}>Assign Asset</button>
                        <button className="delete-button" onClick={async () => {
                          if (!confirm(`Delete user ${user.username}?`)) return;
                          setLoading(true);
                          try {
                            const res = await fetch(`${BASIC_URL}/api/users/${user._id}`, { method: "DELETE", headers: { "x-auth-token": token as string } });
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            await fetchUsers();
                            await fetchNotifications();
                          } catch (e: any) { setError(e.message); } finally { setLoading(false); }
                        }}>Delete User</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No users found.</p>
              )}
            </div>
          )}

          {activeSection === "requests" && showRequests && (
            <div className="request-container">
              <div className="header-section">
                <span className="return-arrow" onClick={() => setShowRequests(false)}>←</span>
                <h2 className="section-title">User Requests</h2>
              </div>
              {loading ? (
                <p className="loading-text">Loading requests...</p>
              ) : requests.length > 0 ? (
                <div className="requests-grid">
                  {requests.map((request: any) => (
                    <div key={request._id} className="request-card">
                      <h3 className="request-user">User: {request.username}</h3>
                      <p className="request-asset">Asset: {request.assetCode}</p>
                      <p className="request-status">Status: {request.status || "HOD Approved"}</p>
                      <p className="request-time">Time: {new Date(request.timestamp).toLocaleString()}</p>
                      {request.status === "HOD Approved" && (
                        <>
                          <button className="btn-approve" onClick={async () => {
                            setLoading(true);
                            try {
                              const res = await fetch(`${BASIC_URL}/api/assign-user-asset`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-auth-token": token as string }, body: JSON.stringify({ userId: request.userId, username: request.username, assetCode: request.assetCode, assetName: request.assetName, assetModel: request.assetModel, assetId: request.assetId, action: "add" }) });
                              if (!res.ok) throw new Error(`HTTP ${res.status}`);
                              const rr = await fetch(`${BASIC_URL}/api/asset-requests/${request._id}`, { method: "PUT", headers: { "Content-Type": "application/json", "x-auth-token": token as string }, body: JSON.stringify({ status: "Admin Approved" }) });
                              if (!rr.ok) throw new Error(`HTTP ${rr.status}`);
                              await fetchRequests();
                              await fetchAssets();
                              await fetchUsers();
                              await fetchNotifications();
                            } catch (e: any) { setError(e.message); } finally { setLoading(false); }
                          }}>Approve</button>
                          <button className="btn-reject" onClick={() => setShowRejectCommentBox((prev) => ({ ...prev, [request._id]: true }))}>Reject</button>
                          <div className="comment-box">
                            <label htmlFor={`comment-${request._id}`} className="comment-label">Rejection Reason</label>
                            <textarea id={`comment-${request._id}`} className="comment-input" value={rejectionComments[request._id] || ""} onChange={(e) => setRejectionComments((prev) => ({ ...prev, [request._id]: e.target.value }))} placeholder="Enter reason for rejection" />
                            {showRejectCommentBox[request._id] && (
                              <button className="btn-reject" onClick={async () => {
                                setLoading(true);
                                try {
                                  const rr = await fetch(`${BASIC_URL}/api/asset-requests/${request._id}`, { method: "PUT", headers: { "Content-Type": "application/json", "x-auth-token": token as string }, body: JSON.stringify({ status: "Admin Rejected", rejectionComments: rejectionComments[request._id] || "" }) });
                                  if (!rr.ok) throw new Error(`HTTP ${rr.status}`);
                                  setRejectionComments((prev) => ({ ...prev, [request._id]: "" }));
                                  await fetchRequests();
                                } catch (e: any) { setError(e.message); } finally { setLoading(false); }
                              }}>Confirm Reject</button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-requests">No requests found.</p>
              )}
            </div>
          )}

          {activeSection === "notifications" && showNotifications && (
            <div className="assets-section">
              <div className="section-header">
                <span className="back-arrow" onClick={() => setShowNotifications(false)}>⬅</span>
                <h2>Notifications</h2>
              </div>
              {loading ? (
                <p>Loading notifications...</p>
              ) : notifications.filter((n: any) => n.username === username).length > 0 ? (
                <div className="assets-grid">
                  {notifications.filter((n: any) => n.username === username).map((notif: any, index: number) => (
                    <div key={notif._id || `notif-${index}`} className="asset-card">
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
        </main>
      </div>
    </div>
  );
}

