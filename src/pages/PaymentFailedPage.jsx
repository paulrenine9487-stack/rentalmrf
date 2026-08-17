import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import '../styles/global.css';

export default function PaymentFailedPage() {
  const [searchParams] = useSearchParams();
  const txnid = searchParams.get('txnid') || 'MRF-INV-2026-001';
  const reason = searchParams.get('reason') || 'Transaction could not be completed by PayU gateway.';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '40px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '540px', width: '100%', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #FECACA', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
        
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

          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '18px', marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transaction ID</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#7F1D1D', fontFamily: 'monospace', marginTop: '2px' }}>{txnid}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '12px' }}>Failure Reason</div>
            <div style={{ fontSize: '13.5px', color: '#991B1B', marginTop: '2px', lineHeight: '1.4' }}>{reason}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              to="/dashboard"
              style={{ backgroundColor: '#8B0000', color: '#FFFFFF', textDecoration: 'none', borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <RefreshCw size={18} /> Try Again
            </Link>

            <Link
              to="/dashboard"
              style={{ backgroundColor: '#F1F5F9', color: '#1E293B', textDecoration: 'none', borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #CBD5E1' }}
            >
              <ArrowLeft size={18} /> Back to Payment Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
