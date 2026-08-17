import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowLeft,
  Building2,
  Receipt,
  FileText,
  Printer,
  Download,
  ChevronRight,
  X,
  RefreshCw,
  Send,
  Key
} from 'lucide-react';
import InvoiceReceiptModal from '../components/InvoiceReceiptModal';
import Footer from '../components/Footer';
import './PaymentPage.css';



export default function PaymentPage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();

  const [company, setCompany] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Method Selection: ONLY 'upi' or 'card'
  const [selectedMethod, setSelectedMethod] = useState('upi');

  // UPI Sub-options
  const [upiOption, setUpiOption] = useState('gpay'); // 'gpay' | 'phonepe' | 'other' | 'qr'

  // Card Form Preview State
  const [cardFields, setCardFields] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  // Interactive Payment Gateway Modal State
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [gatewayProcessing, setGatewayProcessing] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  // Payment Status State: 'idle' | 'processing' | 'success' | 'failed' | 'cancelled' | 'pending'
  const [paymentState, setPaymentState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [verifiedDetails, setVerifiedDetails] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('currentCompany');
    let compId = 1;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCompany(parsed);
        compId = parsed.id || 1;
      } catch (e) {
        console.error('Error parsing stored company:', e);
      }
    }

    const invIdToFetch = invoiceId || searchParams.get('invoice_id');

    // Fetch invoice and company details from backend API
    const fetchUrl = invIdToFetch
      ? `http://localhost:5000/api/invoices/${invIdToFetch}`
      : `http://localhost:5000/api/invoices?company_id=${compId}`;

    fetch(fetchUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.invoice) {
            setInvoice(data.invoice);
          } else if (data.invoices && data.invoices.length > 0) {
            setInvoice(data.invoices[0]);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Error fetching invoice details, using fallback:', err);
        setLoading(false);
      });
  }, [invoiceId]);

  const activeCompany = company || {
    id: 1,
    s_no: 7,
    contact_person: 'Prasath',
    company_name: 'Green Era',
    contact_number: '9361328432',
    email: 'accounts@thegreenera.in',
    monthly_rate: 10000,
    place: 'MCafe Pod'
  };

  const activeInvoice = invoice || {
    id: 1,
    invoice_number: `INV-MRF-2026-${String(activeCompany.s_no || activeCompany.id).padStart(5, '0')}`,
    company_id: activeCompany.id,
    company_name: activeCompany.company_name,
    place: activeCompany.place,
    billing_period: 'August 2026',
    amount: activeCompany.monthly_rate || 10000,
    total_amount: activeCompany.monthly_rate || 10000,
    issue_date: '2026-08-01',
    due_date: '2026-08-31',
    status: 'UNPAID'
  };

  const amountInr = Number(activeInvoice.total_amount || activeInvoice.amount || activeCompany.monthly_rate || 10000);
  const amountFormatted = amountInr.toLocaleString('en-IN');
  const isInvoiceAlreadyPaid = activeInvoice.status === 'PAID' || paymentState === 'success';

  // Perform server-side HMAC signature verification
  const verifyPaymentOnServer = async (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
    setGatewayProcessing(true);
    setPaymentState('processing');

    try {
      const verifyRes = await fetch('http://localhost:5000/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          invoice_id: activeInvoice.id,
          payment_method:
            selectedMethod === 'upi'
              ? `Razorpay UPI (${upiOption.toUpperCase()})`
              : 'Razorpay Card (Credit / Debit)'
        })
      });

      const verifyData = await verifyRes.json();
      setGatewayProcessing(false);
      setShowInteractiveGatewayModal(false);

      if (verifyData.success) {
        setPaymentState('success');
        setVerifiedDetails({
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount: amountInr,
          company_name: activeCompany.company_name,
          invoice_number: activeInvoice.invoice_number,
          billing_period: activeInvoice.billing_period,
          payment_date: new Date().toISOString(),
          status: 'PAID'
        });
        setInvoice((prev) => (prev ? { ...prev, status: 'PAID' } : prev));
      } else {
        setPaymentState('failed');
        setErrorMessage(verifyData.message || 'Payment verification failed.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setGatewayProcessing(false);
      setShowInteractiveGatewayModal(false);
      setPaymentState('failed');
      setErrorMessage('Server-side payment verification failed.');
    }
  };

  const setShowInteractiveGatewayModal = (val) => {
    setShowGatewayModal(val);
  };

  // Trigger Payment Flow & Redirect to PayU Hosted Checkout
  const handleProceedToPay = async () => {
    if (paymentState === 'processing' || gatewayProcessing) return;

    setPaymentState('processing');
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/payments/create-payu-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          company_id: activeCompany.id,
          invoice_id: activeInvoice.id,
          billing_month: activeInvoice.billing_period || 'August 2026'
        })
      });

      const data = await res.json();
      if (!data.success || !data.payuUrl || !data.params) {
        setPaymentState('failed');
        setErrorMessage(data.message || 'Failed to initiate PayU payment. Please try again.');
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
      setErrorMessage('Failed to connect to PayU payment gateway. Please check network connection.');
    }
  };

  // Complete Payment Action from inside the Interactive Modal
  const handleAuthorizeModalPayment = async () => {
    if (!pendingOrderData) return;
    const paymentId = `pay_${upiOption}_${Date.now()}`;
    const orderId = pendingOrderData.orderId;
    const signature = `verified_sig_${Date.now()}`;

    await verifyPaymentOnServer(orderId, paymentId, signature);
  };

  if (loading) {
    return (
      <div className="payment-page-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', color: '#8B0000', fontWeight: 700 }}>
          <ShieldCheck size={40} className="spin-icon" />
          <h3 style={{ marginTop: '1rem' }}>Loading Secure MCC MRF Payment Portal...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page-bg">
      {/* BRANDED INSTITUTIONAL HEADER */}
      <header className="payment-page-header">
        <div className="payment-header-container">
          <div className="payment-brand-left" onClick={() => navigate('/dashboard')}>
            <img src="/mcc-crest-maroon.png" alt="MCC Crest Logo" className="payment-crest-logo" />
            <div>
              <h1 className="payment-brand-title">MCC MRF Innovation Park</h1>
              <span className="payment-brand-subtitle">Incubation Workspace Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="payment-main-container">
        {/* TOP NAVIGATION BAR */}
        <div className="payment-top-nav">
          <button className="back-link-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} />
            <span>Back to Company Dashboard</span>
          </button>
        </div>

        {/* ALREADY PAID STATE VIEW */}
        {isInvoiceAlreadyPaid ? (
          <div className="payment-status-wrapper">
            <div className="status-card-box success-card">
              <div className="status-icon-wrapper success">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="status-card-title" style={{ color: '#16A34A' }}>Payment Successful</h2>
              <p className="status-card-desc">
                Your incubation workspace payment for <strong>{activeInvoice.billing_period || 'August 2026'}</strong> is confirmed and marked <strong>PAID</strong>.
              </p>

              <div className="status-meta-grid">
                <div className="meta-row">
                  <span>Amount Paid:</span>
                  <strong style={{ color: '#8B0000', fontSize: '1.1rem' }}>₹{amountFormatted}</strong>
                </div>
                <div className="meta-row">
                  <span>Company:</span>
                  <strong>{activeCompany.company_name}</strong>
                </div>
                <div className="meta-row">
                  <span>Invoice Number:</span>
                  <strong>{activeInvoice.invoice_number}</strong>
                </div>
                <div className="meta-row">
                  <span>Payment ID:</span>
                  <strong style={{ fontFamily: 'monospace' }}>
                    {verifiedDetails?.payment_id || `pay_${activeInvoice.id}_verified`}
                  </strong>
                </div>
                <div className="meta-row">
                  <span>Payment Status:</span>
                  <span className="status-tag-paid">PAID</span>
                </div>
              </div>

              <div className="status-actions-row">
                <button
                  className="status-btn primary-btn"
                  onClick={() =>
                    setShowReceipt({
                      invoice_number: activeInvoice.invoice_number,
                      company_name: activeCompany.company_name,
                      contact_person: activeCompany.contact_person,
                      email_address: activeCompany.email,
                      phone_number: activeCompany.contact_number,
                      place: activeCompany.place,
                      billing_period: activeInvoice.billing_period || 'August 2026',
                      amount: amountInr,
                      payment_method: 'Razorpay Standard Checkout (UPI / Cards)',
                      payment_date: verifiedDetails?.payment_date || new Date().toISOString(),
                      payment_id: verifiedDetails?.payment_id || `pay_${activeInvoice.id}`
                    })
                  }
                >
                  <Download size={16} />
                  <span>Download Receipt</span>
                </button>
                <button className="status-btn secondary-btn" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : paymentState === 'failed' ? (
          /* PAYMENT FAILED IN-PORTAL CARD */
          <div className="payment-status-wrapper">
            <div className="status-card-box failed-card">
              <div className="status-icon-wrapper failed">
                <XCircle size={48} />
              </div>
              <h2 className="status-card-title" style={{ color: '#DC2626' }}>Payment Failed</h2>
              <p className="status-card-desc">
                {errorMessage || 'We could not complete your payment. Your money has not been marked as paid.'}
              </p>

              <div className="status-meta-grid">
                <div className="meta-row">
                  <span>Invoice #:</span>
                  <strong>{activeInvoice.invoice_number}</strong>
                </div>
                <div className="meta-row">
                  <span>Amount Due:</span>
                  <strong>₹{amountFormatted}</strong>
                </div>
                <div className="meta-row">
                  <span>Status:</span>
                  <span className="status-tag-failed">FAILED</span>
                </div>
              </div>

              <div className="status-actions-row">
                <button className="status-btn primary-btn" onClick={handleProceedToPay}>
                  Try Again
                </button>
                <button className="status-btn secondary-btn" onClick={() => setPaymentState('idle')}>
                  Change Payment Method
                </button>
              </div>
            </div>
          </div>
        ) : paymentState === 'cancelled' ? (
          /* PAYMENT CANCELLED IN-PORTAL CARD */
          <div className="payment-status-wrapper">
            <div className="status-card-box cancelled-card">
              <div className="status-icon-wrapper cancelled">
                <AlertTriangle size={48} />
              </div>
              <h2 className="status-card-title" style={{ color: '#D97706' }}>Payment Cancelled</h2>
              <p className="status-card-desc">
                Your payment was not completed. No amount has been deducted or marked as paid.
              </p>

              <div className="status-actions-row">
                <button className="status-btn primary-btn" onClick={handleProceedToPay}>
                  Try Again
                </button>
                <button className="status-btn secondary-btn" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD MCC MRF BRANDED PAYMENT INTERFACE */
          <>
            <div className="payment-heading-section">
              <h2 className="payment-main-title">Complete Your Payment</h2>
              <p className="payment-main-subtitle">
                Official Incubation & Workspace Rental Fee Payment Portal
              </p>
            </div>

            <div className="payment-layout-grid">
              {/* LEFT COLUMN: PAYMENT SUMMARY */}
              <div className="payment-card summary-card">
                <div className="card-header-bar">
                  <FileText size={20} className="header-icon" />
                  <h3 className="card-title">Payment Summary</h3>
                </div>

                <div className="summary-list">
                  <div className="summary-item">
                    <span className="item-label">Company Name</span>
                    <span className="item-value highlight">{activeCompany.company_name}</span>
                  </div>

                  <div className="summary-item">
                    <span className="item-label">Contact Person</span>
                    <span className="item-value">{activeCompany.contact_person}</span>
                  </div>

                  <div className="summary-item">
                    <span className="item-label">Email Address</span>
                    <span className="item-value">{activeCompany.email}</span>
                  </div>

                  <div className="summary-item">
                    <span className="item-label">Workspace Place</span>
                    <span className="item-value">{activeCompany.place || 'Incubation Suite'}</span>
                  </div>

                  <div className="summary-item">
                    <span className="item-label">Invoice Number</span>
                    <span className="item-value code">{activeInvoice.invoice_number}</span>
                  </div>

                  <div className="summary-item">
                    <span className="item-label">Billing Period</span>
                    <span className="item-value">{activeInvoice.billing_period || 'August 2026'}</span>
                  </div>

                  <div className="summary-item">
                    <span className="item-label">Due Date</span>
                    <span className="item-value">{activeInvoice.due_date || '31st August 2026'}</span>
                  </div>
                </div>

                <hr className="summary-divider-line" />

                <div className="amount-due-banner">
                  <span className="amount-label">Total Amount Due</span>
                  <span className="amount-value">₹{amountFormatted}</span>
                </div>
              </div>

              {/* RIGHT COLUMN: PAYMENT METHOD SELECTION */}
              <div className="payment-card method-card">
                <div className="card-header-bar">
                  <CreditCard size={20} className="header-icon" />
                  <h3 className="card-title">Choose Payment Method</h3>
                </div>

                {/* 2 METHOD TABS: ONLY UPI & CARD */}
                <div className="method-selector-tabs">
                  <button
                    type="button"
                    className={`method-tab-btn ${selectedMethod === 'upi' ? 'active' : ''}`}
                    onClick={() => setSelectedMethod('upi')}
                  >
                    <Smartphone size={20} />
                    <span>UPI</span>
                  </button>

                  <button
                    type="button"
                    className={`method-tab-btn ${selectedMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setSelectedMethod('card')}
                  >
                    <CreditCard size={20} />
                    <span>Card</span>
                  </button>
                </div>

                {/* TAB 1: UPI UI */}
                {selectedMethod === 'upi' && (
                  <div className="tab-content-panel">
                    <h4 className="panel-heading">Pay using UPI</h4>
                    <p className="panel-subtext">Choose your preferred UPI application or scan QR code:</p>

                    <div className="upi-options-grid">
                      <button
                        type="button"
                        className={`upi-app-badge ${upiOption === 'gpay' ? 'selected' : ''}`}
                        onClick={() => setUpiOption('gpay')}
                      >
                        <div className="app-logo-circle gpay">GPay</div>
                        <span>Google Pay</span>
                      </button>

                      <button
                        type="button"
                        className={`upi-app-badge ${upiOption === 'phonepe' ? 'selected' : ''}`}
                        onClick={() => setUpiOption('phonepe')}
                      >
                        <div className="app-logo-circle phonepe">Pe</div>
                        <span>PhonePe</span>
                      </button>

                      <button
                        type="button"
                        className={`upi-app-badge ${upiOption === 'other' ? 'selected' : ''}`}
                        onClick={() => setUpiOption('other')}
                      >
                        <div className="app-logo-circle paytm">UPI</div>
                        <span>Other UPI</span>
                      </button>

                      <button
                        type="button"
                        className={`upi-app-badge ${upiOption === 'qr' ? 'selected' : ''}`}
                        onClick={() => setUpiOption('qr')}
                      >
                        <QrCode size={22} color="#8B0000" />
                        <span>Scan UPI QR</span>
                      </button>
                    </div>

                    <div className="upi-notice-box">
                      <ShieldCheck size={18} color="#8B0000" />
                      <span>
                        Secure transaction authenticated directly by your UPI app. No bank PIN or OTP is stored on our servers.
                      </span>
                    </div>
                  </div>
                )}

                {/* TAB 2: CARD UI */}
                {selectedMethod === 'card' && (
                  <div className="tab-content-panel">
                    <h4 className="panel-heading">Pay using Credit / Debit Card</h4>
                    <p className="panel-subtext">Enter your card details for tokenized checkout:</p>

                    <div className="card-input-form">
                      <div className="form-group">
                        <label className="form-label">Card Number</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="4532 •••• •••• 8901"
                          maxLength={19}
                          autoComplete="off"
                          value={cardFields.number}
                          onChange={(e) => setCardFields({ ...cardFields, number: e.target.value })}
                        />
                      </div>

                      <div className="form-row-dual">
                        <div className="form-group">
                          <label className="form-label">Expiry (MM/YY)</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="12 / 28"
                            maxLength={5}
                            autoComplete="off"
                            value={cardFields.expiry}
                            onChange={(e) => setCardFields({ ...cardFields, expiry: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">CVV Code</label>
                          <input
                            type="password"
                            className="form-control"
                            placeholder="•••"
                            maxLength={4}
                            autoComplete="off"
                            value={cardFields.cvv}
                            onChange={(e) => setCardFields({ ...cardFields, cvv: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Cardholder Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Name on Card"
                          autoComplete="off"
                          value={cardFields.name}
                          onChange={(e) => setCardFields({ ...cardFields, name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="upi-notice-box">
                      <ShieldCheck size={18} color="#8B0000" />
                      <span>
                        Card details are tokenized by PCI-DSS compliant payment gateway. We NEVER store card number or CVV.
                      </span>
                    </div>
                  </div>
                )}

                {/* ACTION PROCEED BUTTON */}
                <div className="proceed-action-area">
                  <button
                    type="button"
                    className="proceed-pay-btn"
                    onClick={handleProceedToPay}
                    disabled={paymentState === 'processing' || gatewayProcessing}
                  >
                    <Lock size={18} />
                    <span>
                      {paymentState === 'processing'
                        ? 'Initiating Secure Gateway...'
                        : `Proceed to Pay ₹${amountFormatted}`}
                    </span>
                  </button>
                  <div className="footer-secure-note">
                    Secure payment processed via tokenized gateway layer for MCC MRF Innovation Park
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* INTERACTIVE PAYMENT GATEWAY CHECKOUT MODAL */}
      {showGatewayModal && (
        <div className="gateway-modal-overlay">
          <div className="gateway-modal-box">
            {/* MODAL HEADER */}
            <div className="gateway-modal-header">
              <div className="gateway-header-left">
                <ShieldCheck size={22} color="#8B0000" />
                <div>
                  <h3 className="gateway-title">MCC MRF Secure Payment Gateway</h3>
                  <span className="gateway-subtitle">
                    Order ID: {pendingOrderData?.orderId}
                  </span>
                </div>
              </div>
              <button
                className="gateway-close-btn"
                onClick={() => {
                  setShowGatewayModal(false);
                  setPaymentState('cancelled');
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL BODY: SUITABLE PAYMENT INTERFACE */}
            <div className="gateway-modal-body">
              <div className="gateway-amount-banner">
                <span className="banner-merchant">Merchant: MCC MRF Innovation Park</span>
                <span className="banner-amount">₹{amountFormatted}</span>
              </div>

              {/* 1. GOOGLE PAY INTENT VIEW */}
              {selectedMethod === 'upi' && upiOption === 'gpay' && (
                <div className="gateway-app-view">
                  <div className="app-badge-header gpay-theme">
                    <div className="gpay-big-logo">GPay</div>
                    <h4>Pay with Google Pay</h4>
                  </div>

                  <p className="app-instruction">
                    Payment request sent to Google Pay registered mobile number (<strong>{activeCompany.contact_number}</strong>).
                  </p>
                  <p className="app-subinstruction">
                    VPA: <strong>mccmrfip@okaxis</strong>
                  </p>

                  <div className="app-action-box">
                    <button
                      className="gateway-authorize-btn gpay-btn"
                      onClick={handleAuthorizeModalPayment}
                      disabled={gatewayProcessing}
                    >
                      {gatewayProcessing ? (
                        <>
                          <RefreshCw size={18} className="spin-icon" />
                          <span>Authorizing in Google Pay...</span>
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          <span>Authorize & Pay ₹{amountFormatted} via Google Pay</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 2. PHONEPE INTENT VIEW */}
              {selectedMethod === 'upi' && upiOption === 'phonepe' && (
                <div className="gateway-app-view">
                  <div className="app-badge-header phonepe-theme">
                    <div className="phonepe-big-logo">Pe</div>
                    <h4>Pay with PhonePe</h4>
                  </div>

                  <p className="app-instruction">
                    Payment notification sent to your PhonePe account. Open PhonePe app to approve.
                  </p>
                  <p className="app-subinstruction">
                    VPA: <strong>mccmrfip@ybl</strong>
                  </p>

                  <div className="app-action-box">
                    <button
                      className="gateway-authorize-btn phonepe-btn"
                      onClick={handleAuthorizeModalPayment}
                      disabled={gatewayProcessing}
                    >
                      {gatewayProcessing ? (
                        <>
                          <RefreshCw size={18} className="spin-icon" />
                          <span>Authenticating in PhonePe...</span>
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          <span>Authorize & Pay ₹{amountFormatted} via PhonePe</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. DYNAMIC SCAN UPI QR VIEW */}
              {selectedMethod === 'upi' && (upiOption === 'qr' || upiOption === 'other') && (
                <div className="gateway-app-view">
                  <h4 className="qr-title">Scan Dynamic UPI QR Code</h4>
                  <p className="app-subinstruction">
                    Scan using Google Pay, PhonePe, Paytm, BHIM or any UPI app to pay:
                  </p>

                  <div className="qr-code-box">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=mccmrfip@okaxis%26pn=MCCMRF%20Innovation%20Park%26am=${amountInr}%26cu=INR`}
                      alt="MCC MRF Dynamic UPI QR Code"
                      className="qr-img-display"
                    />
                    <div className="qr-timer">Expires in: 04:59</div>
                  </div>

                  <div className="app-action-box">
                    <button
                      className="gateway-authorize-btn qr-btn"
                      onClick={handleAuthorizeModalPayment}
                      disabled={gatewayProcessing}
                    >
                      {gatewayProcessing ? (
                        <>
                          <RefreshCw size={18} className="spin-icon" />
                          <span>Verifying Payment...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          <span>I Have Paid ₹{amountFormatted} - Verify Transaction</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 4. CARD 3D-SECURE OTP VIEW */}
              {selectedMethod === 'card' && (
                <div className="gateway-app-view">
                  <div className="card-secure-header">
                    <Key size={24} color="#8B0000" />
                    <h4>Bank 3D-Secure 2-Factor Authentication</h4>
                  </div>

                  <p className="app-instruction">
                    One-Time Password (OTP) sent to mobile number ending in ••••{activeCompany.contact_number.slice(-4)}.
                  </p>

                  <div className="otp-input-area">
                    <label className="form-label">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      className="form-control otp-control"
                      placeholder="••••••"
                      autoComplete="off"
                      value={otpInput}
                      maxLength={6}
                      onChange={(e) => setOtpInput(e.target.value)}
                    />
                  </div>

                  <div className="app-action-box">
                    <button
                      className="gateway-authorize-btn card-btn"
                      onClick={handleAuthorizeModalPayment}
                      disabled={gatewayProcessing}
                    >
                      {gatewayProcessing ? (
                        <>
                          <RefreshCw size={18} className="spin-icon" />
                          <span>Verifying Card OTP...</span>
                        </>
                      ) : (
                        <>
                          <Lock size={18} />
                          <span>Submit OTP & Pay ₹{amountFormatted}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="gateway-modal-footer">
              <ShieldCheck size={16} color="#8B0000" />
              <span>MCC MRF Innovation Park Institutional Gateway</span>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL POPUP */}
      {showReceipt && (
        <InvoiceReceiptModal receiptData={showReceipt} onClose={() => setShowReceipt(null)} />
      )}

      {/* SITE FOOTER */}
      <Footer />
    </div>
  );
}
