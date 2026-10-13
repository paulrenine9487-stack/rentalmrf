import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, ArrowLeft, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';
import '../styles/global.css';

export default function PaymentFailedPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txnid = searchParams.get('txnid') || 'MRF-INV-2026-001';
  const reason = searchParams.get('reason') || 'Transaction could not be completed by PayU gateway.';


  const isVpaError = reason && (reason.toLowerCase().includes('vpa') || reason.toLowerCase().includes('wrong vpa'));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '40px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '560px', width: '100%', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #FECACA', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
        
        {/* Header Banner */}
        <div style={{ backgroundColor: '#DC2626', color: '#FFFFFF', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <AlertTriangle size={36} color="#DC2626" />
          </div>
          <h1 style={{ color: '#FFFFFF', margin: 0, fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 800 }}>MCC MRF INNOVATION PARK</h1>
          <div style={{ color: '#FEE2E2', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '6px' }}>
            PAYMENT FAILED
          </div>
        </div>

        {/* Failed Body */}
        <div style={{ padding: '32px 28px' }}>
          <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 20px 0', textAlign: 'center' }}>
            We could not complete your rent payment through <strong>PayU Payment Gateway</strong>.
          </p>

          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '18px', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transaction ID</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#7F1D1D', fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-all' }}>{txnid}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '12px' }}>Failure Reason</div>
            <div style={{ fontSize: '13.5px', color: '#991B1B', marginTop: '2px', lineHeight: '1.4' }}>{reason}</div>
          </div>

          {/* PayU Test Sandbox Explanation & Direct Solutions */}
          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '18px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} color="#2563EB" />
              <span>Why Did PayU Show This in Test Mode?</span>
            </div>
            
            <p style={{ fontSize: '12.5px', color: '#1E3A8A', margin: '8px 0 12px 0', lineHeight: '1.5' }}>
              PayU is currently connected in <strong>Test / Sandbox Mode</strong> (<code>test.payu.in</code>). In sandbox mode, real personal UPI IDs (like Google Pay or PhonePe) cannot connect to real bank servers and are rejected by PayU sandbox.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ backgroundColor: '#DBEAFE', padding: '10px 12px', borderRadius: '8px', color: '#1E40AF' }}>
                <strong>Option 1 (Cards in Test Mode - 100% Reliable):</strong> On the PayU page, select <strong>Card</strong> & enter card number <code style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>4012001037141112</code> (any exp: 12/28, cvv: 123). PayU gives an instant <strong>"Successful"</strong> button!
              </div>

              <div style={{ backgroundColor: '#DBEAFE', padding: '10px 12px', borderRadius: '8px', color: '#1E40AF' }}>
                <strong>Option 2 (Real UPI Payments):</strong> To accept real payments from live Google Pay / PhonePe, switch to <strong>Production Mode</strong> with live credentials in Admin Settings.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <Link
              to="/dashboard"
              style={{
                backgroundColor: '#8B0000',
                color: '#FFFFFF',
                textDecoration: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={18} /> Try Again with Card / Net Banking
            </Link>

            <Link
              to="/dashboard"
              style={{
                backgroundColor: '#F1F5F9',
                color: '#1E293B',
                textDecoration: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: '1px solid #CBD5E1'
              }}
            >
              <ArrowLeft size={18} /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
