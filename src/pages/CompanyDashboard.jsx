import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Edit, X, CheckCircle, AlertTriangle, XCircle, Printer, Download, ShieldCheck, CreditCard, Receipt, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import Footer from '../components/Footer';
import InvoiceReceiptModal from '../components/InvoiceReceiptModal';
import './CompanyDashboard.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CompanyDashboard() {
  const [company, setCompany] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Payment Gateway Modal State
  const currentCalendarMonthIdx = new Date().getMonth(); // 0 = Jan, 7 = Aug, 11 = Dec
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStartMonth, setSelectedStartMonth] = useState(currentCalendarMonthIdx);
  const [selectedEndMonth, setSelectedEndMonth] = useState(currentCalendarMonthIdx);
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  // PayU Payment Flow States: 'idle' | 'creating' | 'redirecting' | 'verifying' | 'success' | 'failed' | 'cancelled'
  const [paymentState, setPaymentState] = useState('idle');
  const [paymentResult, setPaymentResult] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Profile & Change Password Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileUpdateModal, setShowProfileUpdateModal] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [editCompanyName, setEditCompanyName] = useState('');
  const [editContactNumber, setEditContactNumber] = useState('');
  const [editInterns, setEditInterns] = useState(0);
  const [editWorkers, setEditWorkers] = useState(1);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('currentCompany');
    let companyId = 1;
    let initialCompany = null;

    if (stored) {
      try {
        initialCompany = JSON.parse(stored);
        companyId = initialCompany.id || 1;
        setCompany(initialCompany);
      } catch (e) {
        console.error('Error parsing stored company:', e);
      }
    }

    // Fetch live company & payment details from backend API
    fetch(`http://localhost:5000/api/company/${companyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.company) {
          setCompany(data.company);
          setPayments(data.payments || []);
        } else if (initialCompany) {
          setCompany(initialCompany);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Backend server fetch error, using stored company data:', err);
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentCompany');
    navigate('/');
  };

  // Find all pending/overdue payments
  const pendingPayments = (payments || []).filter(
    (p) => p.status === 'Pending' || p.status === 'PENDING' || p.status === 'Overdue'
  );
  const oldestPendingPayment = pendingPayments.length > 0
    ? [...pendingPayments].sort((a, b) => (a.id || 0) - (b.id || 0))[0]
    : null;
  const isPastOverdue = Boolean(oldestPendingPayment);

  const openPaymentModal = () => {
    if (isPastOverdue && oldestPendingPayment) {
      const monthName = (oldestPendingPayment.month_year || oldestPendingPayment.month || '').split(' ')[0];
      const oldestUnpaidIdx = MONTHS.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
      if (oldestUnpaidIdx !== -1 && oldestUnpaidIdx <= currentCalendarMonthIdx) {
        setSelectedStartMonth(oldestUnpaidIdx);
        setSelectedEndMonth(oldestUnpaidIdx);
      } else {
        setSelectedStartMonth(currentCalendarMonthIdx);
        setSelectedEndMonth(currentCalendarMonthIdx);
      }
    } else {
      setSelectedStartMonth(currentCalendarMonthIdx);
      setSelectedEndMonth(currentCalendarMonthIdx);
    }
    setIsSelectingRange(false);
    setPaymentState('idle');
    setPaymentResult(null);
    setShowPaymentModal(true);
  };

  const handleMonthClick = (index) => {
    // Rule 1: Do NOT allow selecting future months beyond current calendar month
    if (index > currentCalendarMonthIdx) {
      alert('Future months cannot be selected for advance payment.');
      return;
    }

    // Rule 2: Require paying oldest overdue payment first
    if (isPastOverdue && oldestPendingPayment) {
      const monthName = (oldestPendingPayment.month_year || oldestPendingPayment.month || '').split(' ')[0];
      const oldestUnpaidIdx = MONTHS.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
      if (oldestUnpaidIdx !== -1 && index !== oldestUnpaidIdx) {
        alert(`You have an overdue payment for ${oldestPendingPayment.month_year || oldestPendingPayment.month}. Please pay your overdue past payment first.`);
        setSelectedStartMonth(oldestUnpaidIdx);
        setSelectedEndMonth(oldestUnpaidIdx);
        return;
      }
    }

    if (!isSelectingRange || index < selectedStartMonth) {
      setSelectedStartMonth(index);
      setSelectedEndMonth(index);
      setIsSelectingRange(true);
    } else {
      setSelectedEndMonth(index);
      setIsSelectingRange(false);
    }
  };

  const activeCompany = company || {
    id: 1,
    s_no: 7,
    contact_person: 'Prasath',
    company_name: 'Green Era',
    contact_number: '9361328432',
    email: 'accounts@thegreenera.in',
    interns_count: 0,
    workers_count: 1,
    monthly_rate: 10000,
    incubation_date: '22/11/2024',
    gst_number: '123',
    place: 'MCafe Pod'
  };

  // Calculations for Payment Gateway Summary
  const selectedCount = Math.max(1, selectedEndMonth - selectedStartMonth + 1);
  const rangeText =
    selectedStartMonth === selectedEndMonth
      ? MONTHS[selectedStartMonth]
      : `${MONTHS[selectedStartMonth]} to ${MONTHS[selectedEndMonth]}`;

  const baseRate = Number(activeCompany.monthly_rate || 10000);
  const monthlyRent = baseRate * selectedCount;
  const gstAmount = Math.round(monthlyRent * 0.18);
  const totalAmount = monthlyRent + gstAmount;

  // PayU Hosted Checkout Integration
  const handleProceedToPayUPayment = async () => {
    if (paymentState !== 'idle' && paymentState !== 'failed' && paymentState !== 'cancelled') return;

    setPaymentState('creating');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/payments/create-payu-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          company_id: activeCompany.id,
          billing_month: rangeText
        })
      });

      const data = await res.json();

      if (!data.success || !data.payuUrl || !data.params) {
        setPaymentState('failed');
        setPaymentResult({
          status: 'FAILED',
          message: data.message || 'Failed to initiate PayU payment. Please try again.'
        });
        return;
      }

      setPaymentState('redirecting');

      // Submit dynamic form to PayU Hosted Checkout URL
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.payuUrl;

      Object.keys(data.params).forEach((key) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = data.params[key];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error('Error initiating PayU payment:', err);
      setPaymentState('failed');
      setPaymentResult({
        status: 'FAILED',
        message: 'Failed to initiate PayU payment. Please check your network connection.'
      });
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentState('idle');
    setPaymentResult(null);
  };

  const getProceedBtnText = () => {
    if (paymentState === 'creating') return 'Creating PayU Order...';
    if (paymentState === 'redirecting') return 'Connecting to PayU...';
    if (paymentState === 'verifying') return 'Verifying Payment...';
    return `Proceed to Pay ₹${totalAmount.toLocaleString()}`;
  };



  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (!newPassword || newPassword.trim() === '') {
      setPasswordMsg({ type: 'error', text: 'Please enter a new password.' });
      return;
    }

    if (newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 4 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setPasswordSubmitting(true);

    try {
      const res = await fetch('http://localhost:5000/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompany.id,
          email: activeCompany.email,
          newPassword: newPassword,
          confirmPassword: confirmPassword
        })
      });

      const data = await res.json();
      setPasswordSubmitting(false);

      if (data.success) {
        setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
        const updatedComp = { ...activeCompany, password: newPassword };
        if (data.company) {
          Object.assign(updatedComp, data.company);
        }
        setCompany(updatedComp);
        localStorage.setItem('currentCompany', JSON.stringify(updatedComp));

        const passMap = JSON.parse(localStorage.getItem('company_passwords_map') || '{}');
        if (activeCompany.email) {
          passMap[activeCompany.email.toLowerCase()] = newPassword;
          localStorage.setItem('company_passwords_map', JSON.stringify(passMap));
        }

        setTimeout(() => {
          setShowPasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
          setPasswordMsg({ type: '', text: '' });
        }, 1200);
      } else {
        setPasswordMsg({ type: 'error', text: data.message || 'Failed to update password.' });
      }
    } catch (err) {
      console.warn('Backend unavailable, updating password locally:', err);
      const updatedComp = { ...activeCompany, password: newPassword };
      setCompany(updatedComp);
      localStorage.setItem('currentCompany', JSON.stringify(updatedComp));

      const passMap = JSON.parse(localStorage.getItem('company_passwords_map') || '{}');
      if (activeCompany.email) {
        passMap[activeCompany.email.toLowerCase()] = newPassword;
        localStorage.setItem('company_passwords_map', JSON.stringify(passMap));
      }

      setPasswordSubmitting(false);
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });

      setTimeout(() => {
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordMsg({ type: '', text: '' });
      }, 1200);
    }
  };

  const openProfileUpdateModal = () => {
    setEditCompanyName(activeCompany.company_name || '');
    setEditContactNumber(activeCompany.contact_number || '');
    setEditInterns(activeCompany.interns_count ?? 0);
    setEditWorkers(activeCompany.workers_count ?? 1);
    setProfileMsg({ type: '', text: '' });
    setShowProfileUpdateModal(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setProfileSubmitting(true);

    const payload = {
      companyId: activeCompany.id,
      company_name: editCompanyName,
      contact_number: editContactNumber,
      interns_count: Number(editInterns || 0),
      workers_count: Number(editWorkers || 0),
      gst_number: activeCompany.gst_number || ''
    };

    const updatedFields = {
      ...activeCompany,
      company_name: editCompanyName,
      contact_number: editContactNumber,
      interns_count: Number(editInterns || 0),
      workers_count: Number(editWorkers || 0)
    };

    try {
      const res = await fetch(`http://localhost:5000/api/company/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setProfileSubmitting(false);

      if (data.success) {
        setProfileMsg({ type: 'success', text: 'Profile details updated successfully!' });
        const finalComp = data.company || updatedFields;
        setCompany(finalComp);
        localStorage.setItem('currentCompany', JSON.stringify(finalComp));

        setTimeout(() => {
          setShowProfileUpdateModal(false);
          setProfileMsg({ type: '', text: '' });
        }, 1200);
      } else {
        setProfileMsg({ type: 'error', text: data.message || 'Failed to update profile.' });
      }
    } catch (err) {
      console.warn('Backend unavailable, updating profile locally in storage:', err);
      setCompany(updatedFields);
      localStorage.setItem('currentCompany', JSON.stringify(updatedFields));
      setProfileSubmitting(false);
      setProfileMsg({ type: 'success', text: 'Profile details updated successfully!' });

      setTimeout(() => {
        setShowProfileUpdateModal(false);
        setProfileMsg({ type: '', text: '' });
      }, 1200);
    }
  };

  if (loading && !company) {
    return (
      <div className="dashboard-wrapper" style={{ padding: '4rem', textAlign: 'center' }}>
        <h2>Loading Company Dashboard...</h2>
      </div>
    );
  }

  // Determine current payment status
  const hasPaymentHistory = Boolean(payments && payments.length > 0);
  const pendingPayment = hasPaymentHistory ? payments.find((p) => p.status === 'Pending' || p.status === 'PENDING') : null;
  const currentPayment = pendingPayment || (hasPaymentHistory ? payments[0] : null);

  return (
    <div className="dashboard-wrapper">
      {/* HEADER NAVBAR */}
      <header className="dashboard-header">
        <div className="container dashboard-header-container">
          <div className="dashboard-brand">
            <span className="dashboard-brand-title">MCC MRF Innovation Park</span>
            <span className="dashboard-brand-subtitle">Company Dashboard</span>
          </div>

          <div className="dashboard-user-nav">
            <span className="welcome-text">Welcome, {activeCompany.company_name}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN DASHBOARD CONTENT */}
      <main className="dashboard-main container">
        <div className="dashboard-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 className="dashboard-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#8B0000' }}>Payment Dashboard</h1>
            <p className="dashboard-subtitle" style={{ margin: '4px 0 0 0', fontSize: '0.92rem', color: '#64748B' }}>Manage your monthly rent payments</p>
          </div>
          <div className="dashboard-breadcrumb" style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
            <span style={{ color: '#8B0000', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
            <span style={{ margin: '0 6px' }}>/</span>
            <span style={{ color: '#1F2937' }}>Payments</span>
          </div>
        </div>

        {/* OVERDUE PAYMENT WARNING BANNER */}
        {isPastOverdue && oldestPendingPayment && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '12px',
              padding: '1.1rem 1.35rem',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              color: '#991B1B',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)'
            }}
          >
            <AlertTriangle size={24} color="#DC2626" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '2px', color: '#7F1D1D' }}>
                ⚠️ Action Required: Overdue Payment Notice
              </strong>
              <span style={{ fontSize: '0.86rem', color: '#991B1B' }}>
                You have an unpaid past payment for <strong>{oldestPendingPayment.month_year || oldestPendingPayment.month}</strong> (₹{Number(oldestPendingPayment.amount || activeCompany.monthly_rate || 0).toLocaleString()}). Please clear your past due payment first before paying current or subsequent months.
              </span>
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          {/* COLUMN 1: Company Information */}
          <div className="dashboard-card">
            <h2 className="card-title">Company Information</h2>
            <hr className="card-divider" />
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">S.No:</span>
                <span className="info-value">{activeCompany.s_no || 7}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Contact Person:</span>
                <span className="info-value">{activeCompany.contact_person}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Company Name:</span>
                <span className="info-value">{activeCompany.company_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Contact Number:</span>
                <span className="info-value">{activeCompany.contact_number}</span>
              </div>
              <div className="info-row">
                <span className="info-label">MCC Interns:</span>
                <span className="info-value">{activeCompany.interns_count ?? 0}</span>
              </div>
              <div className="info-row">
                <span className="info-label">MCC Workers:</span>
                <span className="info-value">{activeCompany.workers_count ?? 1}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Monthly Rate:</span>
                <span className="info-value">
                  ₹{Number(activeCompany.monthly_rate || 0).toLocaleString()}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Date of Incubation:</span>
                <span className="info-value">{activeCompany.incubation_date}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email ID:</span>
                <span className="info-value">{activeCompany.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">GST Number:</span>
                <span className="info-value">{activeCompany.gst_number || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Place:</span>
                <span className="info-value">{activeCompany.place || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* COLUMN 2: Current Month Payment OR 2+ Months Overdue Lockout Card */}
          {pendingPayments.length >= 2 ? (
            <div className="dashboard-card" style={{ border: '2px solid #DC2626', backgroundColor: '#FEF2F2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="card-title" style={{ margin: 0, color: '#991B1B' }}>Overdue Payment Lockout</h2>
                <span style={{ backgroundColor: '#DC2626', color: '#FFFFFF', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                  {pendingPayments.length} MONTHS OVERDUE
                </span>
              </div>
              <hr className="card-divider" style={{ backgroundColor: '#FECACA' }} />
              <div className="payment-due-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#991B1B' }}>
                  <AlertTriangle size={20} color="#DC2626" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Current Month Payment Hidden & Suspended</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#7F1D1D', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                  Your account has <strong>{pendingPayments.length} unpaid monthly rent payments</strong> ({pendingPayments.map(p => p.month_year || p.month).join(', ')}). You cannot view or pay current month rent until all past overdue months are cleared in order.
                </p>

                <p className="due-label" style={{ color: '#991B1B' }}>Earliest Overdue Amount Due:</p>
                <h3 className="due-amount" style={{ color: '#DC2626' }}>
                  ₹{Number(oldestPendingPayment?.amount || activeCompany.monthly_rate || 0).toLocaleString()}
                </h3>

                <div className="payment-details">
                  <div className="payment-detail-item">
                    <span className="detail-label">Overdue Month:</span>
                    <span className="detail-value" style={{ color: '#991B1B', fontWeight: 800 }}>
                      {oldestPendingPayment?.month_year || oldestPendingPayment?.month}
                    </span>
                  </div>
                  <div className="payment-detail-item">
                    <span className="detail-label">Account Status:</span>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.85rem'
                      }}
                    >
                      Current Pay Suspended
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="pay-now-btn"
                  style={{ backgroundColor: '#DC2626' }}
                  onClick={openPaymentModal}
                >
                  <CreditCard size={18} />
                  <span>Pay Earliest Overdue ({oldestPendingPayment?.month_year || oldestPendingPayment?.month}) ₹{Number(oldestPendingPayment?.amount || activeCompany.monthly_rate || 0).toLocaleString()}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="dashboard-card" style={{ borderColor: isPastOverdue ? '#FECACA' : '#E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="card-title" style={{ margin: 0 }}>
                  {isPastOverdue ? 'Overdue Payment' : 'Current Month Payment'}
                </h2>
                {isPastOverdue && (
                  <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                    OVERDUE FIRST
                  </span>
                )}
              </div>
              <hr className="card-divider" />
              <div className="payment-due-box">
                <p className="due-label">
                  {isPastOverdue ? 'Overdue Amount Due:' : (currentPayment ? 'Amount Due:' : 'Monthly Workspace Rate:')}
                </p>
                <h3 className="due-amount" style={{ color: isPastOverdue ? '#DC2626' : '#8B0000' }}>
                  ₹{Number((currentPayment && currentPayment.amount) || activeCompany.monthly_rate || 0).toLocaleString()}
                </h3>

                <div className="payment-details">
                  <div className="payment-detail-item">
                    <span className="detail-label">Month:</span>
                    <span className="detail-value">
                      {(currentPayment && (currentPayment.month_year || currentPayment.month)) || 'August 2026'}
                    </span>
                  </div>
                  <div className="payment-detail-item">
                    <span className="detail-label">Due Date:</span>
                    <span className="detail-value">
                      {(currentPayment && currentPayment.due_date) || '31st August 2026'}
                    </span>
                  </div>
                  <div className="payment-detail-item">
                    <span className="detail-label">Status:</span>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor:
                          isPastOverdue
                            ? '#FEF2F2'
                            : (currentPayment?.status === 'Paid' || currentPayment?.status === 'Completed' || currentPayment?.status === 'SUCCESS'
                            ? '#DCFCE7'
                            : currentPayment?.status === 'Pending'
                            ? '#FEF3C7'
                            : '#DCFCE7'),
                        color:
                          isPastOverdue
                            ? '#DC2626'
                            : (currentPayment?.status === 'Paid' || currentPayment?.status === 'Completed' || currentPayment?.status === 'SUCCESS'
                            ? '#16A34A'
                            : currentPayment?.status === 'Pending'
                            ? '#D97706'
                            : '#15803D'),
                        border: isPastOverdue
                          ? '1px solid #FECACA'
                          : (currentPayment
                          ? `1px solid ${currentPayment.status === 'Paid' ? '#86EFAC' : '#FDE68A'}`
                          : '1px solid #86EFAC'),
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.85rem'
                      }}
                    >
                      {isPastOverdue ? 'Overdue (Pending)' : (currentPayment ? (currentPayment.status || 'Pending') : 'Active Account')}
                    </span>
                  </div>
                </div>

                {(!currentPayment || currentPayment.status !== 'Paid') && (
                  <button
                    type="button"
                    className="pay-now-btn"
                    style={{ backgroundColor: isPastOverdue ? '#DC2626' : '#8B0000' }}
                    onClick={openPaymentModal}
                  >
                    <CreditCard size={18} />
                    <span>
                      {isPastOverdue
                        ? `Pay Overdue Payment (${oldestPendingPayment.month_year || oldestPendingPayment.month}) ₹${Number(oldestPendingPayment.amount || activeCompany.monthly_rate || 0).toLocaleString()}`
                        : `Proceed to Pay ₹${Number((currentPayment && currentPayment.amount) || activeCompany.monthly_rate || 0).toLocaleString()}`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* COLUMN 3: Payment History */}
          <div className="dashboard-card history-card-col">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Payment History</h2>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                Showing {Math.min(3, (payments || []).length)} of {(payments || []).length} Records
              </span>
            </div>
            <hr className="card-divider" />
            <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {payments && payments.length > 0 ? (
                (showAllHistory ? payments : payments.slice(0, 3)).map((item) => (
                  <div
                    key={item.id}
                    className="history-item-card"
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* ROW 1: Month Name & Amount */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1F2937' }}>
                          {item.month_year || item.month || 'August 2026'}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '2px' }}>
                          {item.payment_method || 'PayU India (UPI / Card)'}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#8B0000' }}>
                          ₹{Number(item.amount || item.total || activeCompany.monthly_rate || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* ROW 2: Status Badge & Receipt Action */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px dashed #E2E8F0' }}>
                      <span
                        style={{
                          backgroundColor:
                            item.status === 'Paid' || item.status === 'Completed' || item.status === 'SUCCESS' || item.status === 'PAID'
                              ? '#DCFCE7'
                              : '#FEF3C7',
                          color:
                            item.status === 'Paid' || item.status === 'Completed' || item.status === 'SUCCESS' || item.status === 'PAID'
                              ? '#16A34A'
                              : '#D97706',
                          border: `1px solid ${
                            item.status === 'Paid' || item.status === 'Completed' || item.status === 'SUCCESS' || item.status === 'PAID'
                              ? '#86EFAC'
                              : '#FDE68A'
                          }`,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}
                      >
                        {item.status === 'Paid' || item.status === 'Completed' || item.status === 'SUCCESS' || item.status === 'PAID'
                          ? '✓ Completed'
                          : 'Pending'}
                      </span>

                      {(item.status === 'Paid' || item.status === 'Completed' || item.status === 'SUCCESS' || item.status === 'PAID') && (
                        <button
                          type="button"
                          style={{
                            backgroundColor: '#8B0000',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.4rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 4px rgba(139, 0, 0, 0.2)'
                          }}
                          onClick={() => {
                            setSelectedReceiptData({
                              invoice_number: item.invoice_number || `INV-MRF-2026-${String(activeCompany.s_no || activeCompany.id).padStart(5, '0')}`,
                              company_name: activeCompany.company_name,
                              contact_person: activeCompany.contact_person,
                              email_address: activeCompany.email,
                              phone_number: activeCompany.contact_number,
                              place: activeCompany.place,
                              billing_period: item.month_year || item.month || 'August 2026',
                              amount: item.amount || activeCompany.monthly_rate,
                              payment_method: item.payment_method || 'PayU India (UPI / Card)',
                              payment_date: item.created_at || item.date || new Date().toISOString(),
                              payment_id: item.payu_payment_id || item.transaction_id || item.txnid || `pay_${item.id}`
                            });
                          }}
                        >
                          <Receipt size={14} />
                          <span>View Receipt</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '10px',
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    color: '#64748B'
                  }}
                >
                  <Receipt size={32} color="#94A3B8" style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
                    No Payment History
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Completed monthly rent payments will appear here.
                  </span>
                </div>
              )}

              {/* VIEW ALL PAYMENT HISTORY ACTION BUTTON */}
              {payments && payments.length > 3 && (
                <button
                  type="button"
                  className="view-all-history-btn"
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    backgroundColor: '#F1F5F9',
                    color: '#8B0000',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                  }}
                >
                  <span>{showAllHistory ? 'Show Recent 3 Payments Only' : `View All Payment History (${payments.length})`}</span>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: showAllHistory ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </button>
              )}
            </div>
          </div>

          {/* QUICK ACTIONS SECTION (FULL WIDTH) */}
          <div className="dashboard-card quick-actions-card">
            <h2 className="card-title">Quick Actions</h2>
            <hr className="card-divider" />
            <div className="quick-actions-btns">
              <div
                className="action-card-box"
                onClick={() => {
                  setPasswordMsg({ type: '', text: '' });
                  setNewPassword('');
                  setConfirmPassword('');
                  setShowPasswordModal(true);
                }}
              >
                <div className="action-icon-circle maroon">
                  <Lock size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 className="action-title">Change Password</h4>
                  <p className="action-subtext">Update your account password</p>
                </div>
                <ChevronRight size={18} className="action-arrow-icon" />
              </div>

              <div
                className="action-card-box"
                onClick={openProfileUpdateModal}
              >
                <div className="action-icon-circle maroon">
                  <Edit size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 className="action-title">Update Profile</h4>
                  <p className="action-subtext">Update your profile information</p>
                </div>
                <ChevronRight size={18} className="action-arrow-icon" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* RAZORPAY PAYMENT GATEWAY MODAL & STATUS SCREENS */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={closePaymentModal}>
          <div className="payment-gateway-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header Bar */}
            <div className="payment-gateway-header">
              <h2 className="gateway-title">Payment Gateway</h2>
              <button className="close-modal-btn" onClick={closePaymentModal}>
                <X size={20} />
              </button>
            </div>

            {/* IF PAYMENT IS IN PROGRESS OR IDLE */}
            {(paymentState === 'idle' || paymentState === 'creating' || paymentState === 'checkout' || paymentState === 'verifying') && (
              <>
                {/* Modal Body */}
                <div className="payment-gateway-body">
                  <div className="month-select-group">
                    <label className="month-select-label">Select Month Range:</label>
                    <input
                      type="text"
                      className="month-range-input"
                      readOnly
                      value={rangeText}
                    />
                  </div>

                  {/* Month Selection Grid Box */}
                  <div className="month-grid-card">
                    <div className="months-grid">
                      {MONTHS.map((mName, idx) => {
                        const isSelected = idx >= selectedStartMonth && idx <= selectedEndMonth;
                        const isFuture = idx > currentCalendarMonthIdx;
                        return (
                          <button
                            key={mName}
                            type="button"
                            className={`month-cell-btn ${isSelected ? 'active' : ''} ${isFuture ? 'disabled' : ''}`}
                            onClick={() => handleMonthClick(idx)}
                            disabled={isFuture}
                            title={isFuture ? 'Future months cannot be selected for advance payment' : ''}
                          >
                            {mName}
                          </button>
                        );
                      })}
                    </div>
                    <div className="confirm-btn-row">
                      <button
                        type="button"
                        className="confirm-range-btn"
                        onClick={() => alert(`Month range confirmed: ${rangeText}`)}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>

                  {/* Payment Summary Box */}
                  <div className="payment-summary-card">
                    <h3 className="summary-title">Payment Summary</h3>
                    <div className="summary-row">
                      <span>Monthly Rent:</span>
                      <span>₹{monthlyRent.toLocaleString()}</span>
                    </div>
                    <div className="summary-row">
                      <span>GST (18%):</span>
                      <span>₹{gstAmount.toLocaleString()}</span>
                    </div>
                    <hr className="summary-divider" />
                    <div className="summary-row total-row">
                      <span>Total Amount:</span>
                      <span>₹{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons Bar */}
                <div className="gateway-footer">
                  <button
                    type="button"
                    className="gateway-cancel-btn"
                    onClick={closePaymentModal}
                    disabled={paymentState !== 'idle'}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="gateway-proceed-btn"
                    onClick={handleProceedToPayUPayment}
                    disabled={paymentState !== 'idle'}
                  >
                    {getProceedBtnText()}
                  </button>
                </div>
              </>
            )}

            {/* 13. PAYMENT SUCCESS UI */}
            {paymentState === 'success' && paymentResult && (
              <div className="payment-status-card success-card">
                <div className="status-badge-circle success">
                  <CheckCircle size={48} />
                </div>
                <h2 className="status-title">Payment Successful</h2>
                <div className="status-amount">₹{paymentResult.amount?.toLocaleString()}</div>
                <p className="status-desc">Your payment has been successfully received.</p>

                <div className="status-details-box">
                  <div className="status-detail-row">
                    <span>Payment ID:</span>
                    <strong className="code-text">{paymentResult.paymentId}</strong>
                  </div>
                  <div className="status-detail-row">
                    <span>Order ID:</span>
                    <strong className="code-text">{paymentResult.orderId}</strong>
                  </div>
                  <div className="status-detail-row">
                    <span>Date:</span>
                    <strong>{paymentResult.date || '15 August 2026'}</strong>
                  </div>
                </div>

                <div className="status-action-row">
                  <button
                    type="button"
                    className="download-receipt-btn"
                    onClick={() => setShowReceiptModal(true)}
                  >
                    <Download size={16} />
                    <span>Download Receipt</span>
                  </button>
                  <button
                    type="button"
                    className="go-dashboard-btn"
                    onClick={closePaymentModal}
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* 14. PAYMENT FAILURE UI */}
            {paymentState === 'failed' && (
              <div className="payment-status-card failure-card">
                <div className="status-badge-circle failure">
                  <XCircle size={48} />
                </div>
                <h2 className="status-title">Payment Failed</h2>
                <p className="status-desc">
                  {paymentResult?.message || "We couldn't complete your payment. Please try again or choose another payment method."}
                </p>
                <div className="status-action-row">
                  <button
                    type="button"
                    className="go-dashboard-btn"
                    onClick={closePaymentModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="download-receipt-btn"
                    onClick={() => setPaymentState('idle')}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* 15. PAYMENT CANCELLED UI */}
            {paymentState === 'cancelled' && (
              <div className="payment-status-card warning-card">
                <div className="status-badge-circle warning">
                  <AlertTriangle size={48} />
                </div>
                <h2 className="status-title">Payment Cancelled</h2>
                <p className="status-desc">
                  Your payment was not completed. No payment has been confirmed.
                </p>
                <div className="status-action-row">
                  <button
                    type="button"
                    className="go-dashboard-btn"
                    onClick={closePaymentModal}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="download-receipt-btn"
                    onClick={() => setPaymentState('idle')}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 20. PRINTABLE / DOWNLOADABLE PAYMENT RECEIPT MODAL */}
      {showReceiptModal && paymentResult && (
        <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="receipt-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-header">
              <div className="receipt-logo-brand">
                <img src="/mcc-crest-maroon.png" alt="MCC Crest" className="receipt-crest-logo" />
                <div>
                  <h2 className="receipt-brand-main">MCC-MRF INNOVATION PARK</h2>
                  <span className="receipt-brand-sub">Incubation Workspace Official Receipt</span>
                </div>
              </div>
              <button className="close-modal-btn dark" onClick={() => setShowReceiptModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="receipt-body">
              <div className="receipt-status-banner">
                <ShieldCheck size={28} className="shield-icon" />
                <span className="paid-stamp">PAID OFFICIAL RECEIPT</span>
              </div>

              <div className="receipt-grid">
                <div className="receipt-col">
                  <h4>Customer Details</h4>
                  <p><strong>Company:</strong> {activeCompany.company_name}</p>
                  <p><strong>Contact Person:</strong> {activeCompany.contact_person}</p>
                  <p><strong>Email:</strong> {activeCompany.email}</p>
                  <p><strong>Phone:</strong> {activeCompany.contact_number}</p>
                  <p><strong>GSTIN:</strong> {activeCompany.gst_number || '33AAAAA0000A1Z5'}</p>
                </div>

                <div className="receipt-col">
                  <h4>Payment Details</h4>
                  <p><strong>Receipt ID:</strong> {paymentResult.orderId}</p>
                  <p><strong>PayU Reference ID:</strong> {paymentResult.paymentId}</p>
                  <p><strong>Payment Date:</strong> {paymentResult.date}</p>
                  <p><strong>Payment Method:</strong> PayU India (UPI / Card)</p>
                  <p><strong>Status:</strong> <span className="paid-tag">SUCCESS</span></p>
                </div>
              </div>

              <div className="receipt-table-card">
                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Period</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Incubation Workspace Rent ({activeCompany.place || 'Incubation Pod'})</td>
                      <td>{paymentResult.month || rangeText}</td>
                      <td>₹{monthlyRent.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td>GST (18%)</td>
                      <td>Standard Statutory Tax</td>
                      <td>₹{gstAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}><strong>Total Paid Amount</strong></td>
                      <td><strong>₹{totalAmount.toLocaleString()}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="receipt-footer-note">
                <p>This is a computer-generated official receipt for MCC-MRF Innovation Park incubation services.</p>
              </div>
            </div>

            <div className="receipt-actions-bar">
              <button
                type="button"
                className="action-btn outline"
                onClick={() => window.print()}
              >
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                className="action-btn primary"
                onClick={() => {
                  alert('Receipt downloaded successfully');
                  setShowReceiptModal(false);
                }}
              >
                <Download size={16} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE PROFILE DETAILS / CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="profile-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Update Profile Details</h3>
              <button
                type="button"
                className="profile-modal-close"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordMsg({ type: '', text: '' });
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="profile-modal-body">
                {passwordMsg.text && (
                  <div className={`profile-modal-alert ${passwordMsg.type}`}>
                    {passwordMsg.type === 'error' ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <div className="profile-field-group">
                  <label className="profile-field-label">New Password</label>
                  <input
                    type="password"
                    className="profile-field-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">Confirm Password</label>
                  <input
                    type="password"
                    className="profile-field-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <hr className="profile-modal-divider" />

              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="profile-cancel-btn"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordMsg({ type: '', text: '' });
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={passwordSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="profile-update-btn"
                  disabled={passwordSubmitting}
                >
                  {passwordSubmitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE COMPANY PROFILE INFO MODAL (EXACT 5 FIELDS FROM SPEC) */}
      {showProfileUpdateModal && (
        <div className="profile-modal-overlay" onClick={() => setShowProfileUpdateModal(false)}>
          <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header" style={{ backgroundColor: '#800000' }}>
              <h3>Update Profile Details</h3>
              <button
                type="button"
                className="profile-modal-close"
                onClick={() => setShowProfileUpdateModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit}>
              <div className="profile-modal-body">
                {profileMsg.text && (
                  <div className={`profile-modal-alert ${profileMsg.type}`}>
                    {profileMsg.type === 'error' ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    <span>{profileMsg.text}</span>
                  </div>
                )}

                <div className="profile-field-group">
                  <label className="profile-field-label">Company Name</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    required
                  />
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">Contact Number</label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={editContactNumber}
                    onChange={(e) => setEditContactNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">MCC Interns</label>
                  <input
                    type="number"
                    className="profile-field-input"
                    value={editInterns}
                    onChange={(e) => setEditInterns(e.target.value)}
                  />
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">MCC Workers</label>
                  <input
                    type="number"
                    className="profile-field-input"
                    value={editWorkers}
                    onChange={(e) => setEditWorkers(e.target.value)}
                  />
                </div>
              </div>

              <hr className="profile-modal-divider" />

              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="profile-cancel-btn"
                  onClick={() => setShowProfileUpdateModal(false)}
                  disabled={profileSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="profile-update-btn"
                  style={{ backgroundColor: '#800000' }}
                  disabled={profileSubmitting}
                >
                  {profileSubmitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE RECEIPT MODAL */}
      {selectedReceiptData && (
        <InvoiceReceiptModal
          receiptData={selectedReceiptData}
          onClose={() => setSelectedReceiptData(null)}
        />
      )}

      {/* MAIN SITE FOOTER */}
      <Footer />
    </div>
  );
}
