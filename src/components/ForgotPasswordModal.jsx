import React, { useState, useEffect } from 'react';
import { Mail, Lock, KeyRound, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, X, RefreshCw, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';
import './ForgotPasswordModal.css';

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  defaultEmail = '',
  onSuccess,
  isAdmin = false
}) {
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP & Reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', text: '' });
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail || '');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setAlert({ type: '', text: '' });
      setStep(1);
      setResendCooldown(0);
    }
  }, [isOpen, defaultEmail]);

  useEffect(() => {
    let timer = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Step 1: Send OTP to registered Gmail / Email
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setAlert({ type: '', text: '' });

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setAlert({ type: 'error', text: 'Please enter your registered email address.' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setStep(2);
        setResendCooldown(45); // 45 seconds cooldown
        setAlert({
          type: 'success',
          text: data.message || `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your Gmail inbox.`
        });
      } else {
        setAlert({
          type: 'error',
          text: data.message || 'No registered account found with this email address.'
        });
      }
    } catch (err) {
      console.warn('Network issue sending OTP:', err);
      setLoading(false);
      setAlert({
        type: 'error',
        text: 'Unable to connect to authentication server. Please verify your internet or try again.'
      });
    }
  };

  // Step 2: Verify OTP and update password
  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setAlert({ type: '', text: '' });

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setAlert({ type: 'error', text: 'Please enter the 6-digit verification code sent to your Gmail.' });
      return;
    }

    if (!newPassword || newPassword.trim() === '') {
      setAlert({ type: 'error', text: 'Please enter a new password.' });
      return;
    }

    if (newPassword.length < 4) {
      setAlert({ type: 'error', text: 'New password must be at least 4 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlert({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: cleanOtp,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setAlert({
          type: 'success',
          text: 'Password updated successfully! You can now log in with your new password.'
        });

        // Update local cache if company
        const cleanEmail = email.trim().toLowerCase();
        try {
          const passMap = JSON.parse(localStorage.getItem('company_passwords_map') || '{}');
          passMap[cleanEmail] = newPassword;
          localStorage.setItem('company_passwords_map', JSON.stringify(passMap));
        } catch (err) {}

        if (onSuccess) {
          onSuccess(email.trim(), newPassword);
        }

        setTimeout(() => {
          onClose();
        }, 1600);
      } else {
        setAlert({
          type: 'error',
          text: data.message || 'Invalid verification code or failed to reset password.'
        });
      }
    } catch (err) {
      console.warn('Network issue verifying OTP:', err);
      setLoading(false);
      setAlert({
        type: 'error',
        text: 'Connection error while verifying code. Please try again.'
      });
    }
  };

  return (
    <div className="forgot-otp-overlay" onClick={onClose}>
      <div className="forgot-otp-modal" onClick={(e) => e.stopPropagation()}>
        {/* Top Maroon Header Banner */}
        <div className="forgot-otp-header">
          <div className="forgot-otp-header-left">
            <div className="forgot-otp-icon-bubble">
              {isAdmin ? <ShieldCheck size={22} color="#FFFFFF" /> : <KeyRound size={22} color="#FFFFFF" />}
            </div>
            <div>
              <h3 className="forgot-otp-title">
                {isAdmin ? 'Admin Password Recovery' : 'Reset Account Password'}
              </h3>
              <p className="forgot-otp-subtitle">
                {step === 1
                  ? 'Verify your registered Gmail to reset your password'
                  : 'Enter verification code & create new password'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="forgot-otp-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Step Indicator */}
        <div className="forgot-otp-steps-bar">
          <div className={`forgot-otp-step-item ${step === 1 ? 'active' : 'completed'}`}>
            <span className="step-num">1</span>
            <span className="step-text">Gmail Verification</span>
          </div>
          <div className="forgot-otp-step-divider" />
          <div className={`forgot-otp-step-item ${step === 2 ? 'active' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-text">Set New Password</span>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="forgot-otp-body">
          {alert.text && (
            <div className={`forgot-otp-alert ${alert.type}`}>
              {alert.type === 'error' ? (
                <AlertTriangle size={18} className="alert-icon" />
              ) : (
                <CheckCircle2 size={18} className="alert-icon" />
              )}
              <span>{alert.text}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Enter Email & Request OTP */
            <form onSubmit={handleSendOtp} className="forgot-otp-form">
              <div className="forgot-field-group">
                <label className="forgot-field-label" htmlFor="forgot-email-input">
                  Registered Gmail / Email Address *
                </label>
                <div className="forgot-input-wrap">
                  <Mail size={18} className="forgot-input-icon" />
                  <input
                    id="forgot-email-input"
                    type="email"
                    className="forgot-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com or registered email"
                    autoFocus
                    required
                  />
                </div>
                <p className="forgot-field-hint">
                  A 6-digit one-time verification code (OTP) will be sent to your Gmail inbox.
                </p>
              </div>

              <div className="forgot-footer-actions">
                <button
                  type="button"
                  className="forgot-btn-secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="forgot-btn-primary"
                  disabled={loading || !email.trim()}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="spin-icon" />
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: Enter 6-digit OTP, New Password, Confirm Password */
            <form onSubmit={handleVerifyAndReset} className="forgot-otp-form">
              <div className="forgot-sent-banner">
                <div className="sent-info">
                  <Mail size={16} className="sent-icon" />
                  <span>
                    Code sent to: <strong>{email}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="change-email-btn"
                  onClick={() => {
                    setStep(1);
                    setAlert({ type: '', text: '' });
                  }}
                  disabled={loading}
                >
                  <ArrowLeft size={13} />
                  <span>Change Email</span>
                </button>
              </div>

              {/* 6-Digit Verification Code */}
              <div className="forgot-field-group">
                <div className="forgot-label-row">
                  <label className="forgot-field-label" htmlFor="forgot-otp-input">
                    6-Digit Verification Code *
                  </label>
                  <button
                    type="button"
                    className="resend-otp-btn"
                    onClick={handleSendOtp}
                    disabled={loading || resendCooldown > 0}
                  >
                    {resendCooldown > 0 ? (
                      `Resend Code (${resendCooldown}s)`
                    ) : (
                      'Resend Code'
                    )}
                  </button>
                </div>
                <div className="forgot-input-wrap">
                  <KeyRound size={18} className="forgot-input-icon" />
                  <input
                    id="forgot-otp-input"
                    type="text"
                    maxLength={6}
                    className="forgot-input otp-code-input"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    autoFocus
                    required
                  />
                </div>
                <p className="forgot-field-hint">
                  Check your Gmail Inbox (or Spam/Promotions tab). Code is valid for 15 minutes.
                </p>
              </div>

              {/* New Password */}
              <div className="forgot-field-group">
                <label className="forgot-field-label" htmlFor="forgot-new-pass">
                  New Password *
                </label>
                <div className="forgot-input-wrap">
                  <Lock size={18} className="forgot-input-icon" />
                  <input
                    id="forgot-new-pass"
                    type={showNewPassword ? 'text' : 'password'}
                    className="forgot-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    required
                  />
                  <button
                    type="button"
                    className="forgot-eye-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="forgot-field-group">
                <label className="forgot-field-label" htmlFor="forgot-confirm-pass">
                  Confirm New Password *
                </label>
                <div className="forgot-input-wrap">
                  <Lock size={18} className="forgot-input-icon" />
                  <input
                    id="forgot-confirm-pass"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="forgot-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    className="forgot-eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="forgot-footer-actions">
                <button
                  type="button"
                  className="forgot-btn-secondary"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="forgot-btn-primary"
                  disabled={loading || otp.length < 6 || !newPassword}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="spin-icon" />
                      <span>Verifying & Resetting...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code & Reset Password</span>
                      <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
