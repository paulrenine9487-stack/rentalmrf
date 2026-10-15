import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Mail,
  RefreshCw,
  Power,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Lock
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { notify } from '../../components/common/EnterpriseNotificationSystem';
import { generateTemporaryPassword, evaluatePasswordStrength } from '../../utils/passwordGenerator';
import { API_BASE_URL } from '../../utils/apiConfig';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('SUPER_ADMIN');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [placeFilter, setPlaceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loginStatusFilter, setLoginStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState(null);

  // Add Company Form State
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

  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showTempPass, setShowTempPass] = useState(false);

  // Reset Password Modal Form State
  const [resetTempPassword, setResetTempPassword] = useState('');
  const [showResetTempPass, setShowResetTempPass] = useState(false);

  // Post-Add Success State
  const [createdSuccessInfo, setCreatedSuccessInfo] = useState(null);

  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
  const [resetAlertMsg, setResetAlertMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Password strength evaluations
  const addPassStrength = evaluatePasswordStrength(temporaryPassword);
  const resetPassStrength = evaluatePasswordStrength(resetTempPassword);

  useEffect(() => {
    const userStr = localStorage.getItem('adminUser') || localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserRole(u.role || 'SUPER_ADMIN');
      } catch (e) {}
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    try {
      const [compRes, placeRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/companies`, { headers }),
        fetch(`${API_BASE_URL}/api/places`, { headers })
      ]);

      const compData = await compRes.json();
      const placeData = await placeRes.json();

      if (compData.success) setCompanies(compData.companies || []);
      if (placeData.success) setPlaces(placeData.places || []);
      setLoading(false);
    } catch (err) {
      console.warn('Backend fetch issue, loading fallback state:', err);
      setLoading(false);
    }
  };

  // Open Add Company Modal
  const openAddModal = () => {
    const defaultPlace = places[0]?.name || 'MCafe Pod';
    const genPass = generateTemporaryPassword(12);

    setFormData({
      company_name: '',
      contact_person: '',
      email: '',
      contact_number: '',
      interns_count: 0,
      workers_count: 1,
      business_description: '',
      place: defaultPlace,
      monthly_rate: 10000,
      status: 'Approved',
      gst_number: '',
      incubation_date: new Date().toISOString().split('T')[0]
    });

    setTemporaryPassword(genPass);
    setShowTempPass(false);
    setAlertMsg({ type: '', text: '' });
    setShowAddModal(true);
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

  // Open Reset Password Modal
  const openResetModal = (comp) => {
    setSelectedCompany(comp);
    setResetTempPassword(generateTemporaryPassword(12));
    setShowResetTempPass(false);
    setResetAlertMsg({ type: '', text: '' });
    setShowResetModal(true);
  };

  // Handle Add Form Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAlertMsg({ type: '', text: '' });

    if (!temporaryPassword) {
      setAlertMsg({ type: 'error', text: 'Temporary Password is required.' });
      return;
    }

    if (!addPassStrength.isValid) {
      setAlertMsg({ type: 'error', text: 'Temporary Password does not meet strength requirements.' });
      return;
    }

    setSubmitting(true);

    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...formData,
          temporaryPassword
        })
      });
      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setShowAddModal(false);
        setCreatedSuccessInfo({
          company_name: data.company?.company_name || formData.company_name,
          email: data.company?.email || formData.email,
          email_sent: Boolean(data.email_sent),
          message: data.message
        });
        setShowSuccessModal(true);
        fetchData();
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to create company.' });
      }
    } catch (err) {
      setSubmitting(false);
      setAlertMsg({ type: 'error', text: 'Failed to create company. Network connection issue.' });
    }
  };

  // Handle Edit Form Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setAlertMsg({ type: '', text: '' });
    setSubmitting(true);

    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/companies/${selectedCompany.id}`, {
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
        }, 1000);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to update company.' });
      }
    } catch (err) {
      setSubmitting(false);
      setAlertMsg({ type: 'error', text: 'Failed to update company.' });
    }
  };

  // Handle Resend Credentials / Reset Temporary Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetAlertMsg({ type: '', text: '' });

    if (!resetTempPassword) {
      setResetAlertMsg({ type: 'error', text: 'New Temporary Password is required.' });
      return;
    }

    if (!resetPassStrength.isValid) {
      setResetAlertMsg({ type: 'error', text: 'New Temporary Password does not meet security requirements.' });
      return;
    }

    setSubmitting(true);

    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/companies/${selectedCompany.id}/resend-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ temporaryPassword: resetTempPassword })
      });
      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setResetAlertMsg({ type: 'success', text: data.message });
        fetchData();
        setTimeout(() => {
          setShowResetModal(false);
        }, 1400);
      } else {
        setResetAlertMsg({ type: 'error', text: data.message || 'Failed to reset password.' });
      }
    } catch (err) {
      setSubmitting(false);
      setResetAlertMsg({ type: 'error', text: 'Failed to send credentials email.' });
    }
  };

  // Handle Account Status Toggle (Active / Inactive)
  const handleToggleAccountStatus = async (comp) => {
    const currentStatus = comp.account_status || 'ACTIVE';
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmMsg = `Are you sure you want to ${newStatus === 'ACTIVE' ? 'ACTIVATE' : 'DEACTIVATE'} account for "${comp.company_name}"?`;

    if (!window.confirm(confirmMsg)) return;

    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/companies/${comp.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ account_status: newStatus })
      });
      const data = await res.json();

      if (data.success) {
        notify.success('Account status updated successfully', 'Status Updated');
        fetchData();
      } else {
        notify.error(data.message || 'Failed to update account status.', 'Update Error');
      }
    } catch (err) {
      notify.error('Error updating account status.', 'Network Error');
    }
  };

  // Handle Delete Confirmation (Super Admin Only)
  const handleDeleteConfirm = async () => {
    if (!selectedCompany) return;
    setSubmitting(true);

    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/companies/${selectedCompany.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setShowDeleteModal(false);
        notify.success('Company deleted successfully', 'Deleted');
        fetchData();
      } else {
        notify.error(data.message || 'Failed to delete company.', 'Deletion Error');
      }
    } catch (err) {
      setSubmitting(false);
      notify.error('Error deleting company record.', 'Network Error');
    }
  };

  // Search & Filter Logic
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
    const matchesLoginStatus =
      loginStatusFilter === 'All' || (c.login_status && c.login_status === loginStatusFilter);

    return matchesSearch && matchesPlace && matchesStatus && matchesLoginStatus;
  });

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage) || 1;
  const currentRecords = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSendRentAlert = async (comp) => {
    if (!window.confirm(`Send urgent rent payment alert email to ${comp.company_name} (${comp.email})?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/companies/${comp.id}/send-rent-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`Rent overdue alert email sent to ${comp.email}`, 'Email Sent');
      } else {
        notify.error(data.message || 'Failed to send rent alert email.', 'Email Error');
      }
    } catch (err) {
      console.error('Error sending rent alert email:', err);
      notify.error('Network error while sending rent alert email.', 'Network Error');
    }
  };

  const handleAutoSendAllRentAlerts = async () => {
    if (!window.confirm('Automatically scan and send professional rent alert emails to ALL companies with pending/unpaid rent?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/companies/auto-send-rent-alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        notify.alert({
          title: 'Batch Process Complete',
          message: `Automated rent payment alert batch completed.\nSent: ${data.sent_count} emails\nFailed: ${data.failed_count} emails`,
          type: 'success',
          badgeText: 'BATCH COMPLETED'
        });
      } else {
        notify.error(data.message || 'Automated rent alert process failed.', 'Batch Error');
      }
    } catch (err) {
      console.error('Error running auto rent alert batch:', err);
      notify.error('Network error while running automated rent alert batch process.', 'Network Error');
    }
  };

  return (
    <AdminLayout
      title="Companies"
      subtitle={
        isSuperAdmin
          ? 'Manage registered incubation companies, login accounts and credentials.'
          : 'View, update permitted company details and manage credentials.'
      }
    >
      {/* TOOLBAR HEADER ROW */}
      <div className="admin-table-toolbar" style={{ borderRadius: 'var(--admin-radius-lg)', marginBottom: '1.25rem' }}>
        <div className="admin-search-box">
          <Search size={18} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search company, contact person, email, phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="admin-filter-group" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
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
            <option value="All">Approval: All</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            className="admin-select-input"
            value={loginStatusFilter}
            onChange={(e) => {
              setLoginStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">Login Status: All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Password Change Required">Password Change Required</option>
          </select>

          {/* AUTO SEND ALL RENT ALERTS BUTTON */}
          <button
            className="admin-btn admin-btn-secondary"
            title="Automatically send rent alert emails to all companies with pending rent"
            onClick={handleAutoSendAllRentAlerts}
            style={{ color: '#DC2626', borderColor: '#FECACA', backgroundColor: '#FEF2F2', fontWeight: 700 }}
          >
            <Mail size={16} />
            <span>Auto Alert Rent Dues</span>
          </button>

          {/* ADD COMPANY BUTTON */}
          <button className="admin-btn admin-btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            <span>Add Company</span>
          </button>
        </div>
      </div>

      {/* RESPONSIVE DATA TABLE CONTAINER */}
      <div className="admin-table-wrapper">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Company Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Contact Number</th>
                <th>Place</th>
                <th>Rate</th>
                <th>Status</th>
                <th>Login Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.length > 0 ? (
                currentRecords.map((c) => {
                  const loginStatus = c.login_status || 'Active';
                  return (
                    <tr key={c.id}>
                      <td><strong>#{c.s_no || c.id}</strong></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: 'var(--admin-primary)' }}>
                            {c.company_name}
                          </span>
                          <span style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>
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
                      <td>
                        <span
                          className={`admin-badge ${
                            loginStatus === 'Active'
                              ? 'approved'
                              : loginStatus === 'Inactive'
                              ? 'rejected'
                              : 'pending'
                          }`}
                        >
                          {loginStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                          {/* View Button */}
                          <button
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            title="View Company Profile"
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
                            title="Edit Company Details"
                            onClick={() => openEditModal(c)}
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Send Overdue Rent Alert Email Button */}
                          <button
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            title="Send Rent Overdue Alert Email to Company"
                            onClick={() => handleSendRentAlert(c)}
                            style={{ color: '#DC2626', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
                          >
                            <Mail size={14} />
                          </button>

                          {/* Resend / Reset Credentials Button (SUPER ADMIN ONLY) */}
                          {isSuperAdmin && (
                            <button
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              title="Reset Password & Resend Credentials"
                              onClick={() => openResetModal(c)}
                              style={{ color: '#8B0000', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
                            >
                              <KeyRound size={14} />
                            </button>
                          )}

                          {/* Account Status Toggle (Active / Inactive) (SUPER ADMIN ONLY) */}
                          {isSuperAdmin && (
                            <button
                              className={`admin-btn admin-btn-sm ${c.account_status === 'INACTIVE' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                              title={c.account_status === 'INACTIVE' ? 'Activate Account' : 'Deactivate Account'}
                              onClick={() => handleToggleAccountStatus(c)}
                            >
                              <Power size={14} color={c.account_status === 'INACTIVE' ? '#FFFFFF' : '#DC2626'} />
                            </button>
                          )}

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
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
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

      {/* ADD COMPANY MODAL WITH TEMPORARY PASSWORD UI */}
      {showAddModal && (
        <div className="profile-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Add New Incubation Company</h3>
              <button className="profile-modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="profile-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {alertMsg.text && (
                  <div className={`profile-modal-alert ${alertMsg.type}`}>
                    {alertMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{alertMsg.text}</span>
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--admin-primary)', marginBottom: '0.75rem' }}>
                  Company Information
                </div>

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

                <div className="profile-field-group" style={{ marginTop: '0.75rem' }}>
                  <label className="profile-field-label">Business Description</label>
                  <textarea
                    className="profile-field-input"
                    rows={2}
                    value={formData.business_description}
                    onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                  />
                </div>

                {/* LOGIN CREDENTIALS & TEMPORARY PASSWORD UI SECTION */}
                <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--admin-primary)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <KeyRound size={18} />
                    <span>Login Credentials</span>
                  </div>

                  <div className="profile-field-group">
                    <label className="profile-field-label">Temporary Password *</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input
                          type={showTempPass ? 'text' : 'password'}
                          className="profile-field-input"
                          style={{ paddingRight: '2.5rem', fontFamily: showTempPass ? 'monospace' : 'inherit' }}
                          value={temporaryPassword}
                          onChange={(e) => setTemporaryPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowTempPass(!showTempPass)}
                          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                        >
                          {showTempPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() => setTemporaryPassword(generateTemporaryPassword(12))}
                        style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Sparkles size={16} />
                        <span>Generate Password</span>
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {temporaryPassword && (
                      <div style={{ marginTop: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          <span style={{ color: '#64748B' }}>Password Strength:</span>
                          <span style={{ color: addPassStrength.color }}>{addPassStrength.label}</span>
                        </div>
                        <div style={{ height: '6px', width: '100%', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${addPassStrength.percentage}%`, backgroundColor: addPassStrength.color, transition: 'width 0.3s ease' }} />
                        </div>
                      </div>
                    )}

                    {/* Requirements Checklist */}
                    <div style={{ backgroundColor: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                        Password requirements:
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.76rem' }}>
                        <div style={{ color: addPassStrength.requirements.hasMinLength ? '#166534' : '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={12} color={addPassStrength.requirements.hasMinLength ? '#16A34A' : '#CBD5E1'} />
                          <span>Minimum 8 characters</span>
                        </div>
                        <div style={{ color: addPassStrength.requirements.hasUpper ? '#166534' : '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={12} color={addPassStrength.requirements.hasUpper ? '#16A34A' : '#CBD5E1'} />
                          <span>At least one uppercase</span>
                        </div>
                        <div style={{ color: addPassStrength.requirements.hasLower ? '#166534' : '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={12} color={addPassStrength.requirements.hasLower ? '#16A34A' : '#CBD5E1'} />
                          <span>At least one lowercase</span>
                        </div>
                        <div style={{ color: addPassStrength.requirements.hasNumber ? '#166534' : '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={12} color={addPassStrength.requirements.hasNumber ? '#16A34A' : '#CBD5E1'} />
                          <span>At least one number</span>
                        </div>
                        <div style={{ color: addPassStrength.requirements.hasSpecial ? '#166534' : '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem', gridColumn: 'span 2' }}>
                          <CheckCircle2 size={12} color={addPassStrength.requirements.hasSpecial ? '#16A34A' : '#CBD5E1'} />
                          <span>At least one special character (!@#$%^&*)</span>
                        </div>
                      </div>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.74rem', color: '#64748B', fontStyle: 'italic' }}>
                        The company will be required to change this password after first login.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="profile-modal-divider" />
              <div className="profile-modal-footer">
                <button type="button" className="profile-cancel-btn" onClick={() => setShowAddModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="profile-update-btn" disabled={submitting || !addPassStrength.isValid}>
                  {submitting ? 'Creating Company...' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST ADD COMPANY SUCCESS MODAL (WITHOUT DISPLAYING TEMPORARY PASSWORD) */}
      {showSuccessModal && createdSuccessInfo && (
        <div className="profile-modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header" style={{ backgroundColor: createdSuccessInfo.email_sent ? '#16A34A' : '#D97706' }}>
              <h3>✓ Company Added Successfully</h3>
              <button className="profile-modal-close" onClick={() => setShowSuccessModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="profile-modal-body" style={{ textAlign: 'center', padding: '1.75rem 1.5rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: createdSuccessInfo.email_sent ? '#DCFCE7' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                {createdSuccessInfo.email_sent ? (
                  <CheckCircle2 size={32} color="#16A34A" />
                ) : (
                  <AlertTriangle size={32} color="#D97706" />
                )}
              </div>

              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: '#0F172A' }}>
                {createdSuccessInfo.company_name}
              </h4>

              <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0', margin: '1rem 0', textAlign: 'left', fontSize: '0.88rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'block' }}>Login Email</span>
                  <strong style={{ color: '#0F172A' }}>{createdSuccessInfo.email}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'block' }}>Credential Email Status</span>
                  {createdSuccessInfo.email_sent ? (
                    <span style={{ color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                      <CheckCircle2 size={15} />
                      Sent successfully
                    </span>
                  ) : (
                    <span style={{ color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                      <AlertTriangle size={15} />
                      Could not be sent via SMTP
                    </span>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0 }}>
                {createdSuccessInfo.email_sent
                  ? 'The login credentials have been sent to the company\'s registered email address.'
                  : 'Company account created, but login credentials email failed to send. Use Resend Credentials to generate a new password.'}
              </p>
            </div>
            <hr className="profile-modal-divider" />
            <div className="profile-modal-footer">
              <button className="profile-update-btn" onClick={() => setShowSuccessModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD / RESEND CREDENTIALS MODAL */}
      {showResetModal && selectedCompany && (
        <div className="profile-modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="profile-modal-container" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header" style={{ backgroundColor: '#8B0000' }}>
              <h3>Reset Temporary Password</h3>
              <button className="profile-modal-close" onClick={() => setShowResetModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResetSubmit}>
              <div className="profile-modal-body">
                {resetAlertMsg.text && (
                  <div className={`profile-modal-alert ${resetAlertMsg.type}`}>
                    {resetAlertMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{resetAlertMsg.text}</span>
                  </div>
                )}

                <div style={{ backgroundColor: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Target Company & Email</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>{selectedCompany.company_name}</div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--admin-primary)' }}>{selectedCompany.email}</div>
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">New Temporary Password *</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type={showResetTempPass ? 'text' : 'password'}
                        className="profile-field-input"
                        style={{ paddingRight: '2.5rem', fontFamily: showResetTempPass ? 'monospace' : 'inherit' }}
                        value={resetTempPassword}
                        onChange={(e) => setResetTempPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetTempPass(!showResetTempPass)}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                      >
                        {showResetTempPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => setResetTempPassword(generateTemporaryPassword(12))}
                      style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Sparkles size={16} />
                      <span>Generate</span>
                    </button>
                  </div>

                  {/* Password Strength */}
                  {resetTempPassword && (
                    <div style={{ marginTop: '0.65rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        <span style={{ color: '#64748B' }}>Password Strength:</span>
                        <span style={{ color: resetPassStrength.color }}>{resetPassStrength.label}</span>
                      </div>
                      <div style={{ height: '6px', width: '100%', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${resetPassStrength.percentage}%`, backgroundColor: resetPassStrength.color, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <hr className="profile-modal-divider" />
              <div className="profile-modal-footer">
                <button type="button" className="profile-cancel-btn" onClick={() => setShowResetModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="profile-update-btn" style={{ backgroundColor: '#8B0000' }} disabled={submitting || !resetPassStrength.isValid}>
                  {submitting ? 'Resetting & Sending...' : 'Reset & Send Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COMPANY MODAL */}
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
                  <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>Login Account Status</span>
                  <div>
                    <span className={`admin-badge ${(selectedCompany.login_status || 'Active') === 'Active' ? 'approved' : (selectedCompany.login_status === 'Inactive' ? 'rejected' : 'pending')}`}>
                      {selectedCompany.login_status || 'Active'}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>GST Number</span>
                  <div>{selectedCompany.gst_number || 'N/A'}</div>
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
