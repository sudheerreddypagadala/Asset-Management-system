"use client";

import React, { useState } from "react";

const BASIC_URL = process.env.NEXT_PUBLIC_BASIC_URL || "";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    userType: "user",
    departmentid: "",
    departmentname: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    const payload = {
      email: formData.email,
      username: formData.username,
      password: formData.password,
      userType: formData.userType,
      departmentid: formData.departmentid,
      departmentname: formData.departmentname,
    };

    try {
      const response = await fetch(`${BASIC_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Registration failed");
      alert(`Registration successful as ${formData.userType}!`);
      setFormData({
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        userType: "user",
        departmentid: "",
        departmentname: "",
      });
    } catch (error: any) {
      alert(`An error occurred while registering: ${error.message}`);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="register-header">
          <img src="/logo.png" alt="Asset Manager Logo" className="register-logo" />
          <h1>Asset Manager</h1>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email" required />
          </div>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} placeholder="Enter username" required />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter password" required />
          </div>
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm password" required />
          </div>
          <div className="input-group">
            <label htmlFor="userType">Register as</label>
            <select id="userType" name="userType" value={formData.userType} onChange={handleChange}>
              <option value="user">User</option>
              <option value="hod">HOD</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="departmentid">Department ID</label>
            <input type="text" id="departmentid" name="departmentid" value={formData.departmentid} onChange={handleChange} placeholder="Enter department ID" required />
          </div>
          <div className="input-group">
            <label htmlFor="departmentname">Department Name</label>
            <input type="text" id="departmentname" name="departmentname" value={formData.departmentname} onChange={handleChange} placeholder="Enter department name" required />
          </div>
          <button type="submit" className="action-button">Sign Up</button>
        </form>
        <div className="extra-links" style={{ marginTop: "1rem" }}>
          <a href="/">Already have an account? Login</a>
        </div>
      </div>
    </div>
  );
}

