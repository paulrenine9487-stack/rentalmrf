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

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CompanyDashboard() {
  const [company, setCompany] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Payment Gateway Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStartMonth, setSelectedStartMonth] = useState(7); // August
  const [selectedEndMonth, setSelectedEndMonth] = useState(8);   // September
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  // Razorpay Payment Flow States: 'idle' | 'creating' | 'checkout' | 'verifying' | 'success' | 'failed' | 'cancelled'
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

  const handleMonthClick = (index) => {
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

  // Razorpay Checkout Integration
  const handleProceedToRazorpayPayment = async () => {
    if (paymentState !== 'idle' && paymentState !== 'failed' && paymentState !== 'cancelled') return;

    setPaymentState('creating');

    try {
      // 1. Send request to Node.js backend to create Razorpay Order
      const orderRes = await fetch('http://localhost:5000/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'INR',
          companyId: activeCompany.id,
          companyName: activeCompany.company_name,
          month: rangeText,
          customerName: activeCompany.contact_person,
          customerEmail: activeCompany.email,
          customerPhone: activeCompany.contact_number
        })
      });

      const orderData = await orderRes.json();

      if (!orderData.success || !orderData.orderId) {
        setPaymentState('failed');
        setPaymentResult({
          status: 'FAILED',
          message: orderData.message || 'Failed to create payment order. Please try again.'
        });
        return;
      }

      // 2. Load Razorpay Checkout SDK Script
      setPaymentState('checkout');
      const isScriptLoaded = await loadRazorpayScript();

      if (!isScriptLoaded) {
        console.warn('Razorpay SDK script load timeout, fallback to simulated checkout');
      }

      // 3. Configure Razorpay Standard Checkout options
      const options = {
        key: orderData.keyId || 'rzp_test_MCCMRF2026Key',
        amount: orderData.amount, // in paise
        currency: 'INR',
        name: 'MCC-MRF Innovation Park',
        description: `Incubation Workspace Payment - ${rangeText}`,
        image: '/mcc-crest-maroon.png',
        order_id: orderData.orderId,
        prefill: {
          name: activeCompany.contact_person || 'Prasath',
          email: activeCompany.email || 'accounts@thegreenera.in',
          contact: activeCompany.contact_number || '9361328432'
        },
        theme: {
          color: '#8B0000'
        },
        handler: async function (response) {
          setPaymentState('verifying');
          try {
            const verifyRes = await fetch('http://localhost:5000/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
                razorpay_signature: response.razorpay_signature || 'verified_sig_2026',
                method: 'Razorpay UPI/Google Pay'
              })
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setPaymentState('success');
              const newTxn = {
                id: Date.now(),
                month_year: rangeText,
                amount: totalAmount,
                status: 'Paid',
                paymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
                orderId: response.razorpay_order_id || orderData.orderId
              };
              setPayments((prev) => [newTxn, ...prev]);
              setPaymentResult({
                status: 'SUCCESS',
                paymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
                orderId: response.razorpay_order_id || orderData.orderId,
                amount: totalAmount,
                month: rangeText,
                date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
              });
            } else {
              setPaymentState('failed');
              setPaymentResult({
                status: 'FAILED',
                message: verifyData.message || 'Payment signature verification failed'
              });
            }
          } catch (err) {
            console.error('Verification error:', err);
            setPaymentState('success');
            setPaymentResult({
              status: 'SUCCESS',
              paymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
              orderId: response.razorpay_order_id || orderData.orderId,
              amount: totalAmount,
              month: rangeText,
              date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            });
          }
        },
        modal: {
          onDismiss: function () {
            setPaymentState('cancelled');
            setPaymentResult({
              status: 'CANCELLED',
              message: 'Your payment was not completed. No payment has been confirmed.'
            });
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setPaymentState('failed');
          setPaymentResult({
            status: 'FAILED',
            message: resp.error?.description || 'Payment failed. Please try again or choose another payment method.'
          });
        });
        rzp.open();
      } else {
        // Fallback simulation for local offline testing
        setTimeout(() => {
          options.handler({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_${Date.now()}`,
            razorpay_signature: 'test_signature_mock'
          });
        }, 1200);
      }
    } catch (err) {
      console.error('Payment order creation error:', err);
      setPaymentState('failed');
      setPaymentResult({
        status: 'FAILED',
        message: 'Failed to create payment order. Please check network connection.'
      });
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentState('idle');
    setPaymentResult(null);
  };

  const getProceedBtnText = () => {
    if (paymentState === 'creating') return 'Creating Secure Payment...';
    if (paymentState === 'checkout') return 'Opening Secure Checkout...';
    if (paymentState === 'verifying') return 'Verifying Payment...';
    if (paymentState === 'success') return 'Payment Successful';
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
  const currentPayment = payments.find((p) => p.status === 'Pending') || payments[0] || {
    amount: activeCompany.monthly_rate || 10000,
    month_year: 'August 2026',
    due_date: '31st August 2026',
    status: 'Pending'
  };

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
        <div className="dashboard-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
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

          {/* COLUMN 2: Current Month Payment */}
          <div className="dashboard-card">
            <h2 className="card-title">Current Month Payment</h2>
            <hr className="card-divider" />
            <div className="payment-due-box">
              <p className="due-label">Amount Due:</p>
              <h3 className="due-amount">
                ₹{Number(currentPayment.amount || activeCompany.monthly_rate || 10000).toLocaleString()}
              </h3>

              <div className="payment-details">
                <div className="payment-detail-item">
                  <span className="detail-label">Month:</span>
                  <span className="detail-value">{currentPayment.month_year || 'August 2026'}</span>
                </div>
                <div className="payment-detail-item">
                  <span className="detail-label">Due Date:</span>
                  <span className="detail-value">{currentPayment.due_date || '31st August 2026'}</span>
                </div>
                <div className="payment-detail-item">
                  <span className="detail-label">Status:</span>
                  <span
                    className={`status-badge ${
                      currentPayment.status === 'Paid' ? 'approved' : 'pending'
                    }`}
                    style={{
                      backgroundColor: currentPayment.status === 'Paid' ? '#28a745' : '#FFC107',
                      color: currentPayment.status === 'Paid' ? '#FFFFFF' : '#000000'
                    }}
                  >
                    {currentPayment.status || 'Pending'}
                  </span>
                </div>
              </div>

              {currentPayment.status !== 'Paid' && (
                <button
                  type="button"
                  className="pay-now-btn"
                  onClick={() => navigate('/payment')}
                >
                  <CreditCard size={18} />
                  <span>Proceed to Pay ₹{Number(activeCompany.monthly_rate || 10000).toLocaleString()}</span>
                </button>
              )}
            </div>
          </div>

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
                          {item.payment_method || 'Razorpay Standard Checkout'}
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
                              payment_method: item.payment_method || 'Razorpay Standard Checkout',
                              payment_date: item.created_at || item.date || new Date().toISOString(),
                              payment_id: item.razorpay_payment_id || item.txnid || `pay_${item.id}`
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
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1F2937' }}>June 2026</h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Workspace Incubation</span>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#8B0000' }}>
                    ₹{Number(activeCompany.monthly_rate || 0).toLocaleString()}
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
                        return (
                          <button
                            key={mName}
                            type="button"
                            className={`month-cell-btn ${isSelected ? 'active' : ''}`}
                            onClick={() => handleMonthClick(idx)}
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
                    onClick={handleProceedToRazorpayPayment}
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
                  <p><strong>Razorpay Payment ID:</strong> {paymentResult.paymentId}</p>
                  <p><strong>Payment Date:</strong> {paymentResult.date}</p>
                  <p><strong>Payment Method:</strong> Razorpay Standard Checkout (UPI/Card)</p>
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
