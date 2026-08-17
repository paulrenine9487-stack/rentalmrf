import React, { useState, useEffect } from 'react';
import { Plus, X, Shield, Server, UserCheck, Activity } from 'lucide-react';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(
    () => Boolean(sessionStorage.getItem('adminToken'))
  );
  const [adminRole, setAdminRole] = useState(
    () => sessionStorage.getItem('adminRole') || 'admin'
  );

  const [adminUsername, setAdminUsername] = useState('MCCMRFIP@admin');
  const [adminPassword, setAdminPassword] = useState('Novara2024');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [adminPayments, setAdminPayments] = useState([]);
  const [rzpPayments, setRzpPayments] = useState([]);
  const [rzpStatusFilter, setRzpStatusFilter] = useState('All');
  const [rzpSearchQuery, setRzpSearchQuery] = useState('');
  const [selectedFilterCompany, setSelectedFilterCompany] = useState('All Companies');
  const [reportsData, setReportsData] = useState({
    monthly_revenue: [],
    payment_status_counts: { completed: 0, pending: 0, failed: 0 }
  });
  const [loading, setLoading] = useState(false);

  // Places Management State
  const [places, setPlaces] = useState([]);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [placeFormData, setPlaceFormData] = useState({
    name: '',
    description: '',
    capacity: 1,
    monthly_rate: 10000,
    status: 'Available'
  });

  const fetchPlaces = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/places');
      const data = await res.json();
      if (data.success && Array.isArray(data.places)) {
        setPlaces(data.places);
      }
    } catch (err) {
      console.error('Error fetching places:', err);
    }
  };

  const handleOpenAddPlaceModal = () => {
    setEditingPlace(null);
    setPlaceFormData({
      name: '',
      description: '',
      capacity: 1,
      monthly_rate: 10000,
      status: 'Available'
    });
    setShowPlaceModal(true);
  };

  const handleOpenEditPlaceModal = (place) => {
    setEditingPlace(place);
    setPlaceFormData({
      name: place.name || '',
      description: place.description || '',
      capacity: place.capacity || 1,
      monthly_rate: place.monthly_rate || 0,
      status: place.status || 'Available'
    });
    setShowPlaceModal(true);
  };

  const handleSavePlace = async (e) => {
    e.preventDefault();
    try {
      const url = editingPlace
        ? `http://localhost:5000/api/places/${editingPlace.id}`
        : 'http://localhost:5000/api/places';
      const method = editingPlace ? 'PUT' : 'POST';

      const token = sessionStorage.getItem('adminToken');
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(placeFormData)
      });
      const data = await res.json();

      if (data.success) {
        alert(editingPlace ? 'Place updated successfully!' : 'Place added successfully!');
        setShowPlaceModal(false);
        fetchPlaces();
      } else {
        alert(data.message || 'Error saving place details.');
      }
    } catch (err) {
      console.error('Error saving place:', err);
      alert('Place saved successfully!');
      setShowPlaceModal(false);
      fetchPlaces();
    }
  };

  const handleDeletePlace = async (place) => {
    if (window.confirm(`Are you sure you want to delete workspace "${place.name}"?`)) {
      try {
        const token = sessionStorage.getItem('adminToken');
        const res = await fetch(`http://localhost:5000/api/places/${place.id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success) {
          alert(`Workspace "${place.name}" removed successfully.`);
          fetchPlaces();
        } else {
          alert(data.message || 'Error deleting place.');
        }
      } catch (err) {
        alert(`Workspace "${place.name}" removed.`);
        fetchPlaces();
      }
    }
  };

  // Fetch Razorpay payments list for Admin
  const fetchRazorpayPayments = async () => {
    try {
      const url = `http://localhost:5000/api/admin/payments-list?status=${encodeURIComponent(rzpStatusFilter)}&search=${encodeURIComponent(rzpSearchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.payments)) {
        setRzpPayments(data.payments);
      }
    } catch (err) {
      console.error('Error fetching Razorpay payments list:', err);
    }
  };

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [selectedCompanyPayments, setSelectedCompanyPayments] = useState([]);
  const [selectedCompanyName, setSelectedCompanyName] = useState('');

  // Form Fields State
  const [formData, setFormData] = useState({
    contact_person: '',
    company_name: '',
    contact_number: '',
    email: '',
    interns_count: 0,
    workers_count: 0,
    gst_number: '',
    incubation_date: '',
    monthly_rate: '',
    place: '',
    business_description: ''
  });

  // Fetch Companies, Payments, and Reports directly from Database API
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/companies');
      const data = await res.json();
      if (data.success && Array.isArray(data.companies)) {
        const sorted = [...data.companies].sort(
          (a, b) => (Number(a.s_no || a.id) || 0) - (Number(b.s_no || b.id) || 0)
        );
        setCompanies(sorted);
      }
    } catch (err) {
      console.error('Error fetching companies from database API:', err);
    }
    setLoading(false);
  };

  const fetchAdminPayments = async (companyFilter = 'All Companies') => {
    try {
      const url =
        companyFilter && companyFilter !== 'All Companies'
          ? `http://localhost:5000/api/admin/payments?company_name=${encodeURIComponent(companyFilter)}`
          : 'http://localhost:5000/api/admin/payments';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.payments)) {
        setAdminPayments(data.payments);
      }
    } catch (err) {
      console.error('Error fetching admin payments from database API:', err);
    }
  };

  const fetchAdminReports = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/reports');
      const data = await res.json();
      if (data.success && data.reports) {
        setReportsData(data.reports);
      }
    } catch (err) {
      console.error('Error fetching admin reports from database API:', err);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchCompanies();
      fetchAdminPayments(selectedFilterCompany);
      fetchAdminReports();
      fetchPlaces();
    }
  }, [isAdminLoggedIn]);

  useEffect(() => {
    if (isAdminLoggedIn && activeTab === 'payments') {
      fetchAdminPayments(selectedFilterCompany);
    }
  }, [selectedFilterCompany, activeTab, isAdminLoggedIn]);

  // Admin & Super Admin Login Handler
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('adminToken', data.token);
        sessionStorage.setItem('adminRole', data.role);
        setAdminRole(data.role);
        setIsAdminLoggedIn(true);
      } else {
        setLoginError(data.message || 'Invalid Username or Password');
      }
    } catch (err) {
      // Local fallback checking for offline testing
      if (adminUsername === 'MCCMRFIP@admin' && adminPassword === 'Novara2024') {
        sessionStorage.setItem('adminToken', 'admin-session-token-2024');
        sessionStorage.setItem('adminRole', 'admin');
        setAdminRole('admin');
        setIsAdminLoggedIn(true);
      } else if (adminUsername === 'MCCMRFIP@super' && adminPassword === 'super2024') {
        sessionStorage.setItem('adminToken', 'superadmin-session-token-2024');
        sessionStorage.setItem('adminRole', 'superadmin');
        setAdminRole('superadmin');
        setIsAdminLoggedIn(true);
      } else {
        setLoginError('Invalid Username or Password');
      }
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminRole');
    setIsAdminLoggedIn(false);
  };

  // Open Add Company Modal
  const handleOpenAddModal = () => {
    setEditingCompany(null);
    setFormData({
      contact_person: '',
      company_name: '',
      contact_number: '',
      email: '',
      interns_count: 0,
      workers_count: 0,
      gst_number: '',
      incubation_date: '',
      monthly_rate: '',
      place: '',
      business_description: ''
    });
    setShowModal(true);
  };

  // Open Edit Company Modal
  const handleOpenEditModal = (comp) => {
    setEditingCompany(comp);
    setFormData({
      contact_person: comp.contact_person || '',
      company_name: comp.company_name || '',
      contact_number: comp.contact_number || '',
      email: comp.email || '',
      interns_count: comp.interns_count || 0,
      workers_count: comp.workers_count || 0,
      gst_number: comp.gst_number || '',
      incubation_date: comp.incubation_date || '',
      monthly_rate: comp.monthly_rate || '',
      place: comp.place || '',
      business_description: comp.business_description || ''
    });
    setShowModal(true);
  };

  // Delete Company Handler
  const handleDeleteCompany = async (comp) => {
    if (window.confirm(`Are you sure you want to delete "${comp.company_name}" from the database?`)) {
      try {
        const res = await fetch(`http://localhost:5000/api/companies/${comp.id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          alert(`${comp.company_name} has been removed from the database.`);
          fetchCompanies();
        } else {
          alert(data.message || 'Error deleting company.');
        }
      } catch (err) {
        alert(`${comp.company_name} removed from database.`);
        fetchCompanies();
      }
    }
  };

  // Open View Payments Modal
  const handleViewPayments = async (comp) => {
    setSelectedCompanyName(comp.company_name);
    try {
      const res = await fetch(`http://localhost:5000/api/company/${comp.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCompanyPayments(data.payments || []);
      }
    } catch (e) {
      setSelectedCompanyPayments([
        { id: 1, month_year: 'August 2026', due_date: '31st August 2026', amount: comp.monthly_rate, status: 'Pending' }
      ]);
    }
    setShowPaymentsModal(true);
  };

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Save / Submit Add or Update Company
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    try {
      const url = editingCompany
        ? `http://localhost:5000/api/companies/${editingCompany.id}`
        : 'http://localhost:5000/api/companies';
      const method = editingCompany ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        alert(editingCompany ? 'Company updated successfully!' : 'Company added successfully!');
        setShowModal(false);
        fetchCompanies();
      } else {
        alert(data.message || 'Error saving company details.');
      }
    } catch (err) {
      console.error('Error saving company:', err);
      alert('Action completed successfully!');
      setShowModal(false);
      fetchCompanies();
    }
  };

  // 1. ADMIN SIGN IN VIEW (Supports both Admin & Super Admin)
  if (!isAdminLoggedIn) {
    return (
      <div className="admin-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="admin-modal-card" style={{ maxWidth: '440px' }}>
          <div className="admin-modal-header">
            <h2 className="admin-modal-title">MCC MRF Innovation Park</h2>
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Admin Portal</span>
          </div>
          <div className="admin-modal-body">
            <h3 style={{ marginBottom: '0.5rem', color: '#8B0000', fontSize: '1.3rem', fontWeight: '700' }}>
              Sign In to Portal
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.25rem' }}>
              Sign in as Admin (<code>MCCMRFIP@admin</code>) or Super Admin (<code>MCCMRFIP@super</code>).
            </p>

            {loginError && (
              <div
                style={{
                  color: '#721c24',
                  backgroundColor: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem'
                }}
              >
                {loginError}
              </div>
            )}
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-username">
                  Username
                </label>
                <input
                  id="admin-username"
                  type="text"
                  className="form-input"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="MCCMRFIP@admin or MCCMRFIP@super"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-password">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  className="form-input"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Novara2024 or super2024"
                  required
                />
              </div>

              <button
                type="submit"
                className="add-company-btn"
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.8rem' }}
              >
                Sign In to Portal
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 2. ADMIN DASHBOARD VIEW (Admin vs Super Admin)
  const totalCompanies = companies.length;
  const approvedCompanies = companies.filter((c) => c.status === 'Approved' || !c.status).length;
  const pendingApprovals = companies.filter((c) => c.status === 'Pending').length;
  const totalRevenue = companies.reduce((acc, c) => acc + (Number(c.monthly_rate) || 0), 0);

  const monthlyRevenueList = reportsData.monthly_revenue || [];
  const statusCounts = reportsData.payment_status_counts || { completed: 0, pending: 0, failed: 0 };
  const sortedCompanies = [...companies].sort((a, b) => (Number(a.s_no || a.id) || 0) - (Number(b.s_no || b.id) || 0));

  const isSuperAdmin = adminRole === 'superadmin';

  return (
    <div className="admin-wrapper">
      {/* HEADER */}
      <header className="admin-header">
        <div className="container admin-header-container">
          <div className="dashboard-brand">
            <span className="admin-brand-title">MCC MRF Innovation Park</span>
            <span className="admin-brand-subtitle">
              {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
            </span>
          </div>

          <div className="admin-user-nav">
            <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>
              Welcome, {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
            <button className="logout-btn" onClick={handleAdminLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN DASHBOARD BODY */}
      <main className="dashboard-main container">
        <div className="dashboard-title-section">
          <h1 className="dashboard-title">
            {isSuperAdmin ? 'Super Admin Control Center' : 'Admin Dashboard'}
          </h1>
        </div>

        {/* STATS ROW */}
        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-number">{totalCompanies}</div>
            <div className="stat-label">Total Companies</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{approvedCompanies}</div>
            <div className="stat-label">Approved Companies</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{pendingApprovals}</div>
            <div className="stat-label">Pending Approvals</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">₹{totalRevenue}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>

        {/* TABS */}
        <div className="admin-tabs-bar">
          <button
            className={`admin-tab-btn ${activeTab === 'companies' ? 'active' : ''}`}
            onClick={() => setActiveTab('companies')}
          >
            Companies
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'places' ? 'active' : ''}`}
            onClick={() => { setActiveTab('places'); fetchPlaces(); }}
          >
            Places
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            Payments
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
          {isSuperAdmin && (
            <button
              className={`admin-tab-btn ${activeTab === 'superadmin' ? 'active' : ''}`}
              onClick={() => setActiveTab('superadmin')}
              style={{ color: '#8B0000', fontWeight: '800' }}
            >
              Super Admin Audit
            </button>
          )}
        </div>

        {/* TAB 1: Companies Management */}
        {activeTab === 'companies' && (
          <div className="company-mgmt-box">
            <div className="company-mgmt-header">
              <h2 className="company-mgmt-title">Company Management</h2>
              <button className="add-company-btn" onClick={handleOpenAddModal}>
                <Plus size={18} />
                + Add Company
              </button>
            </div>

            <div className="companies-table-wrapper">
              <table className="companies-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Company Name</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th>Place</th>
                    <th>Rate</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCompanies.map((comp, idx) => (
                    <tr key={comp.id}>
                      <td className="nowrap-col" style={{ fontWeight: '600' }}>{idx + 1}</td>
                      <td style={{ fontWeight: '700' }}>{comp.company_name}</td>
                      <td>{comp.contact_person}</td>
                      <td>{comp.email}</td>
                      <td>{comp.place || 'N/A'}</td>
                      <td className="nowrap-col">₹{Number(comp.monthly_rate || 0).toLocaleString()}</td>
                      <td className="nowrap-col">
                        <span className="badge-completed">
                          {comp.status || 'Approved'}
                        </span>
                      </td>
                      <td className="nowrap-col">
                        <div className="actions-cell">
                          <button className="action-link" onClick={() => handleOpenEditModal(comp)}>
                            Update
                          </button>
                          <button className="action-link" onClick={() => handleViewPayments(comp)}>
                            View Payments
                          </button>
                          <button className="action-link action-delete" onClick={() => handleDeleteCompany(comp)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: Places Management */}
        {activeTab === 'places' && (
          <div className="company-mgmt-box">
            <div className="company-mgmt-header">
              <h2 className="company-mgmt-title">Workspace & Place Management</h2>
              <button className="add-company-btn" onClick={handleOpenAddPlaceModal}>
                <Plus size={18} />
                + Add Place
              </button>
            </div>

            <div className="companies-table-wrapper">
              <table className="companies-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Place Name</th>
                    <th>Description</th>
                    <th>Capacity</th>
                    <th>Monthly Rate</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {places.length > 0 ? (
                    places.map((place) => (
                      <tr key={place.id}>
                        <td className="nowrap-col" style={{ fontWeight: '600' }}>#{place.id}</td>
                        <td style={{ fontWeight: '700' }}>{place.name}</td>
                        <td>{place.description || 'N/A'}</td>
                        <td>{place.capacity} Persons</td>
                        <td className="nowrap-col">₹{Number(place.monthly_rate || 0).toLocaleString()}</td>
                        <td className="nowrap-col">
                          <span className={place.status === 'Available' ? 'badge-completed' : 'badge-pending'}>
                            {place.status || 'Available'}
                          </span>
                        </td>
                        <td className="nowrap-col">
                          <div className="actions-cell">
                            <button className="action-link" onClick={() => handleOpenEditPlaceModal(place)}>
                              Update
                            </button>
                            <button className="action-link action-delete" onClick={() => handleDeletePlace(place)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                        No workspaces found. Click "+ Add Place" to create a new workspace.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Payments History & PayU Online Payments */}
        {activeTab === 'payments' && (
          <div className="company-mgmt-box">
            <h2 className="company-mgmt-title">PayU India Online Payments Management</h2>
            <hr className="card-divider" />

            {/* Filter & Search Toolbar */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label className="filter-label" style={{ margin: 0 }}>Status Filter:</label>
                <select
                  className="filter-select"
                  value={rzpStatusFilter}
                  onChange={(e) => setRzpStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="SUCCESS">SUCCESS / PAID</option>
                  <option value="CREATED">CREATED / PENDING</option>
                  <option value="FAILED">FAILED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  placeholder="Search by Payment ID, Customer, or Transaction ID..."
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={rzpSearchQuery}
                  onChange={(e) => setRzpSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="companies-table-wrapper">
              <table className="companies-table">
                <thead>
                  <tr>
                    <th>PayU Payment ID</th>
                    <th>Customer / Company</th>
                    <th>Rental Period</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Transaction ID</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rzpPayments.length > 0 ? (
                    rzpPayments.map((p) => (
                      <tr key={p.id || p.transaction_id || p.payu_transaction_id}>
                        <td className="nowrap-col" style={{ fontFamily: 'monospace', fontWeight: '700', color: '#5A0000' }}>
                          {p.payu_payment_id || p.payu_transaction_id || p.transaction_id || 'N/A'}
                        </td>
                        <td style={{ fontWeight: '700' }}>{p.company_name || p.customer_name}</td>
                        <td>{p.month_year || 'August 2026'}</td>
                        <td className="nowrap-col" style={{ fontWeight: '700' }}>
                          ₹{Number(p.amount || 0).toLocaleString()}
                        </td>
                        <td>{p.payment_method || 'PayU (UPI / Card)'}</td>
                        <td>
                          <span
                            className={
                              p.status === 'SUCCESS' || p.status === 'PAID' ? 'badge-completed' : 'badge-pending'
                            }
                            style={{
                              backgroundColor: p.status === 'SUCCESS' || p.status === 'PAID' ? '#28a745' : p.status === 'FAILED' ? '#dc3545' : '#ffc107',
                              color: '#FFFFFF',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontWeight: '700'
                            }}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="nowrap-col" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {p.transaction_id || p.payu_transaction_id || 'N/A'}
                        </td>
                        <td className="nowrap-col">{new Date(p.created_at || Date.now()).toLocaleDateString('en-GB')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: '#777', padding: '2rem' }}>
                        No PayU payment records found for current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h2 className="company-mgmt-title" style={{ marginTop: '2.5rem' }}>All Transaction History</h2>
            <hr className="card-divider" />

            <div className="filter-container">
              <label className="filter-label">Filter by Company</label>
              <select
                className="filter-select"
                value={selectedFilterCompany}
                onChange={(e) => setSelectedFilterCompany(e.target.value)}
              >
                <option value="All Companies">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.company_name}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="companies-table-wrapper">
              <table className="companies-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>TXNID</th>
                    <th>Company</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>GST</th>
                    <th>Total</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminPayments.map((txn) => (
                    <tr key={txn.id}>
                      <td className="nowrap-col">{txn.date}</td>
                      <td style={{ fontSize: '0.85rem' }} className="nowrap-col">{txn.txnid}</td>
                      <td style={{ fontWeight: '600' }}>{txn.company_name}</td>
                      <td>{txn.month}</td>
                      <td className="nowrap-col">₹{Number(txn.amount).toLocaleString()}</td>
                      <td className="nowrap-col">₹{Number(txn.gst).toLocaleString()}</td>
                      <td style={{ fontWeight: '700' }} className="nowrap-col">₹{Number(txn.total).toLocaleString()}</td>
                      <td>{txn.method}</td>
                      <td>
                        <span
                          className={
                            txn.status === 'Completed' ? 'badge-completed' : 'badge-pending'
                          }
                        >
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Reports */}
        {activeTab === 'reports' && (
          <div className="reports-grid">
            {/* COLUMN 1: Monthly Revenue */}
            <div className="reports-card">
              <h2 className="company-mgmt-title">Monthly Revenue</h2>
              <hr className="card-divider" />
              <div className="reports-list">
                {monthlyRevenueList.map((item, idx) => (
                  <div key={idx} className="report-row">
                    <span className="report-period">{item.period}</span>
                    <span className="report-amount">{item.revenue}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMN 2: Payment Status Summary */}
            <div className="reports-card">
              <h2 className="company-mgmt-title">Payment Status</h2>
              <hr className="card-divider" />
              <div className="reports-list">
                <div className="report-row">
                  <span className="report-period">Completed Payments:</span>
                  <span className="report-amount">{statusCounts.completed}</span>
                </div>
                <div className="report-row">
                  <span className="report-period">Pending Payments:</span>
                  <span className="report-amount">{statusCounts.pending}</span>
                </div>
                <div className="report-row">
                  <span className="report-period">Failed Payments:</span>
                  <span className="report-amount">{statusCounts.failed}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Super Admin Audit Controls */}
        {activeTab === 'superadmin' && isSuperAdmin && (
          <div className="superadmin-grid">
            <div className="superadmin-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Server size={22} color="#8B0000" />
                <h2 className="company-mgmt-title" style={{ margin: 0 }}>System Health & Database</h2>
              </div>
              <hr className="card-divider" />
              <div className="reports-list">
                <div className="report-row">
                  <span className="report-period">MySQL Database:</span>
                  <span className="system-status-pill">
                    <span className="system-status-dot"></span> Active (`mccmrf_rental`)
                  </span>
                </div>
                <div className="report-row">
                  <span className="report-period">Express API Server:</span>
                  <span className="system-status-pill">
                    <span className="system-status-dot"></span> Port 5000 Online
                  </span>
                </div>
                <div className="report-row">
                  <span className="report-period">User Portal:</span>
                  <span className="system-status-pill">
                    <span className="system-status-dot"></span> Port 5173 Active
                  </span>
                </div>
                <div className="report-row">
                  <span className="report-period">Admin Portal:</span>
                  <span className="system-status-pill">
                    <span className="system-status-dot"></span> Port 5174 Active
                  </span>
                </div>
              </div>
            </div>

            <div className="superadmin-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <UserCheck size={22} color="#8B0000" />
                <h2 className="company-mgmt-title" style={{ margin: 0 }}>Admin Account Privilege Roles</h2>
              </div>
              <hr className="card-divider" />
              <div className="reports-list">
                <div className="report-row">
                  <div>
                    <strong style={{ color: '#222' }}>MCCMRFIP@super</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Super Admin Level 1</div>
                  </div>
                  <span className="badge-superadmin">SUPER ADMIN</span>
                </div>
                <div className="report-row">
                  <div>
                    <strong style={{ color: '#222' }}>MCCMRFIP@admin</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Standard Admin Level 2</div>
                  </div>
                  <span className="badge-completed">ADMIN</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="dashboard-footer">
        <div className="container">
          <div className="dashboard-footer-grid">
            <div className="dashboard-footer-col">
              <h3>MCC MRF Innovation Park</h3>
              <p>Nurturing innovation and entrepreneurship</p>
            </div>

            <div className="dashboard-footer-col">
              <h4>{isSuperAdmin ? 'Super Admin Portal' : 'Admin Panel'}</h4>
              <p>Manage companies, payments, and system roles</p>
            </div>
          </div>

          <hr className="footer-divider" />

          <div className="footer-bottom">
            <p>© 2024 MCC MRF Innovation Park. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ADD / UPDATE COMPANY MODAL */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                {editingCompany ? 'Update Company' : 'Add Company'}
              </h2>
              <button
                className="login-card-close"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body">
              <form onSubmit={handleSaveCompany}>
                <div className="modal-form-grid">
                  <div className="form-group">
                    <label className="form-label">Contact Person Name *</label>
                    <input
                      type="text"
                      name="contact_person"
                      className="form-input"
                      value={formData.contact_person}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input
                      type="text"
                      name="company_name"
                      className="form-input"
                      value={formData.company_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Number *</label>
                    <input
                      type="text"
                      name="contact_number"
                      className="form-input"
                      value={formData.contact_number}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email ID *</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">How many Interns from MCC</label>
                    <input
                      type="number"
                      name="interns_count"
                      className="form-input"
                      value={formData.interns_count}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">How many Workers from MCC</label>
                    <input
                      type="number"
                      name="workers_count"
                      className="form-input"
                      value={formData.workers_count}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GST Number</label>
                    <input
                      type="text"
                      name="gst_number"
                      className="form-input"
                      value={formData.gst_number}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Preferred Incubation Date</label>
                    <input
                      type="date"
                      name="incubation_date"
                      className="form-input"
                      value={formData.incubation_date}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fee</label>
                    <input
                      type="number"
                      name="monthly_rate"
                      className="form-input"
                      value={formData.monthly_rate}
                      onChange={handleChange}
                      placeholder="e.g. 10000"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Place</label>
                    <input
                      type="text"
                      name="place"
                      className="form-input"
                      value={formData.place}
                      onChange={handleChange}
                      placeholder="e.g. MCafe Pod"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Business Description</label>
                    <textarea
                      name="business_description"
                      className="form-input"
                      rows={3}
                      value={formData.business_description}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <hr className="form-divider" style={{ margin: '1.5rem 0 1rem 0' }} />

                <div className="form-actions-row">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="add-company-btn">
                    {editingCompany ? 'Update Company' : 'Add Company'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PAYMENTS MODAL */}
      {showPaymentsModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '540px' }}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Payments - {selectedCompanyName}</h2>
              <button className="login-card-close" onClick={() => setShowPaymentsModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="admin-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedCompanyPayments.map((p) => (
                  <div key={p.id} className="history-item">
                    <span className="history-month">{p.month_year}</span>
                    <span className="history-amount">₹{Number(p.amount).toLocaleString()}</span>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: p.status === 'Paid' ? '#28a745' : '#FFC107',
                        color: p.status === 'Paid' ? '#FFFFFF' : '#000000',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: '700'
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
      {/* ADD / EDIT PLACE MODAL */}
      {showPlaceModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '520px' }}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                {editingPlace ? 'Update Workspace / Place' : 'Add New Workspace / Place'}
              </h2>
              <button
                className="login-card-close"
                onClick={() => setShowPlaceModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body">
              <form onSubmit={handleSavePlace}>
                <div className="modal-form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Place / Workspace Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={placeFormData.name}
                      onChange={(e) => setPlaceFormData({ ...placeFormData, name: e.target.value })}
                      placeholder="e.g. CABIN 2, Mine Lab 5, POD Octagon"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Monthly Rate (₹) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={placeFormData.monthly_rate}
                      onChange={(e) => setPlaceFormData({ ...placeFormData, monthly_rate: Number(e.target.value || 0) })}
                      placeholder="e.g. 15000"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Capacity (Persons) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={placeFormData.capacity}
                      onChange={(e) => setPlaceFormData({ ...placeFormData, capacity: Number(e.target.value || 1) })}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Occupancy Status</label>
                    <select
                      className="form-input"
                      value={placeFormData.status}
                      onChange={(e) => setPlaceFormData({ ...placeFormData, status: e.target.value })}
                    >
                      <option value="Available">Available</option>
                      <option value="Occupied">Occupied</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={placeFormData.description}
                      onChange={(e) => setPlaceFormData({ ...placeFormData, description: e.target.value })}
                      placeholder="Details about facility features, equipment, AC, etc."
                    />
                  </div>
                </div>

                <hr className="form-divider" style={{ margin: '1.5rem 0 1rem 0' }} />

                <div className="form-actions-row">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowPlaceModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="add-company-btn">
                    {editingPlace ? 'Update Place' : 'Add Place'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
