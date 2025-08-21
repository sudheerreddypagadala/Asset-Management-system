"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BASIC_URL = process.env.NEXT_PUBLIC_BASIC_URL || "";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const storedUserType = sessionStorage.getItem("userType");
    const storedToken = sessionStorage.getItem("token");
    if (storedUserType && storedToken) {
      if (storedUserType === "admin") router.replace("/dashboard");
      else if (storedUserType === "hod") router.replace("/hod-dashboard");
      else router.replace("/user-dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (username === "admin" && password === "admin123") {
      sessionStorage.setItem("userType", "admin");
      sessionStorage.setItem("username", "admin");
      sessionStorage.setItem("token", "hardcoded-admin-token");
      sessionStorage.removeItem("departmentid");
      router.push("/dashboard");
      return;
    }

    try {
      const response = await fetch(`${BASIC_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
      }
      const result = await response.json();

      sessionStorage.setItem("username", result.username || username);
      sessionStorage.setItem("userType", result.userType);
      sessionStorage.setItem("token", result.token);
      if (result.departmentid != null) {
        sessionStorage.setItem("departmentid", String(result.departmentid));
      }

      const redirectPath =
        result.userType === "admin"
          ? "/dashboard"
          : result.userType === "hod"
          ? "/hod-dashboard"
          : "/user-dashboard";
      router.push(redirectPath);
    } catch (error: any) {
      alert(`Login failed: ${error.message}`);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/logo.png" alt="Asset Manager Logo" className="login-logo" />
          <h1>Asset Manager</h1>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="action-button">Login</button>
        </form>
        <div className="extra-links" style={{ marginTop: "1rem" }}>
          <a href="/register">Sign Up</a>
        </div>
      </div>
    </div>
  );
}
