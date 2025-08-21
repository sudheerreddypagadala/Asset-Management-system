"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

const BASIC_URL = process.env.NEXT_PUBLIC_BASIC_URL || "";

export default function UserDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Guest");
  const [departmentid, setDepartmentId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setToken(sessionStorage.getItem("token"));
    setUsername(sessionStorage.getItem("username") || "Guest");
    setDepartmentId(sessionStorage.getItem("departmentid") || "");
  }, []);

  const [assets, setAssets] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showAssetDetailsPopup, setShowAssetDetailsPopup] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedAssetCode, setSelectedAssetCode] = useState("");
  const [issueMessage, setIssueMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Unauthorized: No token provided");
      router.replace("/");
      return;
    }
    fetchAssets().catch((e) => setError(e.message));
    fetchAvailableAssets().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | undefined;
    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("qr-reader");
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            const assetCode = decodedText.split("Code:")[1]?.trim();
            if (!assetCode) {
              setError('Invalid QR code format. Expected "Code: <assetCode>"');
              if (html5QrCode && html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) await html5QrCode.stop();
              return;
            }
            try {
              const response = await fetch(`${BASIC_URL}/api/assets/${assetCode}`, { headers: { "x-auth-token": token as string } });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const asset = await response.json();
              setSelectedAsset(asset);
              setShowAssetDetailsPopup(true);
              setShowQRScanner(false);
              if (html5QrCode && html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) await html5QrCode.stop();
            } catch (err: any) {
              setError(`Failed to fetch asset: ${err.message}`);
              if (html5QrCode && html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) await html5QrCode.stop();
            }
          },
          (err) => { if ((err as any).name !== "NotFoundException") console.error("QR scan error:", err); }
        );
      } catch (err: any) {
        setError(`QR scanner initialization failed: ${err.message}`);
      }
    };

    if (showQRScanner) void startScanner();
    return () => { if (html5QrCode && html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) html5QrCode.stop().catch(() => {}); };
  }, [showQRScanner, token]);

  const fetchAssets = async () => {
    const res = await fetch(`${BASIC_URL}/api/user-assets`, { headers: { "x-auth-token": token as string } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setAssets(data);
  };

  const fetchAvailableAssets = async () => {
    const res = await fetch(`${BASIC_URL}/api/assets`, { headers: { "x-auth-token": token as string } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setAvailableAssets(data.filter((a: any) => a.status === "Available"));
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await fetch(`${BASIC_URL}/api/notifications`, { headers: { "Content-Type": "application/json", "x-auth-token": token as string } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotifications(data);
    } catch (e: any) { setError(e.message); } finally { setLoadingNotifications(false); }
  };

  const handleRequestAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAssetCode) return alert("Please select an asset");
    try {
      await fetch(`${BASIC_URL}/api/asset-requests`, { method: "POST", headers: { "Content-Type": "application/json", "x-auth-token": token as string }, body: JSON.stringify({ username, assetCode: selectedAssetCode, departmentid, status: "Pending" }) });
      await Promise.all([
        fetch(`${BASIC_URL}/api/notifications`, { method: "POST", headers: { "Content-Type": "application/json", "x-auth-token": token as string }, body: JSON.stringify({ username: "hod", message: `User ${username} requested asset ${selectedAssetCode}.`, departmentid }) }),
        fetch(`${BASIC_URL}/api/notifications`, { method: "POST", headers: { "Content-Type": "application/json", "x-auth-token": token as string }, body: JSON.stringify({ username: "admin", message: `User ${username} requested asset ${selectedAssetCode}.`, departmentid }) }),
      ]);
      alert("Asset request sent successfully to HOD and Admin!");
      setShowRequestPopup(false);
      setSelectedAssetCode("");
      fetchNotifications();
    } catch (err: any) { setError(err.message); }
  };

  const handleReportIssue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAsset || !issueMessage) return alert("Please provide an issue description");
    try {
      await fetch(`${BASIC_URL}/api/report-issue`, { method: "POST", headers: { "Content-Type": "application/json", "x-auth-token": token as string }, body: JSON.stringify({ username, assetCode: selectedAsset.assetCode, message: issueMessage, departmentid, status: "Pending" }) });
      await Promise.all([
        fetch(`${BASIC_URL}/api/notifications`, { method: "POST", headers: { "Content-Type": "application/json", "x-auth-token": token as string }, body: JSON.stringify({ username: "hod", message: `User ${username} reported an issue for asset ${selectedAsset.assetCode}: ${issueMessage}`, departmentid }) }),
        fetch(`${BASIC_URL}/api/notifications`, { method: "POST", headers: { "Content-Type": "application/json", "x-auth-token": token as string }, body: JSON.stringify({ username: "admin", message: `User ${username} reported an issue for asset ${selectedAsset.assetCode}: ${issueMessage}`, departmentid }) }),
      ]);
      alert("Issue reported successfully!");
      setShowAssetDetailsPopup(false);
      setSelectedAsset(null);
      setIssueMessage("");
      fetchNotifications();
    } catch (err: any) { setError(err.message); }
  };

  const filteredAssets = assets.filter((a: any) => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.assetCode.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo-container"><img src="/logo.png" alt="Asset Manager Logo" className="dashboard-logo" /></div>
        <div className="header-center"><h1>Asset Manager</h1><p className="tagline">User Dashboard</p></div>
        <div className="header-right">
          <input type="text" placeholder="Search assets..." className="search-bar" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <div className="user-profile" onClick={() => router.push("/")}>👤 {username}</div>
        </div>
      </header>
      <div className="dashboard-content">
        <aside className="sidebar">
          <nav>
            <button className="sidebar-button" onClick={() => { fetchAssets(); setShowNotifications(false); setSearchQuery(""); }}>📋 My Assets</button>
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
                  {notifications.filter((n: any) => n.username === username).map((n: any, idx: number) => (
                    <div key={idx} className="asset-card">
                      <p>{n.message}</p>
                      <p>{new Date(n.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (<p>No notifications available.</p>)
          ) : (
            <div className="assets-section">
              <h2>Dashboard</h2>
              {filteredAssets.length > 0 ? (
                <div className="assets-grid">
                  {filteredAssets.map((asset: any) => (
                    <div key={asset._id} className="asset-cards">
                      <h3>{asset.name}</h3>
                      <p>Asset Code: {asset.assetCode}</p>
                      <p>Status: {asset.status}</p>
                      {asset.qrCode && <img src={`${BASIC_URL}${asset.qrCode}`} alt="QR Code" style={{ width: "100px" }} />}
                      <button className="report-issue-button" onClick={() => { setSelectedAsset(asset); setShowAssetDetailsPopup(true); }}>Report Issue</button>
                    </div>
                  ))}
                </div>
              ) : (<p>{searchQuery ? 'No assets match your search.' : 'No assets assigned.'}</p>)}
            </div>
          )}

          {showQRScanner && (
            <div className="popup-overlay"><div className="popup-content"><div className="popup-header"><span className="back-arrow" onClick={() => setShowQRScanner(false)}>⬅</span><h2>Scan QR Code</h2></div><div id="qr-reader" style={{ width: "100%" }}></div></div></div>
          )}

          {showAssetDetailsPopup && selectedAsset && (
            <div className="popup-overlay">
              <div className="popup-content">
                <div className="popup-header"><span className="back-arrow" onClick={() => setShowAssetDetailsPopup(false)}>⬅</span><h2>Asset Details</h2></div>
                <div className="report-details">
                  <p><strong>Name:</strong> {selectedAsset.name}</p>
                  <p><strong>Asset Code:</strong> {selectedAsset.assetCode}</p>
                  <p><strong>Type:</strong> {selectedAsset.type}</p>
                  <p><strong>Brand:</strong> {selectedAsset.brand}</p>
                  <p><strong>Model:</strong> {selectedAsset.model}</p>
                  <p><strong>Status:</strong> {selectedAsset.status}</p>
                  {selectedAsset.qrCode && (<img src={`${BASIC_URL}${selectedAsset.qrCode}`} alt="QR Code" style={{ width: "100px" }} />)}
                  <form onSubmit={handleReportIssue}>
                    <label className="report-issue-label" htmlFor="issueMessage">Report Issue</label>
                    <textarea className="report-issues-textarea" id="issueMessage" value={issueMessage} onChange={(e) => setIssueMessage(e.target.value)} placeholder="Describe the issue" required />
                    <button type="submit" className="submit-button">Report Issue</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {showRequestPopup && (
            <div className="popup-overlay">
              <div className="popup-content">
                <div className="popup-header"><span className="back-arrow" onClick={() => setShowRequestPopup(false)}>⬅</span><h2>Request Asset</h2></div>
                <form onSubmit={(e) => handleRequestAsset(e)}>
                  <label htmlFor="assetSelect">Select Asset</label>
                  <select id="assetSelect" value={selectedAssetCode} onChange={(e) => setSelectedAssetCode(e.target.value)} required>
                    <option value="">Select an asset...</option>
                    {availableAssets.map((asset: any) => (<option key={asset._id} value={asset.assetCode}>{asset.name} ({asset.assetCode})</option>))}
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
}

