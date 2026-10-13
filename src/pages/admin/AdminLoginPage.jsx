import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Lock, User, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiConfig';
import '../../styles/admin.css';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect to admin dashboard
    const storedUser = localStorage.getItem('adminUser');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u && u.role) {
          navigate('/admin/dashboard');
        }
      } catch (e) { }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const loginId = username.trim();
    const loginPass = password;

    if (!loginId || !loginPass) {
      setErrorMsg('Please enter both Username/Email and Password.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginId, password: loginPass })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success && data.user) {
        localStorage.setItem('adminToken', data.token || 'mock_admin_jwt_2026');
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        sessionStorage.setItem('adminToken', data.token || 'mock_admin_jwt_2026');
        sessionStorage.setItem('adminUser', JSON.stringify(data.user));
        navigate('/admin/dashboard');
      } else {
        setErrorMsg(data.message || 'Invalid Admin Credentials. Please check username and password.');
      }
    } catch (err) {
      console.warn('Backend server offline, executing offline fallback authentication:', err);

      // Offline Fallback Authentication
      if (
        (loginId === 'MCCMRFIP@super' || loginId === 'superadmin@mccmrfip.com') &&
        (loginPass === 'super2024')
      ) {
        const superUser = {
          id: 1,
          name: 'Super Admin',
          username: 'MCCMRFIP@super',
          email: 'superadmin@mccmrfip.com',
          role: 'SUPER_ADMIN',
          role_id: 1
        };
        localStorage.setItem('adminToken', 'super_admin_jwt_token_2026');
        localStorage.setItem('adminUser', JSON.stringify(superUser));
        sessionStorage.setItem('adminToken', 'super_admin_jwt_token_2026');
        sessionStorage.setItem('adminUser', JSON.stringify(superUser));
        setLoading(false);
        navigate('/admin/dashboard');
        return;
      }

      if (
        (loginId === 'MCCMRFIP@admin' || loginId === 'admin@mccmrfip.com') &&
        (loginPass === 'Novara2024')
      ) {
        const adminUser = {
          id: 2,
          name: 'Admin',
          username: 'MCCMRFIP@admin',
          email: 'admin@mccmrfip.com',
          role: 'ADMIN',
          role_id: 2
        };
        localStorage.setItem('adminToken', 'admin_jwt_token_2026');
        localStorage.setItem('adminUser', JSON.stringify(adminUser));
        sessionStorage.setItem('adminToken', 'admin_jwt_token_2026');
        sessionStorage.setItem('adminUser', JSON.stringify(adminUser));
        setLoading(false);
        navigate('/admin/dashboard');
        return;
      }

      setLoading(false);
      setErrorMsg('Invalid Admin Credentials. Please check username and password.');
    }
  };

  return (
    <div className="portal-login-screen" style={{ backgroundColor: 'var(--admin-bg-main)' }}>
      {/* Top Navbar */}
      <header className="portal-login-nav" style={{ backgroundColor: 'var(--admin-primary-dark)' }}>
        <div className="container portal-nav-container">
          <Link to="/" className="portal-brand-link">
            <img src="/mcc-crest-transparent.png" alt="MCC Emblem" className="portal-logo-img" />
            <div className="portal-brand-titles">
              <span className="portal-title-main" style={{ color: '#FFFFFF' }}>MCC-MRF INNOVATION PARK</span>
              <span className="portal-title-sub" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Admin & Super Admin Portal
              </span>
            </div>
          </Link>

          <Link to="/" className="back-to-home-btn" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}>
            <ArrowLeft size={16} />
            <span>Back to Main Website</span>
          </Link>
        </div>
      </header>

      {/* Main Admin Login Card */}
      <main className="portal-login-main">
        <div className="container portal-login-container">
          <div className="portal-login-card" style={{ maxWidth: '440px', boxShadow: 'var(--admin-shadow-lg)' }}>
            <div className="card-top-accent" style={{ background: 'linear-gradient(90deg, #650000 0%, #8B0000 100%)' }} />

            <div className="portal-card-header">
              <div className="card-logo-badge" style={{ backgroundColor: 'var(--admin-primary-soft)' }}>
                <ShieldCheck size={28} color="var(--admin-primary)" />
              </div>
              <h2 className="card-login-title" style={{ color: 'var(--admin-primary)' }}>
                Admin System Sign In
              </h2>
              <p className="card-login-sub">
                Enter your Administrator or Super Administrator credentials
              </p>
            </div>

            <div className="portal-card-body">
              {errorMsg && (
                <div className="portal-error-alert" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', borderColor: '#FCA5A5' }}>
                  <AlertTriangle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form className="portal-form" onSubmit={handleSubmit}>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="admin-username">
                    Username / Admin Email
                  </label>
                  <div className="input-with-icon">
                    <User className="input-icon" size={18} />
                    <input
                      id="admin-username"
                      type="text"
                      className="portal-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter admin username or email"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="admin-password">
                    Password
                  </label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="admin-password"
                      type="password"
                      className="portal-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter admin password"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="portal-submit-btn"
                  style={{ backgroundColor: 'var(--admin-primary)' }}
                  disabled={loading}
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In to Admin Panel'}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="portal-minimal-footer">
        <div className="container portal-copyright-container">
          <CheckCircle2 size={16} className="copyright-shield" color="var(--admin-primary)" />
          <span>© 2025 MCC-MRF Innovation Park Admin Portal. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
