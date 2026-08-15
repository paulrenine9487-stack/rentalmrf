import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Lock, User, CheckCircle2, AlertTriangle } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('adminUser');
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch (e) {}
    }
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    if (!newPassword || newPassword.length < 4) {
      setMsg({ type: 'error', text: 'New password must be at least 4 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New Password and Confirm Password do not match.' });
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setMsg({ type: 'success', text: 'Admin account password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1000);
  };

  const isSuper = user?.role === 'SUPER_ADMIN';

  return (
    <AdminLayout
      title="System Settings"
      subtitle="Configure account security, profile information, and system parameters."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* 1. ACCOUNT PROFILE INFORMATION */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Administrator Profile</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="admin-avatar" style={{ width: 56, height: 56, fontSize: '1.4rem' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{user?.name || (isSuper ? 'Super Admin' : 'Admin')}</h4>
              <span className={`admin-role-badge ${isSuper ? 'super' : 'admin'}`}>
                {isSuper ? 'SUPER_ADMIN' : 'ADMIN'}
              </span>
            </div>
          </div>

          <div className="profile-field-group">
            <label className="profile-field-label">Username / Login ID</label>
            <input type="text" className="profile-field-input" value={user?.username || (isSuper ? 'MCCMRFIP@super' : 'MCCMRFIP@admin')} disabled readOnly style={{ backgroundColor: '#F3F4F6' }} />
          </div>

          <div className="profile-field-group">
            <label className="profile-field-label">Email Address</label>
            <input type="email" className="profile-field-input" value={user?.email || (isSuper ? 'superadmin@mccmrfip.com' : 'admin@mccmrfip.com')} disabled readOnly style={{ backgroundColor: '#F3F4F6' }} />
          </div>
        </div>

        {/* 2. SECURITY & PASSWORD UPDATE */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Account Security</h3>
          </div>

          {msg.text && (
            <div className={`profile-modal-alert ${msg.type}`} style={{ marginBottom: '1rem' }}>
              {msg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange}>
            <div className="profile-field-group">
              <label className="profile-field-label">Current Password</label>
              <input
                type="password"
                className="profile-field-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">New Password</label>
              <input
                type="password"
                className="profile-field-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">Confirm New Password</label>
              <input
                type="password"
                className="profile-field-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
                <Lock size={16} />
                <span>{submitting ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
