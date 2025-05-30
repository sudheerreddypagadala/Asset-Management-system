
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../css/Login.css';
import logo from '../assets/logo.png';
const BASIC_URL = import.meta.env.VITE_REACT_APP_BASIC_URL;

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { state } = location;
    if (state?.userType) {
      if (state.userType === 'admin') {
        navigate('/dashboard', { state });
      } else if (state.userType === 'hod') {
        navigate('/hod-dashboard', { state });
      } else {
        navigate('/user-dashboard', { state });
      }
    }
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Hardcode admin login
    if (username === 'admin' && password === 'admin123') {
      const state = {
        userType: 'admin',
        departmentid: null,
        token: 'hardcoded-admin-token',
        username: 'admin',
      };
      navigate('/dashboard', { state });
      return;
    }

    try {
      const response = await fetch(`${BASIC_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
      }
      const result = await response.json();

      if (response.ok) {
        sessionStorage.setItem('username', result.username);
        alert(`Logged in as ${result.userType}`);
        const redirectPath =
          result.userType === 'admin' ? '/dashboard' :
          result.userType === 'hod' ? '/hod-dashboard' :
          '/user-dashboard';
        navigate(redirectPath, {
          state: {
            userType: result.userType,
            departmentid: result.departmentid,
            token: result.token,
            username: result.username || username,
          },
        });
      }
    } catch (error) {
      console.error('Fetch error:', error.message);
      alert(`Login failed: ${error.message}`);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src={logo} alt="Asset Manager Logo" className="login-logo" onError={(e) => console.log('Logo error:', e)} />
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
      </div>
    </div>
  );
};

export default Login;