import React, { useState, useEffect } from 'react';
import { LayoutTemplate, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle2, Save, Share2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { API_BASE_URL } from '../../utils/apiConfig';

export default function FooterManagementPage() {
  const [footerSettings, setFooterSettings] = useState({
    organization_name: 'MCC MRF Innovation Park',
    description: 'Nurturing innovation and entrepreneurship at Madras Christian College Campus.',
    email: 'Info@mccmrfip.com',
    phone: '+91 72000 99955',
    address: 'East Tambaram, Chennai, 600059, Tamil Nadu',
    logo_url: '/mcc-crest-maroon.png',
    copyright_text: '© 2025 MCC MRF Innovation Park. All rights reserved.'
  });

  const [socials, setSocials] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  // Social Media Link Modal States
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [editingSocial, setEditingSocial] = useState(null);
  const [socialFormData, setSocialFormData] = useState({
    platform: 'Facebook',
    url: 'https://',
    display_order: 1,
    status: 'Active'
  });

  useEffect(() => {
    fetchFooterData();
  }, []);

  const fetchFooterData = async () => {
    const token = localStorage.getItem('adminToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${API_BASE_URL}/api/footer`, { headers });
      const data = await res.json();
      if (data.success && data.footerData) {
        if (data.footerData.settings) setFooterSettings(data.footerData.settings);
        if (data.footerData.socials) setSocials(data.footerData.socials);
      }
    } catch (err) {
      console.warn('Backend connection error:', err);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlertMsg({ type: '', text: '' });

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/footer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(footerSettings)
      });
      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setAlertMsg({ type: 'success', text: 'Footer settings updated successfully!' });
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to update footer settings.' });
      }
    } catch (err) {
      setSubmitting(false);
      setAlertMsg({ type: 'error', text: 'Network connection error.' });
    }
  };

  // Social Link CRUD Operations
  const openAddSocialModal = () => {
    setEditingSocial(null);
    setSocialFormData({
      platform: 'Facebook',
      url: 'https://',
      display_order: socials.length + 1,
      status: 'Active'
    });
    setShowSocialModal(true);
  };

  const openEditSocialModal = (item) => {
    setEditingSocial(item);
    setSocialFormData({
      platform: item.platform || 'Facebook',
      url: item.url || 'https://',
      display_order: item.display_order || 1,
      status: item.status || 'Active'
    });
    setShowSocialModal(true);
  };

  const handleSocialFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const token = localStorage.getItem('adminToken');
    const isEdit = Boolean(editingSocial);
    const url = isEdit
      ? `${API_BASE_URL}/api/footer/social/${editingSocial.id}`
      : `${API_BASE_URL}/api/footer/social`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(socialFormData)
      });
      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setShowSocialModal(false);
        fetchFooterData();
      } else {
        alert(data.message || 'Failed to save social media link');
      }
    } catch (err) {
      setSubmitting(false);
    }
  };

  const handleDeleteSocial = async (id) => {
    if (!window.confirm('Are you sure you want to delete this social media link?')) return;
    const token = localStorage.getItem('adminToken');
    try {
      await fetch(`${API_BASE_URL}/api/footer/social/${id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      fetchFooterData();
    } catch (err) {}
  };

  const handleToggleSocialStatus = async (item) => {
    const token = localStorage.getItem('adminToken');
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await fetch(`${API_BASE_URL}/api/footer/social/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...item, status: newStatus })
      });
      fetchFooterData();
    } catch (err) {}
  };

  return (
    <AdminLayout
      title="Footer Management"
      subtitle="Super Admin Configuration for Public Website Footer Details & Social Handles."
    >
      {/* 1. MAIN ORGANIZATION FOOTER DETAILS FORM */}
      <div className="admin-card" style={{ marginBottom: '2rem' }}>
        <div className="admin-card-header">
          <h3 className="admin-card-title">Organization & Contact Footer Settings</h3>
        </div>

        {alertMsg.text && (
          <div className={`profile-modal-alert ${alertMsg.type}`} style={{ marginBottom: '1.25rem' }}>
            {alertMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span>{alertMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSettingsSubmit}>
          <div className="admin-dual-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="profile-field-group">
              <label className="profile-field-label">Organization Name *</label>
              <input
                type="text"
                className="profile-field-input"
                value={footerSettings.organization_name}
                onChange={(e) => setFooterSettings({ ...footerSettings, organization_name: e.target.value })}
                required
              />
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">Primary Contact Email *</label>
              <input
                type="email"
                className="profile-field-input"
                value={footerSettings.email}
                onChange={(e) => setFooterSettings({ ...footerSettings, email: e.target.value })}
                required
              />
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">Primary Phone Number *</label>
              <input
                type="text"
                className="profile-field-input"
                value={footerSettings.phone}
                onChange={(e) => setFooterSettings({ ...footerSettings, phone: e.target.value })}
                required
              />
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">Physical Campus Address *</label>
              <input
                type="text"
                className="profile-field-input"
                value={footerSettings.address}
                onChange={(e) => setFooterSettings({ ...footerSettings, address: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="profile-field-group" style={{ marginTop: '1rem' }}>
            <label className="profile-field-label">Tagline Description</label>
            <textarea
              className="profile-field-input"
              rows={2}
              value={footerSettings.description}
              onChange={(e) => setFooterSettings({ ...footerSettings, description: e.target.value })}
            />
          </div>

          <div className="profile-field-group">
            <label className="profile-field-label">Copyright Bar Text</label>
            <input
              type="text"
              className="profile-field-input"
              value={footerSettings.copyright_text}
              onChange={(e) => setFooterSettings({ ...footerSettings, copyright_text: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
              <Save size={16} />
              <span>{submitting ? 'Saving...' : 'Save Footer Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. SOCIAL MEDIA LINKS TABLE (CRUD OPERATOR) */}
      <div className="admin-table-wrapper">
        <div className="admin-table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={18} color="var(--admin-primary)" />
            <h3 className="admin-card-title" style={{ margin: 0 }}>Social Media Links</h3>
          </div>
          <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={openAddSocialModal}>
            <Plus size={14} />
            <span>Add Social Media Handle</span>
          </button>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Platform Name</th>
                <th>Target URL</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {socials && socials.length > 0 ? (
                socials.map((s) => (
                  <tr key={s.id}>
                    <td><strong>#{s.display_order || s.id}</strong></td>
                    <td>
                      <span className="admin-badge admin-badge-primary" style={{ textTransform: 'capitalize' }}>
                        {s.platform}
                      </span>
                    </td>
                    <td>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0284C7', textDecoration: 'underline', fontSize: '0.85rem' }}
                      >
                        {s.url}
                      </a>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${s.status === 'Active' ? 'active' : 'inactive'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleSocialStatus(s)}
                        title="Click to toggle status"
                      >
                        {s.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          onClick={() => openEditSocialModal(s)}
                          title="Alter / Edit Social Handle"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => handleDeleteSocial(s.id)}
                          title="Delete Social Handle"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748B' }}>
                    No social media handles configured yet. Click "Add Social Media Handle" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT SOCIAL MEDIA MODAL */}
      {showSocialModal && (
        <div className="profile-modal-overlay" onClick={() => setShowSocialModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>{editingSocial ? 'Alter Social Media Handle' : 'Add Social Media Handle'}</h3>
              <button className="profile-modal-close" onClick={() => setShowSocialModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSocialFormSubmit}>
              <div className="profile-modal-body">
                <div className="profile-field-group">
                  <label className="profile-field-label">Platform Name *</label>
                  <select
                    className="profile-field-input"
                    value={socialFormData.platform}
                    onChange={(e) => setSocialFormData({ ...socialFormData, platform: e.target.value })}
                    required
                  >
                    <option value="Facebook">Facebook</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Instagram">Instagram</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Twitter">Twitter / X</option>
                    <option value="Website">Website</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">Target URL *</label>
                  <input
                    type="url"
                    className="profile-field-input"
                    value={socialFormData.url}
                    onChange={(e) => setSocialFormData({ ...socialFormData, url: e.target.value })}
                    placeholder="https://www.facebook.com/your-page"
                    required
                    autoComplete="off"
                  />
                </div>

                <div className="modal-form-grid">
                  <div className="profile-field-group">
                    <label className="profile-field-label">Display Order</label>
                    <input
                      type="number"
                      className="profile-field-input"
                      value={socialFormData.display_order}
                      onChange={(e) => setSocialFormData({ ...socialFormData, display_order: Number(e.target.value) })}
                    />
                  </div>

                  <div className="profile-field-group">
                    <label className="profile-field-label">Status</label>
                    <select
                      className="profile-field-input"
                      value={socialFormData.status}
                      onChange={(e) => setSocialFormData({ ...socialFormData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <hr className="profile-modal-divider" />
              <div className="profile-modal-footer">
                <button type="button" className="profile-cancel-btn" onClick={() => setShowSocialModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="profile-update-btn">
                  {editingSocial ? 'Save Changes' : 'Add Social Handle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
