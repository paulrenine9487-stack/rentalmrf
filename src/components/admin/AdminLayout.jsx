import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import '../../styles/admin.css';

export default function AdminLayout({ children, title, subtitle }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Retrieve stored admin token & user info
    const storedUser = localStorage.getItem('adminUser');
    const token = localStorage.getItem('adminToken');

    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUser(u);
      } catch (e) {
        navigate('/Novara_admin');
      }
    } else {
      navigate('/Novara_admin');
    }
  }, [location.pathname, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUser');
    navigate('/Novara_admin');
  };

  const userRole = user?.role || 'SUPER_ADMIN';

  // BACKEND RBAC SECURITY FOR FRONTEND ROUTE PROTECTION:
  // If an Admin tries to access Super Admin exclusive paths, redirect or render HTTP 403 Forbidden!
  const isSuperAdminOnlyPath =
    location.pathname.includes('/admin/access-control') ||
    location.pathname.includes('/admin/menu-management') ||
    location.pathname.includes('/admin/footer-management');

  if (userRole === 'ADMIN' && isSuperAdminOnlyPath) {
    return (
      <div className="admin-shell">
        <AdminSidebar
          userRole={userRole}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          onLogout={handleLogout}
        />
        <div className="admin-body">
          <AdminHeader
            title="Access Denied"
            subtitle="HTTP 403 Forbidden"
            user={user}
            onToggleMobile={() => setMobileOpen(!mobileOpen)}
            onLogout={handleLogout}
          />
          <main className="admin-content">
            <div
              className="admin-card"
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                backgroundColor: '#FEF2F2',
                borderColor: '#FCA5A5'
              }}
            >
              <h2 style={{ color: '#DC2626', fontSize: '1.75rem', marginBottom: '0.75rem' }}>
                403 - Forbidden Access
              </h2>
              <p style={{ color: '#991B1B', fontSize: '1.05rem', marginBottom: '1.5rem' }}>
                You do not have permission to view or manage this Super Admin module.
              </p>
              <button className="admin-btn admin-btn-primary" onClick={() => navigate('/admin/dashboard')}>
                Return to Admin Dashboard
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      {/* Fixed Left Sidebar */}
      <AdminSidebar
        userRole={userRole}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={handleLogout}
      />

      {/* Main Body */}
      <div className="admin-body">
        {/* Sticky Top Header */}
        <AdminHeader
          title={title}
          subtitle={subtitle}
          user={user}
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
          onLogout={handleLogout}
        />

        {/* Scrollable Page Content */}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
