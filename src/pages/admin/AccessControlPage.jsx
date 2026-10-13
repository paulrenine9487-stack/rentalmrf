import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Plus, Edit2, Trash2, Key, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { API_BASE_URL } from '../../utils/apiConfig';

export default function AccessControlPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role_id: 2,
    status: 'Active'
  });

  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccessData();
  }, []);

  const fetchAccessData = async () => {
    const token = localStorage.getItem('adminToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users`, { headers }),
        fetch(`${API_BASE_URL}/api/roles`, { headers }),
        fetch(`${API_BASE_URL}/api/permissions`, { headers })
      ]);

      const uData = await usersRes.json();
      const rData = await rolesRes.json();
      const pData = await permsRes.json();

      if (uData.success) setUsers(uData.users || []);
      if (rData.success) setRoles(rData.roles || []);
      if (pData.success) setPermissions(pData.permissions || []);
    } catch (err) {
      console.warn('Backend connection issue:', err);
    }
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlertMsg({ type: '', text: '' });

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setAlertMsg({ type: 'success', text: 'User created successfully!' });
        fetchAccessData();
        setTimeout(() => setShowAddUserModal(false), 1200);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to create user.' });
      }
    } catch (err) {
      setSubmitting(false);
      setAlertMsg({ type: 'error', text: 'Network connection error.' });
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlertMsg({ type: '', text: '' });

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setAlertMsg({ type: 'success', text: 'User updated successfully!' });
        fetchAccessData();
        setTimeout(() => setShowEditUserModal(false), 1200);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to update user.' });
      }
    } catch (err) {
      setSubmitting(false);
      setAlertMsg({ type: 'error', text: 'Network connection error.' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    setSubmitting(true);

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setShowDeleteModal(false);
        fetchAccessData();
      } else {
        alert(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      setSubmitting(false);
      alert('Error deleting user.');
    }
  };

  return (
    <AdminLayout
      title="Access Control & Security"
      subtitle="Super Admin User Management, Role Assignments & Permission Matrix."
    >
      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          className={`admin-btn ${activeTab === 'users' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>System Users</span>
        </button>

        <button
          className={`admin-btn ${activeTab === 'roles' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setActiveTab('roles')}
        >
          <ShieldCheck size={16} />
          <span>Roles & Hierarchy</span>
        </button>

        <button
          className={`admin-btn ${activeTab === 'permissions' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setActiveTab('permissions')}
        >
          <Key size={16} />
          <span>Permissions Matrix</span>
        </button>
      </div>

      {/* 1. USERS TAB */}
      {activeTab === 'users' && (
        <>
          <div className="admin-table-toolbar" style={{ borderRadius: 'var(--admin-radius-lg)', marginBottom: '1.25rem' }}>
            <h3 className="admin-card-title">User Accounts</h3>
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => {
                setFormData({
                  name: '',
                  email: '',
                  username: '',
                  password: '',
                  role_id: 2,
                  status: 'Active'
                });
                setAlertMsg({ type: '', text: '' });
                setShowAddUserModal(true);
              }}
            >
              <Plus size={18} />
              <span>Create User Account</span>
            </button>
          </div>

          <div className="admin-table-wrapper">
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User Name</th>
                    <th>Email Address</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td><strong>#{u.id}</strong></td>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td><code>{u.username || u.email}</code></td>
                        <td>
                          <span className={`admin-role-badge ${u.role_name === 'SUPER_ADMIN' ? 'super' : 'admin'}`}>
                            {u.role_name === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge ${u.status === 'Active' ? 'approved' : 'rejected'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                            <button
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setFormData({
                                  name: u.name,
                                  email: u.email,
                                  username: u.username || u.email,
                                  password: '',
                                  role_id: u.role_id || 2,
                                  status: u.status || 'Active'
                                });
                                setAlertMsg({ type: '', text: '' });
                                setShowEditUserModal(true);
                              }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setShowDeleteModal(true);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                        No user accounts configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 2. ROLES TAB */}
      {activeTab === 'roles' && (
        <div className="admin-table-wrapper">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Role ID</th>
                  <th>Role Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td><strong>#{r.id}</strong></td>
                    <td>
                      <span className={`admin-role-badge ${r.name === 'SUPER_ADMIN' ? 'super' : 'admin'}`}>
                        {r.name}
                      </span>
                    </td>
                    <td>{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PERMISSIONS TAB */}
      {activeTab === 'permissions' && (
        <div className="admin-table-wrapper">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Permission Key</th>
                  <th>Description</th>
                  <th>SUPER_ADMIN</th>
                  <th>ADMIN</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => {
                  const isAdminAllowed = ['company.view', 'company.update', 'payment.view', 'report.view', 'report.export', 'place.view'].includes(p.permission_key);
                  return (
                    <tr key={p.id}>
                      <td><code style={{ color: 'var(--admin-primary)', fontWeight: 700 }}>{p.permission_key}</code></td>
                      <td>{p.description}</td>
                      <td>
                        <span className="admin-badge approved">YES</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${isAdminAllowed ? 'approved' : 'rejected'}`}>
                          {isAdminAllowed ? 'YES (RESTRICTED)' : 'NO (403 FORBIDDEN)'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="profile-modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Create User Account</h3>
              <button className="profile-modal-close" onClick={() => setShowAddUserModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddUserSubmit}>
              <div className="profile-modal-body">
                {alertMsg.text && (
                  <div className={`profile-modal-alert ${alertMsg.type}`}>
                    {alertMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{alertMsg.text}</span>
                  </div>
                )}
                <div className="profile-field-group">
                  <label className="profile-field-label">Full Name *</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Email Address *</label>
                  <input
                    type="email"
                    className="profile-field-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value, username: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Password *</label>
                  <input
                    type="password"
                    className="profile-field-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Role</label>
                  <select
                    className="profile-field-input"
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                  >
                    <option value={1}>SUPER_ADMIN (Full Access)</option>
                    <option value={2}>ADMIN (Restricted Access)</option>
                  </select>
                </div>
              </div>
              <hr className="profile-modal-divider" />
              <div className="profile-modal-footer">
                <button type="button" className="profile-cancel-btn" onClick={() => setShowAddUserModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="profile-update-btn" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditUserModal && (
        <div className="profile-modal-overlay" onClick={() => setShowEditUserModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Edit User Account</h3>
              <button className="profile-modal-close" onClick={() => setShowEditUserModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditUserSubmit}>
              <div className="profile-modal-body">
                {alertMsg.text && (
                  <div className={`profile-modal-alert ${alertMsg.type}`}>
                    {alertMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{alertMsg.text}</span>
                  </div>
                )}
                <div className="profile-field-group">
                  <label className="profile-field-label">Full Name *</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Email Address *</label>
                  <input
                    type="email"
                    className="profile-field-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">New Password (Leave blank to keep current)</label>
                  <input
                    type="password"
                    className="profile-field-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Role</label>
                  <select
                    className="profile-field-input"
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                  >
                    <option value={1}>SUPER_ADMIN</option>
                    <option value={2}>ADMIN</option>
                  </select>
                </div>
              </div>
              <hr className="profile-modal-divider" />
              <div className="profile-modal-footer">
                <button type="button" className="profile-cancel-btn" onClick={() => setShowEditUserModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="profile-update-btn" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER MODAL */}
      {showDeleteModal && (
        <div className="profile-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header" style={{ backgroundColor: '#DC2626' }}>
              <h3>Delete User Account?</h3>
              <button className="profile-modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="profile-modal-body" style={{ textAlign: 'center' }}>
              <AlertTriangle size={44} color="#DC2626" style={{ margin: '0 auto 1rem auto' }} />
              <p style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>
                Are you sure you want to delete user <strong>"{selectedUser?.name}"</strong>?
              </p>
            </div>
            <hr className="profile-modal-divider" />
            <div className="profile-modal-footer">
              <button className="profile-cancel-btn" onClick={() => setShowDeleteModal(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="profile-update-btn" style={{ backgroundColor: '#DC2626' }} onClick={handleDeleteConfirm} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
