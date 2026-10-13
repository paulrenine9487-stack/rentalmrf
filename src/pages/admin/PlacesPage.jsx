import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Edit2, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { API_BASE_URL } from '../../utils/apiConfig';

export default function PlacesPage() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('SUPER_ADMIN');

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: 1,
    monthly_rate: 10000,
    status: 'Available'
  });

  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  useEffect(() => {
    const u = localStorage.getItem('adminUser');
    if (u) {
      try {
        const user = JSON.parse(u);
        setUserRole(user.role || 'SUPER_ADMIN');
      } catch (e) {}
    }
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    const token = localStorage.getItem('adminToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${API_BASE_URL}/api/places`, { headers });
      const data = await res.json();
      if (data.success) {
        setPlaces(data.places || []);
      }
      setLoading(false);
    } catch (err) {
      console.warn('Backend server connection issue:', err);
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlertMsg({ type: '', text: '' });

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/places`, {
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
        setAlertMsg({ type: 'success', text: 'Place added successfully!' });
        fetchPlaces();
        setTimeout(() => setShowAddModal(false), 1200);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to add place.' });
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
      const res = await fetch(`${API_BASE_URL}/api/places/${selectedPlace.id}`, {
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
        setAlertMsg({ type: 'success', text: 'Place updated successfully!' });
        fetchPlaces();
        setTimeout(() => setShowEditModal(false), 1200);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to update place.' });
      }
    } catch (err) {
      setSubmitting(false);
      setAlertMsg({ type: 'error', text: 'Network connection error.' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPlace) return;
    setSubmitting(true);

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/places/${selectedPlace.id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setShowDeleteModal(false);
        fetchPlaces();
      } else {
        alert(data.message || 'Failed to delete place.');
      }
    } catch (err) {
      setSubmitting(false);
      alert('Error deleting place record.');
    }
  };

  const filteredPlaces = places.filter((p) =>
    !searchTerm ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout
      title="Places Management"
      subtitle={
        isSuperAdmin
          ? 'Manage workspace locations, incubators, and monthly rental tariffs.'
          : 'View workspace occupancy and place availability.'
      }
    >
      <div className="admin-table-toolbar" style={{ borderRadius: 'var(--admin-radius-lg)', marginBottom: '1.25rem' }}>
        <div className="admin-search-box">
          <Search size={18} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by place name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className="admin-btn admin-btn-primary"
          onClick={() => {
            setFormData({
              name: '',
              description: '',
              capacity: 1,
              monthly_rate: 10000,
              status: 'Available'
            });
            setAlertMsg({ type: '', text: '' });
            setShowAddModal(true);
          }}
        >
          <Plus size={18} />
          <span>Add Place</span>
        </button>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Place Name</th>
                <th>Description</th>
                <th>Capacity</th>
                <th>Monthly Rate</th>
                <th>Status</th>
                {isSuperAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredPlaces.length > 0 ? (
                filteredPlaces.map((p) => (
                  <tr key={p.id}>
                    <td><strong>#{p.id}</strong></td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--admin-primary)' }}>{p.name}</span>
                    </td>
                    <td>{p.description || 'N/A'}</td>
                    <td>{p.capacity} Persons</td>
                    <td>₹{Number(p.monthly_rate || 0).toLocaleString()}</td>
                    <td>
                      <span className={`admin-badge ${p.status === 'Available' ? 'available' : 'occupied'}`}>
                        {p.status}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            onClick={() => {
                              setSelectedPlace(p);
                              setFormData({
                                name: p.name,
                                description: p.description || '',
                                capacity: p.capacity,
                                monthly_rate: p.monthly_rate,
                                status: p.status
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
                              setSelectedPlace(p);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                    No workspace places found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD PLACE MODAL */}
      {showAddModal && isSuperAdmin && (
        <div className="profile-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Create New Workspace Place</h3>
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
                  <label className="profile-field-label">Place Name *</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Description</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="modal-form-grid">
                  <div className="profile-field-group">
                    <label className="profile-field-label">Capacity (Persons)</label>
                    <input
                      type="number"
                      className="profile-field-input"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="profile-field-group">
                    <label className="profile-field-label">Monthly Rate (₹)</label>
                    <input
                      type="number"
                      className="profile-field-input"
                      value={formData.monthly_rate}
                      onChange={(e) => setFormData({ ...formData, monthly_rate: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Status</label>
                  <select
                    className="profile-field-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                  </select>
                </div>
              </div>
              <hr className="profile-modal-divider" />
              <div className="profile-modal-footer">
                <button type="button" className="profile-cancel-btn" onClick={() => setShowAddModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="profile-update-btn" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Place'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLACE MODAL */}
      {showEditModal && isSuperAdmin && (
        <div className="profile-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Edit Workspace Place</h3>
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
                  <label className="profile-field-label">Place Name *</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Description</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="modal-form-grid">
                  <div className="profile-field-group">
                    <label className="profile-field-label">Capacity</label>
                    <input
                      type="number"
                      className="profile-field-input"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="profile-field-group">
                    <label className="profile-field-label">Monthly Rate (₹)</label>
                    <input
                      type="number"
                      className="profile-field-input"
                      value={formData.monthly_rate}
                      onChange={(e) => setFormData({ ...formData, monthly_rate: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="profile-field-group">
                  <label className="profile-field-label">Status</label>
                  <select
                    className="profile-field-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
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
      {showDeleteModal && isSuperAdmin && (
        <div className="profile-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header" style={{ backgroundColor: '#DC2626' }}>
              <h3>Delete Workspace Place?</h3>
              <button className="profile-modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="profile-modal-body" style={{ textAlign: 'center' }}>
              <AlertTriangle size={44} color="#DC2626" style={{ margin: '0 auto 1rem auto' }} />
              <p style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>
                Are you sure you want to delete place <strong>"{selectedPlace?.name}"</strong>?
              </p>
            </div>
            <hr className="profile-modal-divider" />
            <div className="profile-modal-footer">
              <button className="profile-cancel-btn" onClick={() => setShowDeleteModal(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="profile-update-btn" style={{ backgroundColor: '#DC2626' }} onClick={handleDeleteConfirm} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete Place'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
