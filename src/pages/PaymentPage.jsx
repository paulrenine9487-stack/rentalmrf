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
import { API_BASE_URL } from '../utils/apiConfig';
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
      ? `${API_BASE_URL}/api/invoices/${invIdToFetch}`
      : `${API_BASE_URL}/api/invoices?company_id=${compId}`;

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

  const paramMonth = searchParams.get('month');
  const paramAmount = searchParams.get('amount');
  const paramTxnId = searchParams.get('txnid');

  let checkoutStored = null;
  try {
    const raw = localStorage.getItem('pending_payment_checkout');
    if (raw) checkoutStored = JSON.parse(raw);
  } catch (e) {}

  const activeInvoice = invoice || {
    id: invoiceId || checkoutStored?.id || 1,
    invoice_number: `INV-MRF-2026-${String(activeCompany.s_no || activeCompany.id).padStart(5, '0')}`,
    company_id: activeCompany.id,
    company_name: activeCompany.company_name,
    place: activeCompany.place,
    billing_period: paramMonth || checkoutStored?.month || 'August 2026',
    amount: Number(paramAmount || checkoutStored?.amount || activeCompany.monthly_rate || 10000),
    total_amount: Number(paramAmount || checkoutStored?.amount || activeCompany.monthly_rate || 10000),
    txnid: paramTxnId || checkoutStored?.txnid || `TXN${Date.now()}`,
    issue_date: '2026-08-01',
    due_date: '2026-08-31',
    status: 'UNPAID'
  };

  const amountInr = Number(activeInvoice.total_amount || activeInvoice.amount || activeCompany.monthly_rate || 10000);
  const amountFormatted = amountInr.toLocaleString('en-IN');
  const hasIncomingPaymentIntent = Boolean(paramMonth || paramAmount || paramTxnId || checkoutStored);
  const isInvoiceAlreadyPaid = paymentState === 'success' || (activeInvoice.status === 'PAID' && !hasIncomingPaymentIntent);

  // Trigger PayU Payment Flow & Redirect to official PayU Hosted Checkout Page
  const handleProceedToPay = async () => {
    if (paymentState === 'processing' || gatewayProcessing) return;

    setPaymentState('processing');
    setErrorMessage('');

    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/create-payu-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          company_id: activeCompany?.id || 1,
          invoice_id: activeInvoice?.id || 1,
          billing_month: activeInvoice?.billing_period || 'August 2026'
        })
      });

      const data = await res.json();
      const targetPayUUrl = data?.payuUrl || 'https://test.payu.in/_payment';

      if (data.success && data.params) {
        // Automatically submit hidden HTML form directly to official PayU Hosted Checkout Gateway
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = targetPayUUrl;

        Object.keys(data.params).forEach((key) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = data.params[key] != null ? data.params[key] : '';
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        return;
      }

      setPaymentState('failed');
      setErrorMessage(data?.message || 'Failed to initiate PayU payment session. Please check server configuration.');
    } catch (err) {
      console.error('Error initiating PayU checkout:', err);
      setPaymentState('failed');
      setErrorMessage('Network error connecting to PayU payment gateway. Please try again.');
    }
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
                      payment_method: 'PayU India (UPI / Cards)',
                      payment_date: verifiedDetails?.payment_date || new Date().toISOString(),
                      payment_id: verifiedDetails?.payment_id || `pay_${activeInvoice.id}`
                    })
                  }
                >
                  <Download size={16} />
                  <span>Download Receipt</span>
                </button>
                <button
                  className="status-btn"
                  style={{ backgroundColor: '#8B0000', color: '#FFFFFF', border: 'none' }}
                  onClick={() => {
                    setInvoice((prev) => (prev ? { ...prev, status: 'UNPAID' } : null));
                    setPaymentState('idle');
                  }}
                >
                  <CreditCard size={16} />
                  <span>Pay Rent / New Payment</span>
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

                <div className="proceed-action-area" style={{ marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="proceed-pay-btn"
                    onClick={handleProceedToPay}
                    disabled={paymentState === 'processing' || gatewayProcessing}
                    style={{
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '10px',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.65rem',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)'
                    }}
                  >
                    <Lock size={20} />
                    <span>
                      {paymentState === 'processing'
                        ? 'Opening PayU Gateway...'
                        : `Proceed to PayU Checkout ₹${amountFormatted}`}
                    </span>
                  </button>
                  <div className="footer-secure-note" style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748B' }}>
                    100% Secure Payment processed via PayU Gateway for MCC MRF Innovation Park
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* RECEIPT MODAL POPUP */}
      {showReceipt && (
        <InvoiceReceiptModal receiptData={showReceipt} onClose={() => setShowReceipt(null)} />
      )}

      {/* SITE FOOTER */}
      <Footer />
    </div>
  );
}
