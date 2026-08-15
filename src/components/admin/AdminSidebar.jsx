import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  BarChart3,
  MapPin,
  ShieldCheck,
  Menu as MenuIcon,
  LayoutTemplate,
  Settings as SettingsIcon,
  LogOut,
  X
} from 'lucide-react';

export default function AdminSidebar({ userRole, mobileOpen, setMobileOpen, onLogout }) {
  const navigate = useNavigate();
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const closeMobile = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  const handleLogoutClick = () => {
    closeMobile();
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      navigate('/login');
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
          onClick={closeMobile}
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar Brand Header */}
        <div className="admin-sidebar-header">
          <img src="/mcc-crest-maroon.png" alt="MCC Crest" className="admin-sidebar-crest" />
          <div className="admin-sidebar-brand">
            <span className="admin-brand-title">MCC MRF</span>
            <span className="admin-brand-sub">
              {isSuperAdmin ? 'Super Admin' : 'Admin Portal'}
            </span>
          </div>
          {mobileOpen && (
            <button
              onClick={closeMobile}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: 'var(--admin-primary)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="admin-sidebar-nav">
          <span className="admin-nav-section-label">Main Operations</span>

          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <LayoutDashboard className="admin-nav-icon" size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/companies"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <Building2 className="admin-nav-icon" size={18} />
            <span>Companies</span>
          </NavLink>

          <NavLink
            to="/admin/payments"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <CreditCard className="admin-nav-icon" size={18} />
            <span>Payments</span>
          </NavLink>

          <NavLink
            to="/admin/reports"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <BarChart3 className="admin-nav-icon" size={18} />
            <span>Reports</span>
          </NavLink>

          <NavLink
            to="/admin/places"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <MapPin className="admin-nav-icon" size={18} />
            <span>Places</span>
          </NavLink>

          {/* SUPER ADMIN EXCLUSIVE MODULES */}
          {isSuperAdmin && (
            <>
              <span className="admin-nav-section-label" style={{ marginTop: '0.75rem' }}>
                System Control
              </span>

              <NavLink
                to="/admin/access-control"
                className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <ShieldCheck className="admin-nav-icon" size={18} />
                <span>Access Control</span>
              </NavLink>

              <NavLink
                to="/admin/menu-management"
                className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <MenuIcon className="admin-nav-icon" size={18} />
                <span>Menu Management</span>
              </NavLink>

              <NavLink
                to="/admin/footer-management"
                className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <LayoutTemplate className="admin-nav-icon" size={18} />
                <span>Footer Management</span>
              </NavLink>
            </>
          )}

          <span className="admin-nav-section-label" style={{ marginTop: '0.75rem' }}>
            Account & Preferences
          </span>

          <NavLink
            to="/admin/settings"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <SettingsIcon className="admin-nav-icon" size={18} />
            <span>Settings</span>
          </NavLink>
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="admin-sidebar-footer">
          <button className="admin-nav-item admin-logout-btn" onClick={handleLogoutClick}>
            <LogOut className="admin-nav-icon" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
