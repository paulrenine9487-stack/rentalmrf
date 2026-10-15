import React, { useState, useEffect } from 'react';
import { Menu as MenuIcon, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { notify } from '../../components/common/EnterpriseNotificationSystem';
import { API_BASE_URL } from '../../utils/apiConfig';

export default function MenuManagementPage() {
  const [menus, setMenus] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    url: '',
    parent_id: null,
    display_order: 1,
    status: 'Active'
  });

  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    const token = localStorage.getItem('adminToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${API_BASE_URL}/api/menus`, { headers });
      const data = await res.json();
      if (data.success) {
        setMenus(data.menus || []);
      }
    } catch (err) {
      console.warn('Backend connection error:', err);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlertMsg({ type: '', text: '' });

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/menus`, {
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
        setAlertMsg({ type: 'success', text: 'Menu item created successfully!' });
        fetchMenus();
        setTimeout(() => setShowAddModal(false), 1200);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to create menu.' });
      }
    } catch (err) {
      setSubmitting(false);
      setAlertMsg({ type: 'error', text: 'Network connection error.' });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlertMsg({ type: '', text: '' });

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/menus/${selectedMenu.id}`, {
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
        setAlertMsg({ type: 'success', text: 'Menu item updated successfully!' });
        fetchMenus();
        setTimeout(() => setShowEditModal(false), 1200);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to update menu.' });
      }
    } catch (err) {
      setSubmitting(false);
      setAlertMsg({ type: 'error', text: 'Network connection error.' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMenu) return;
    setSubmitting(true);

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/menus/${selectedMenu.id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setShowDeleteModal(false);
        notify.success('Menu item deleted successfully', 'Deleted');
        fetchMenus();
      } else {
        notify.error(data.message || 'Failed to delete menu.', 'Deletion Error');
      }
    } catch (err) {
      setSubmitting(false);
      notify.error('Error deleting menu.', 'Network Error');
    }
  };

  return (
    <AdminLayout
      title="Menu Management"
      subtitle="Super Admin Dynamic Public Website Header Navigation Management."
    >
      <div className="admin-table-toolbar" style={{ borderRadius: 'var(--admin-radius-lg)', marginBottom: '1.25rem' }}>
        <h3 className="admin-card-title">Website Navigation Menus</h3>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => {
            setFormData({
              title: '',
              url: '/',
              parent_id: null,
              display_order: menus.length + 1,
              status: 'Active'
            });
            setAlertMsg({ type: '', text: '' });
            setShowAddModal(true);
          }}
        >
          <Plus size={18} />
          <span>Add Menu Item</span>
        </button>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Menu Title</th>
                <th>URL Path</th>
                <th>Parent Menu</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {menus.length > 0 ? (
                menus.map((m) => (
                  <tr key={m.id}>
                    <td><strong>#{m.display_order || m.id}</strong></td>
                    <td><strong style={{ color: 'var(--admin-primary)' }}>{m.title}</strong></td>
                    <td><code>{m.url}</code></td>
                    <td>{m.parent_id ? `Parent #${m.parent_id}` : 'Top-level Menu'}</td>
                    <td>
                      <span className={`admin-badge ${m.status === 'Active' ? 'approved' : 'rejected'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          onClick={() => {
                            setSelectedMenu(m);
                            setFormData({
                              title: m.title,
                              url: m.url,
                              parent_id: m.parent_id,
                              display_order: m.display_order,
                              status: m.status
                            });
                            setAlertMsg({ type: '', text: '' });
                            setShowEditModal(true);
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => {
                            setSelectedMenu(m);
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                    No menu items configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MENU MODAL */}
      {showAddModal && (
        <div className="profile-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Create Navigation Menu Item</h3>
              <button className="profile-modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="profile-modal-body">
                {alertMsg.text && (
                  <div className={`profile-modal-alert ${alertMsg.type}`}>
                    {alertMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{alertMsg.text}</span>
                  </div>
                )}
                <div className="profile-field-group">
                  <label className="profile-field-label">Menu Title *</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">URL Path *</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Display Order</label>
                  <input
                    type="number"
                    className="profile-field-input"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Status</label>
                  <select
                    className="profile-field-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>
              <hr className="profile-modal-divider" />
              <div className="profile-modal-footer">
                <button type="button" className="profile-cancel-btn" onClick={() => setShowAddModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="profile-update-btn" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MENU MODAL */}
      {showEditModal && (
        <div className="profile-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Edit Navigation Menu Item</h3>
              <button className="profile-modal-close" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="profile-modal-body">
                {alertMsg.text && (
                  <div className={`profile-modal-alert ${alertMsg.type}`}>
                    {alertMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{alertMsg.text}</span>
                  </div>
                )}
                <div className="profile-field-group">
                  <label className="profile-field-label">Menu Title *</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">URL Path *</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Display Order</label>
                  <input
                    type="number"
                    className="profile-field-input"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Status</label>
                  <select
                    className="profile-field-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>
              <hr className="profile-modal-divider" />
              <div className="profile-modal-footer">
                <button type="button" className="profile-cancel-btn" onClick={() => setShowEditModal(false)} disabled={submitting}>
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

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="profile-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header" style={{ backgroundColor: '#DC2626' }}>
              <h3>Delete Menu Item?</h3>
              <button className="profile-modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="profile-modal-body" style={{ textAlign: 'center' }}>
              <AlertTriangle size={44} color="#DC2626" style={{ margin: '0 auto 1rem auto' }} />
              <p style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>
                Are you sure you want to delete menu <strong>"{selectedMenu?.title}"</strong>?
              </p>
            </div>
            <hr className="profile-modal-divider" />
            <div className="profile-modal-footer">
              <button className="profile-cancel-btn" onClick={() => setShowDeleteModal(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="profile-update-btn" style={{ backgroundColor: '#DC2626' }} onClick={handleDeleteConfirm} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete Menu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
