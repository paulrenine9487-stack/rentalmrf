import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import '../styles/global.css';

export default function PaymentCancelledPage() {
  const [searchParams] = useSearchParams();
  const txnid = searchParams.get('txnid') || '';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '40px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '520px', width: '100%', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
        
        {/* Header Banner */}
        <div style={{ backgroundColor: '#D97706', color: '#FFFFFF', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <XCircle size={36} color="#D97706" />
          </div>
          <h1 style={{ color: '#FFFFFF', margin: 0, fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 800 }}>MCC MRF INNOVATION PARK</h1>
          <div style={{ color: '#FEF3C7', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '6px' }}>
            PAYMENT CANCELLED
          </div>
        </div>

        {/* Cancelled Body */}
        <div style={{ padding: '32px 28px' }}>
          <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 20px 0', textAlign: 'center' }}>
            Your rent payment transaction on <strong>PayU</strong> was cancelled. No charges were made to your bank account or card.
          </p>

          {txnid && (
            <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400E', textTransform: 'uppercase' }}>Reference Transaction ID</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#78350F', fontFamily: 'monospace', marginTop: '2px' }}>{txnid}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              to="/dashboard"
              style={{ backgroundColor: '#8B0000', color: '#FFFFFF', textDecoration: 'none', borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <RefreshCw size={18} /> Retry Payment
            </Link>

            <Link
              to="/dashboard"
              style={{ backgroundColor: '#F1F5F9', color: '#1E293B', textDecoration: 'none', borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #CBD5E1' }}
            >
              <ArrowLeft size={18} /> Return to Payment Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
