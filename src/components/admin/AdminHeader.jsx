import React, { useState } from 'react';
import { Menu, Bell, User, LogOut, ShieldCheck, Settings, ChevronDown } from 'lucide-react';

export default function AdminHeader({ title, subtitle, user, onToggleMobile, onLogout }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const isSuper = user?.role === 'SUPER_ADMIN';

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button className="admin-mobile-toggle" onClick={onToggleMobile} aria-label="Toggle Navigation">
          <Menu size={22} />
        </button>
        <div>
          <h1 className="admin-header-title">{title || 'MCC MRF Innovation Park'}</h1>
        </div>
      </div>

      <div className="admin-header-right">
        {/* User Avatar & Profile Dropdown */}
        <div
          className="admin-user-profile"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <div className="admin-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="admin-user-info">
            <span className="admin-user-name">
              Welcome, {isSuper ? 'Super Admin' : (user?.name || 'Admin')}
            </span>
          </div>
          <ChevronDown size={16} color="var(--admin-text-secondary)" />

          {/* Profile Dropdown Menu */}
          {showDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.75rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--admin-border)',
                borderRadius: 'var(--admin-radius-md)',
                boxShadow: 'var(--admin-shadow-lg)',
                minWidth: '200px',
                zIndex: 1100,
                padding: '0.5rem 0'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--admin-border)',
                  fontSize: '0.85rem'
                }}
              >
                <strong>{user?.name || (isSuper ? 'Super Admin' : 'Admin')}</strong>
                <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem' }}>
                  {isSuper ? 'Full System Privileges' : 'Operational Operations'}
                </div>
              </div>

              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.65rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.88rem',
                  color: 'var(--admin-text-main)',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setShowDropdown(false);
                  window.location.href = '/admin/settings';
                }}
              >
                <Settings size={16} />
                <span>Account Settings</span>
              </button>

              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.65rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.88rem',
                  color: 'var(--admin-danger)',
                  cursor: 'pointer',
                  borderTop: '1px solid var(--admin-border)'
                }}
                onClick={() => {
                  setShowDropdown(false);
                  onLogout();
                }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
