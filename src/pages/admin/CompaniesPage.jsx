import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  CreditCard,
  X,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('SUPER_ADMIN');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [placeFilter, setPlaceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    contact_number: '',
    interns_count: 0,
    workers_count: 1,
    business_description: '',
    place: 'MCafe Pod',
    monthly_rate: 10000,
    status: 'Approved',
    gst_number: '',
    incubation_date: ''
  });

  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  useEffect(() => {
    const userStr = localStorage.getItem('adminUser');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserRole(u.role || 'SUPER_ADMIN');
      } catch (e) {}
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('adminToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    try {
      const [compRes, placeRes] = await Promise.all([
        fetch('http://localhost:5000/api/companies', { headers }),
        fetch('http://localhost:5000/api/places', { headers })
      ]);

      const compData = await compRes.json();
      const placeData = await placeRes.json();

      if (compData.success) setCompanies(compData.companies || []);
      if (placeData.success) setPlaces(placeData.places || []);
      setLoading(false);
    } catch (err) {
      console.warn('Backend fetch issue, initializing client state:', err);
      setLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (comp) => {
    setSelectedCompany(comp);
    setFormData({
      company_name: comp.company_name || '',
      contact_person: comp.contact_person || '',
      email: comp.email || '',
      contact_number: comp.contact_number || '',
      interns_count: comp.interns_count ?? 0,
      workers_count: comp.workers_count ?? 1,
      business_description: comp.business_description || '',
      place: comp.place || 'MCafe Pod',
      monthly_rate: comp.monthly_rate || 10000,
      status: comp.status || 'Approved',
      gst_number: comp.gst_number || '',
      incubation_date: comp.incubation_date || ''
    });
    setAlertMsg({ type: '', text: '' });
    setShowEditModal(true);
  };

  // Handle Add Form Submit (Super Admin Only)
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAlertMsg({ type: '', text: '' });
    setSubmitting(true);

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch('http://localhost:5000/api/companies', {
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
        setAlertMsg({ type: 'success', text: 'Company created successfully!' });
        fetchData();
        setTimeout(() => {
          setShowAddModal(false);
        }, 1200);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to create company.' });
      }
    } catch (err) {
      setSubmitting(false);
      setAlertMsg({ type: 'error', text: 'Failed to create company. Network connection issue.' });
    }
  };

  // Handle Edit Form Submit (Super Admin & Admin restricted)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setAlertMsg({ type: '', text: '' });
    setSubmitting(true);

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`http://localhost:5000/api/companies/${selectedCompany.id}`, {
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
        setAlertMsg({ type: 'success', text: 'Company updated successfully!' });
        fetchData();
        setTimeout(() => {
          setShowEditModal(false);
        }, 1200);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to update company.' });
      }
    } catch (err) {
      setSubmitting(false);
      setAlertMsg({ type: 'error', text: 'Failed to update company.' });
    }
  };

  // Handle Delete Confirmation (Super Admin Only)
  const handleDeleteConfirm = async () => {
    if (!selectedCompany) return;
    setSubmitting(true);

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`http://localhost:5000/api/companies/${selectedCompany.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setShowDeleteModal(false);
        fetchData();
      } else {
        alert(data.message || 'Failed to delete company.');
      }
    } catch (err) {
      setSubmitting(false);
      alert('Error deleting company record.');
    }
  };

  // Search & Filter Filtering Logic
  const filteredCompanies = companies.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.contact_person && c.contact_person.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.contact_number && c.contact_number.includes(q));

    const matchesPlace = placeFilter === 'All' || c.place === placeFilter;
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;

    return matchesSearch && matchesPlace && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage) || 1;
  const currentRecords = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AdminLayout
      title="Companies"
      subtitle={
        isSuperAdmin
          ? 'Manage registered incubation companies and workspace allocations.'
          : 'View and update permitted company information.'
      }
    >
      {/* TOOLBAR HEADER ROW */}
      <div className="admin-table-toolbar" style={{ borderRadius: 'var(--admin-radius-lg)', marginBottom: '1.25rem' }}>
        <div className="admin-search-box">
          <Search size={18} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by company, person, email, phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="admin-filter-group">
          <select
            className="admin-select-input"
            value={placeFilter}
            onChange={(e) => {
              setPlaceFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">All Places</option>
            {places.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="admin-select-input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* ADD COMPANY BUTTON (SUPER ADMIN ONLY!) */}
          {isSuperAdmin && (
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => {
                setFormData({
                  company_name: '',
                  contact_person: '',
                  email: '',
                  contact_number: '',
                  interns_count: 0,
                  workers_count: 1,
                  business_description: '',
                  place: places[0]?.name || 'MCafe Pod',
                  monthly_rate: 10000,
                  status: 'Approved',
                  gst_number: '',
                  incubation_date: new Date().toISOString().split('T')[0]
                });
                setAlertMsg({ type: '', text: '' });
                setShowAddModal(true);
              }}
            >
              <Plus size={18} />
              <span>Add Company</span>
            </button>
          )}
        </div>
      </div>

      {/* RESPONSIVE DATA TABLE CONTAINER */}
      <div className="admin-table-wrapper">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Company Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Contact Number</th>
                <th>Place</th>
                <th>Interns</th>
                <th>Workers</th>
                <th>Monthly Rate</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.length > 0 ? (
                currentRecords.map((c) => (
                  <tr key={c.id}>
                    <td><strong>#{c.s_no || c.id}</strong></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: 'var(--admin-primary)' }}>
                          {c.company_name}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                          GST: {c.gst_number || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td>{c.contact_person}</td>
                    <td>{c.email}</td>
                    <td>{c.contact_number}</td>
                    <td>
                      <span className="admin-badge info">{c.place || 'MCafe Pod'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{c.interns_count ?? 0}</td>
                    <td style={{ textAlign: 'center' }}>{c.workers_count ?? 1}</td>
                    <td>₹{Number(c.monthly_rate || 0).toLocaleString()}</td>
                    <td>
                      <span
                        className={`admin-badge ${
                          c.status === 'Approved' ? 'approved' : c.status === 'Pending' ? 'pending' : 'rejected'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        {/* View Button */}
                        <button
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          title="View Company Details"
                          onClick={() => {
                            setSelectedCompany(c);
                            setShowViewModal(true);
                          }}
                        >
                          <Eye size={14} />
                        </button>

                        {/* Edit Button */}
                        <button
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          title="Edit Company"
                          onClick={() => openEditModal(c)}
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Delete Button (SUPER ADMIN ONLY!) */}
                        {isSuperAdmin && (
                          <button
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            title="Delete Company"
                            onClick={() => {
                              setSelectedCompany(c);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                    No company records found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        <div className="admin-pagination">
          <span>
            Showing <strong>{filteredCompanies.length ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to{' '}
            <strong>{Math.min(currentPage * itemsPerPage, filteredCompanies.length)}</strong> of{' '}
            <strong>{filteredCompanies.length}</strong> records
          </span>
          <div className="admin-pagination-btns">
            <button
              className="admin-btn admin-btn-secondary admin-btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span style={{ padding: '0 0.5rem', fontWeight: 700 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="admin-btn admin-btn-secondary admin-btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* EDIT COMPANY MODAL (WITH ADMIN FIELD RESTRICTIONS) */}
      {showEditModal && (
        <div className="profile-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>{isSuperAdmin ? 'Edit Company (Full Access)' : 'Edit Company (Restricted Admin View)'}</h3>
              <button className="profile-modal-close" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="profile-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {alertMsg.text && (
                  <div className={`profile-modal-alert ${alertMsg.type}`}>
                    {alertMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{alertMsg.text}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="profile-field-group">
                    <label className="profile-field-label">Company Name *</label>
                    <input
                      type="text"
                      className="profile-field-input"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-field-group">
                    <label className="profile-field-label">Contact Person *</label>
                    <input
                      type="text"
                      className="profile-field-input"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
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
                    <label className="profile-field-label">Contact Number *</label>
                    <input
                      type="text"
                      className="profile-field-input"
                      value={formData.contact_number}
                      onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-field-group">
                    <label className="profile-field-label">Number of Interns</label>
                    <input
                      type="number"
                      className="profile-field-input"
                      value={formData.interns_count}
                      onChange={(e) => setFormData({ ...formData, interns_count: Number(e.target.value) })}
                    />
                  </div>

                  <div className="profile-field-group">
                    <label className="profile-field-label">Number of Workers</label>
                    <input
                      type="number"
                      className="profile-field-input"
                      value={formData.workers_count}
                      onChange={(e) => setFormData({ ...formData, workers_count: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">Business Description</label>
                  <textarea
                    className="profile-field-input"
                    rows={3}
                    value={formData.business_description}
                    onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                  />
                </div>

                {/* RESTRICTED FIELDS - READ ONLY FOR ADMIN, EDITABLE FOR SUPER ADMIN */}
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--admin-primary)', marginBottom: '0.75rem', display: 'block' }}>
                    {isSuperAdmin ? 'Workspace & Pricing Administration' : 'Workspace Details (Read-Only for Admin)'}
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="profile-field-group">
                      <label className="profile-field-label">Place / Location</label>
                      {isSuperAdmin ? (
                        <select
                          className="profile-field-input"
                          value={formData.place}
                          onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                        >
                          {places.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input type="text" className="profile-field-input" value={formData.place} disabled readOnly style={{ backgroundColor: '#F3F4F6' }} />
                      )}
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-field-label">Monthly Rate (₹)</label>
                      <input
                        type="number"
                        className="profile-field-input"
                        value={formData.monthly_rate}
                        onChange={(e) => isSuperAdmin && setFormData({ ...formData, monthly_rate: Number(e.target.value) })}
                        disabled={!isSuperAdmin}
                        readOnly={!isSuperAdmin}
                        style={{ backgroundColor: !isSuperAdmin ? '#F3F4F6' : '#FFFFFF' }}
                      />
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-field-label">Approval Status</label>
                      {isSuperAdmin ? (
                        <select
                          className="profile-field-input"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                          <option value="Approved">Approved</option>
                          <option value="Pending">Pending</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      ) : (
                        <input type="text" className="profile-field-input" value={formData.status} disabled readOnly style={{ backgroundColor: '#F3F4F6' }} />
                      )}
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-field-label">GST Number</label>
                      <input
                        type="text"
                        className="profile-field-input"
                        value={formData.gst_number}
                        onChange={(e) => isSuperAdmin && setFormData({ ...formData, gst_number: e.target.value })}
                        disabled={!isSuperAdmin}
                        readOnly={!isSuperAdmin}
                        style={{ backgroundColor: !isSuperAdmin ? '#F3F4F6' : '#FFFFFF' }}
                      />
                    </div>
                  </div>
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

      {/* ADD COMPANY MODAL (SUPER ADMIN ONLY) */}
      {showAddModal && isSuperAdmin && (
        <div className="profile-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Create New Incubation Company</h3>
              <button className="profile-modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="profile-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {alertMsg.text && (
                  <div className={`profile-modal-alert ${alertMsg.type}`}>
                    {alertMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{alertMsg.text}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="profile-field-group">
                    <label className="profile-field-label">Company Name *</label>
                    <input
                      type="text"
                      className="profile-field-input"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-field-group">
                    <label className="profile-field-label">Contact Person *</label>
                    <input
                      type="text"
                      className="profile-field-input"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
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
                    <label className="profile-field-label">Contact Number *</label>
                    <input
                      type="text"
                      className="profile-field-input"
                      value={formData.contact_number}
                      onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-field-group">
                    <label className="profile-field-label">Allocated Workspace</label>
                    <select
                      className="profile-field-input"
                      value={formData.place}
                      onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                    >
                      {places.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
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
              </div>

              <hr className="profile-modal-divider" />
              <div className="profile-modal-footer">
                <button type="button" className="profile-cancel-btn" onClick={() => setShowAddModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="profile-update-btn" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="profile-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header" style={{ backgroundColor: '#DC2626' }}>
              <h3>Delete Company?</h3>
              <button className="profile-modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="profile-modal-body" style={{ textAlign: 'center' }}>
              <AlertTriangle size={48} color="#DC2626" style={{ margin: '0 auto 1rem auto' }} />
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                Are you sure you want to delete <strong>"{selectedCompany?.company_name}"</strong>?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', marginTop: '0.5rem' }}>
                This action cannot be undone. All company records and activity will be permanently removed.
              </p>
            </div>
            <hr className="profile-modal-divider" />
            <div className="profile-modal-footer">
              <button className="profile-cancel-btn" onClick={() => setShowDeleteModal(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="profile-update-btn" style={{ backgroundColor: '#DC2626' }} onClick={handleDeleteConfirm} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete Company'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW COMPANY DETAILS MODAL */}
      {showViewModal && selectedCompany && (
        <div className="profile-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Company Profile - {selectedCompany.company_name}</h3>
              <button className="profile-modal-close" onClick={() => setShowViewModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="profile-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>Company ID</span>
                  <div style={{ fontWeight: 700 }}>#{selectedCompany.s_no || selectedCompany.id}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>Approval Status</span>
                  <div>
                    <span className={`admin-badge ${selectedCompany.status === 'Approved' ? 'approved' : 'pending'}`}>
                      {selectedCompany.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>Contact Person</span>
                  <div style={{ fontWeight: 600 }}>{selectedCompany.contact_person}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>Contact Number</span>
                  <div>{selectedCompany.contact_number}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>Email Address</span>
                  <div>{selectedCompany.email}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>GST Number</span>
                  <div>{selectedCompany.gst_number || '123'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>Allocated Workspace</span>
                  <div style={{ fontWeight: 700, color: 'var(--admin-primary)' }}>{selectedCompany.place || 'MCafe Pod'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>Monthly Rent</span>
                  <div style={{ fontWeight: 700 }}>₹{Number(selectedCompany.monthly_rate || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
            <hr className="profile-modal-divider" />
            <div className="profile-modal-footer">
              <button className="profile-update-btn" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
