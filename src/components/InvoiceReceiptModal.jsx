import React from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Building2, Calendar, CreditCard, Mail, Phone, MapPin } from 'lucide-react';

export default function InvoiceReceiptModal({ receiptData, onClose }) {
  if (!receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const amountFormatted = Number(receiptData.amount || 0).toLocaleString();
  const taxFormatted = Math.round(Number(receiptData.amount || 0) * 0.18).toLocaleString();
  const totalFormatted = (Number(receiptData.amount || 0) + Math.round(Number(receiptData.amount || 0) * 0.18)).toLocaleString();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="receipt-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            backgroundColor: '#8B0000',
            color: '#FFFFFF',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={24} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
              Official Payment Receipt
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handlePrint}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer'
              }}
            >
              <Printer size={15} />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div
          id="printable-receipt-area"
          style={{
            padding: '2rem',
            overflowY: 'auto',
            flex: 1,
            backgroundColor: '#FFFFFF',
            color: '#1F2937',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          {/* Top Brand Banner */}
          <div className="receipt-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img
                src="/mcc-crest-maroon.png"
                alt="MCC Emblem"
                style={{ height: '55px', width: 'auto' }}
              />
              <div>
                <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: '1.35rem', fontWeight: 800, color: '#8B0000' }}>
                  MCC-MRF INNOVATION PARK
                </h2>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#650000', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Nurturing Innovation & Entrepreneurship
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                <CheckCircle2 size={16} />
                <span>PAID</span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                Invoice #: <strong>{receiptData.invoice_number || 'INV-MRF-2026-00001'}</strong>
              </div>
            </div>
          </div>

          {/* Grid Information */}
          <div className="receipt-info-grid">
            {/* Left Column: Billed To */}
            <div
              style={{
                backgroundColor: '#F6F7F9',
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid #E5E7EB'
              }}
            >
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#8B0000', letterSpacing: '0.05em' }}>
                Billed To (Company)
              </h4>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1F2937', marginBottom: '0.25rem' }}>
                {receiptData.company_name}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#4B5563', marginBottom: '0.25rem' }}>
                Contact Person: {receiptData.contact_person || 'N/A'}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#4B5563', marginBottom: '0.25rem' }}>
                Email: {receiptData.email_address || 'N/A'}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#4B5563' }}>
                Phone: {receiptData.phone_number || 'N/A'}
              </div>
            </div>

            {/* Right Column: Payment Details */}
            <div
              style={{
                backgroundColor: '#F6F7F9',
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid #E5E7EB'
              }}
            >
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#8B0000', letterSpacing: '0.05em' }}>
                Transaction Summary
              </h4>
              <div style={{ fontSize: '0.84rem', color: '#4B5563', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>PayU Transaction ID:</span>
                <strong style={{ color: '#1F2937' }}>{receiptData.payment_id || 'MRF-INV-2026-00001'}</strong>
              </div>
              <div style={{ fontSize: '0.84rem', color: '#4B5563', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment Gateway / Method:</span>
                <strong style={{ color: '#1F2937' }}>{receiptData.payment_method || 'PayU India (UPI / Card)'}</strong>
              </div>
              <div style={{ fontSize: '0.84rem', color: '#4B5563', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Billing Period:</span>
                <strong style={{ color: '#1F2937' }}>{receiptData.billing_period || 'August 2026'}</strong>
              </div>
              <div style={{ fontSize: '0.84rem', color: '#4B5563', display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment Date:</span>
                <strong style={{ color: '#1F2937' }}>
                  {receiptData.payment_date ? new Date(receiptData.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '15 Aug 2026'}
                </strong>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="receipt-table-wrapper">
            <table style={{ width: '100%', minWidth: '450px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#8B0000', color: '#FFFFFF', textAlign: 'left', fontSize: '0.82rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.65rem 1rem', borderTopLeftRadius: '6px' }}>Description</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Workspace</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'right', borderTopRightRadius: '6px' }}>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E7EB', fontSize: '0.88rem' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                    Incubation Workspace Monthly Fee ({receiptData.billing_period || 'August 2026'})
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748B' }}>
                    {receiptData.place || 'Incubation Suite'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                    ₹{amountFormatted}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Box */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
            <div style={{ width: '260px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.88rem', color: '#64748B' }}>
                <span>Subtotal:</span>
                <span>₹{amountFormatted}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.88rem', color: '#64748B' }}>
                <span>GST (18% Included):</span>
                <span>₹{taxFormatted}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  padding: '0.65rem 0',
                  borderTop: '2px solid #8B0000',
                  marginTop: '0.25rem',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#8B0000'
                }}
              >
                <span>Total Amount Paid:</span>
                <span>₹{amountFormatted}</span>
              </div>
            </div>
          </div>

          {/* Footer Contact Banner */}
          <div
            style={{
              backgroundColor: '#F6F7F9',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              fontSize: '0.78rem',
              color: '#64748B',
              textAlign: 'center'
            }}
          >
            <strong style={{ color: '#8B0000', display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
              MCC MRF Innovation Park
            </strong>
            <div>East Tambaram, Chennai, 600059, Tamil Nadu | Phone: +91 72000 99955 | Email: Info@mccmrfip.com</div>
            <div style={{ marginTop: '0.5rem', color: '#94A3B8', fontSize: '0.74rem' }}>
              This is a computer-generated tax receipt and requires no physical signature. Verified via Razorpay Secure Checkout.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
