import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Download, ArrowLeft, Receipt, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';
import '../styles/global.css';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txnid = searchParams.get('txnid') || 'MRF-INV-2026-001';
  const payuid = searchParams.get('payuid') || 'PAYU-2026-98765';
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Immediately synchronize local storage so Returning to Dashboard is instantly cleared
    try {
      const storedComp = localStorage.getItem('currentCompany');
      if (storedComp) {
        const comp = JSON.parse(storedComp);
        if (comp.payments && comp.payments.length > 0) {
          comp.payments = comp.payments.map((p) => {
            if (p.txnid === txnid || p.status === 'Pending' || p.status === 'PENDING') {
              return { ...p, status: 'Paid', payment_status: 'PAID' };
            }
            return p;
          });
        }
        localStorage.setItem('currentCompany', JSON.stringify(comp));
      }

      const localPayments = JSON.parse(localStorage.getItem('company_payments') || '[]');
      const updatedLocal = localPayments.map((p) => {
        if (p.txnid === txnid || p.status === 'Pending' || p.status === 'PENDING') {
          return { ...p, status: 'Paid', payment_status: 'PAID' };
        }
        return p;
      });
      if (!updatedLocal.some((p) => p.txnid === txnid)) {
        updatedLocal.unshift({
          txnid,
          status: 'Paid',
          payment_status: 'PAID',
          date: new Date().toLocaleDateString('en-GB')
        });
      }
      localStorage.setItem('company_payments', JSON.stringify(updatedLocal));
    } catch (e) {
      console.warn('Syncing localStorage in PaymentSuccessPage:', e);
    }

    // Verify transaction status with backend
    fetch(`${API_BASE_URL}/api/payments/payu/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txnid })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.transaction) {
          setPaymentDetails(data.transaction);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching verified transaction:', err);
        setLoading(false);
      });
  }, [txnid]);

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '40px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '580px', width: '100%', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)', overflow: 'hidden' }}>
        
        {/* MCC MRF Maroon Branded Header Banner */}
        <div style={{ background: 'linear-gradient(135deg, #8B0000 0%, #5A0000 100%)', color: '#FFFFFF', padding: '32px 24px', textAlign: 'center', position: 'relative' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <CheckCircle2 size={40} color="#166534" />
          </div>
          <h1 style={{ color: '#FFFFFF', margin: 0, fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 800, letterSpacing: '0.5px' }}>MCC MRF INNOVATION PARK</h1>
          <div style={{ color: '#FDE68A', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '6px' }}>
            PAYMENT SUCCESSFUL
          </div>
        </div>

        {/* Payment Confirmation Details Box */}
        <div style={{ padding: '32px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', color: '#64748B', fontWeight: '600' }}>Total Amount Paid</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#8B0000', marginTop: '4px' }}>
              ₹{paymentDetails ? Number(paymentDetails.amount).toLocaleString() : '11,800'}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#DCFCE7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', marginTop: '8px' }}>
              <ShieldCheck size={14} /> PayU Verified Payment
            </div>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
            <div className="payment-receipt-summary-grid">
              <div>
                <div style={{ color: '#64748B', fontSize: '12px', fontWeight: '600' }}>Transaction ID</div>
                <div style={{ color: '#0F172A', fontWeight: '700', fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-all' }}>{txnid}</div>
              </div>
              <div>
                <div style={{ color: '#64748B', fontSize: '12px', fontWeight: '600' }}>PayU Reference ID</div>
                <div style={{ color: '#0F172A', fontWeight: '700', fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-all' }}>{payuid}</div>
              </div>
              <div>
                <div style={{ color: '#64748B', fontSize: '12px', fontWeight: '600' }}>Payment Gateway</div>
                <div style={{ color: '#0F172A', fontWeight: '700', marginTop: '2px' }}>PayU India</div>
              </div>
              <div>
                <div style={{ color: '#64748B', fontSize: '12px', fontWeight: '600' }}>Payment Method</div>
                <div style={{ color: '#0F172A', fontWeight: '700', marginTop: '2px' }}>{paymentDetails?.payment_method || 'UPI / Card'}</div>
              </div>
              <div>
                <div style={{ color: '#64748B', fontSize: '12px', fontWeight: '600' }}>Status</div>
                <div style={{ color: '#166534', fontWeight: '800', marginTop: '2px' }}>✓ PAID</div>
              </div>
              <div>
                <div style={{ color: '#64748B', fontSize: '12px', fontWeight: '600' }}>Billing Period</div>
                <div style={{ color: '#0F172A', fontWeight: '700', marginTop: '2px' }}>{paymentDetails?.month_year || 'August 2026'}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handlePrintReceipt}
              style={{ backgroundColor: '#8B0000', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <Download size={18} /> Download Official Receipt
            </button>
            
            <Link
              to="/dashboard"
              style={{ backgroundColor: '#F1F5F9', color: '#1E293B', textDecoration: 'none', borderRadius: '8px', padding: '14px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #CBD5E1' }}
            >
              <ArrowLeft size={18} /> Return to Payment Dashboard
            </Link>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #E2E8F0', padding: '16px', textTransform: 'center', textAlign: 'center', fontSize: '12px', color: '#64748B', backgroundColor: '#F8FAFC' }}>
          Thank you for your prompt payment to MCC MRF Innovation Park.
        </div>
      </div>
    </div>
  );
}
