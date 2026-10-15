import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, KeyRound, ShieldCheck, ArrowRight, UserCheck, Sparkles, ShieldAlert } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/passwordGenerator';
import { checkPasswordBreach } from '../utils/hibpClient';
import { API_BASE_URL } from '../utils/apiConfig';
import './ChangePassword.css';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Have I Been Pwned breach status state
  const [hibpStatus, setHibpStatus] = useState({ checking: false, isPwned: false, breachCount: 0 });

  const navigate = useNavigate();
  const strength = evaluatePasswordStrength(newPassword);

  useEffect(() => {
    if (!newPassword || newPassword.length < 6) {
      setHibpStatus({ checking: false, isPwned: false, breachCount: 0 });
      return;
    }

    setHibpStatus(prev => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      const res = await checkPasswordBreach(newPassword);
      setHibpStatus({
        checking: false,
        isPwned: Boolean(res.isPwned),
        breachCount: res.breachCount || 0
      });
    }, 450);

    return () => clearTimeout(timer);
  }, [newPassword]);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('currentCompany');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u && u.email) setUserEmail(u.email);
      } catch (e) {}
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('companyToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentCompany');
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertMsg({ type: '', text: '' });

    if (!currentPassword) {
      setAlertMsg({ type: 'error', text: 'Please enter your current temporary password.' });
      return;
    }

    if (!strength.isValid) {
      setAlertMsg({ type: 'error', text: 'New password does not meet security requirements.' });
      return;
    }

    if (hibpStatus.isPwned) {
      setAlertMsg({
        type: 'error',
        text: `Security Warning: This password was found in ${hibpStatus.breachCount.toLocaleString()} public data breaches (Have I Been Pwned). Please choose a unique password.`
      });
      return;
    }

    if (currentPassword === newPassword) {
      setAlertMsg({ type: 'error', text: 'New password cannot be the same as your temporary password.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlertMsg({ type: 'error', text: 'New Password and Confirm Password do not match.' });
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('companyToken');
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: userEmail,
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setAlertMsg({ type: 'success', text: 'Password updated successfully! Redirecting to company dashboard...' });
        
        if (userEmail) {
          try {
            const passMap = JSON.parse(localStorage.getItem('company_passwords_map') || '{}');
            passMap[userEmail.toLowerCase()] = newPassword;
            localStorage.setItem('company_passwords_map', JSON.stringify(passMap));
          } catch (e) {}
        }

        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('companyToken', data.token);
        }
        
        const updatedComp = {
          ...(data.company || data.user || {}),
          password: newPassword,
          must_change_password: false
        };
        localStorage.setItem('currentCompany', JSON.stringify(updatedComp));
        localStorage.setItem('currentUser', JSON.stringify(updatedComp));

        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to change password. Please verify your temporary password.' });
      }
    } catch (err) {
      setSubmitting(false);
      setAlertMsg({ type: 'error', text: 'Network connection issue. Failed to update password.' });
    }
  };

  return (
    <div className="change-pass-page">
      {/* BRANDED HEADER NAVBAR */}
      <header className="change-pass-header">
        <div className="change-pass-header-inner">
          <Link to="/" className="change-pass-brand">
            <img src="/mcc-crest-maroon.png" alt="MCC Crest Logo" className="change-pass-crest" />
            <div className="change-pass-brand-text">
              <span className="change-pass-title-main">MCC MRF Innovation Park</span>
              <span className="change-pass-title-sub">Incubation Portal Security</span>
            </div>
          </Link>

          <div className="change-pass-security-tag">
            <ShieldCheck size={16} />
            <span>Mandatory First Login Password Change</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="change-pass-main">
        <div className="change-pass-card">
          
          {/* BANNER HEADER */}
          <div className="change-pass-card-banner">
            <div className="change-pass-banner-icon">
              <KeyRound size={28} color="#FFFFFF" />
            </div>
            <h2 className="change-pass-banner-h2">Change Your Password</h2>
            <p className="change-pass-banner-p">
              For security compliance, you must replace your temporary password with a strong permanent password.
            </p>

            {userEmail && (
              <div className="change-pass-user-pill">
                <UserCheck size={14} color="#FECACA" />
                <span>Account: <strong>{userEmail}</strong></span>
              </div>
            )}
          </div>

          {/* FORM BODY */}
          <form onSubmit={handleSubmit} className="change-pass-form-body">
            {alertMsg.text && (
              <div className={`change-pass-alert ${alertMsg.type}`}>
                {alertMsg.type === 'error' ? <AlertTriangle size={18} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={18} style={{ flexShrink: 0 }} />}
                <span>{alertMsg.text}</span>
              </div>
            )}

            {/* Current Temporary Password */}
            <div className="change-pass-field-group">
              <label className="change-pass-label">
                Current Temporary Password *
              </label>
              <div className="change-pass-input-wrapper">
                <Lock size={16} className="change-pass-input-icon" />
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  className="change-pass-input"
                  placeholder="Enter temporary password received via email"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="change-pass-eye-btn"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                >
                  {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="change-pass-field-group">
              <label className="change-pass-label">
                New Password *
              </label>
              <div className="change-pass-input-wrapper">
                <Lock size={16} className="change-pass-input-icon" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="change-pass-input"
                  placeholder="Create a new strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="change-pass-eye-btn"
                  onClick={() => setShowNewPass(!showNewPass)}
                >
                  {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Strength Progress Indicator */}
              {newPassword && (
                <div className="change-pass-strength-box">
                  <div className="change-pass-strength-header">
                    <span style={{ color: '#64748B' }}>Password Security:</span>
                    <span style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                  <div className="change-pass-strength-track">
                    <div
                      className="change-pass-strength-bar"
                      style={{ width: `${strength.percentage}%`, backgroundColor: strength.color }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="change-pass-field-group">
              <label className="change-pass-label">
                Confirm New Password *
              </label>
              <div className="change-pass-input-wrapper">
                <Lock size={16} className="change-pass-input-icon" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  className="change-pass-input"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="change-pass-eye-btn"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                >
                  {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Security Requirements Checklist */}
            <div className="change-pass-checklist-box">
              <span className="change-pass-checklist-title">
                Required Security Rules:
              </span>
              <div className="change-pass-checklist-grid">
                <div className={`change-pass-check-item ${strength.requirements.hasMinLength ? 'met' : 'unmet'}`}>
                  <CheckCircle2 size={14} color={strength.requirements.hasMinLength ? '#16A34A' : '#CBD5E1'} />
                  <span>Minimum 8 characters long</span>
                </div>
                <div className={`change-pass-check-item ${strength.requirements.hasUpper ? 'met' : 'unmet'}`}>
                  <CheckCircle2 size={14} color={strength.requirements.hasUpper ? '#16A34A' : '#CBD5E1'} />
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div className={`change-pass-check-item ${strength.requirements.hasLower ? 'met' : 'unmet'}`}>
                  <CheckCircle2 size={14} color={strength.requirements.hasLower ? '#16A34A' : '#CBD5E1'} />
                  <span>At least one lowercase letter (a-z)</span>
                </div>
                <div className={`change-pass-check-item ${strength.requirements.hasNumber ? 'met' : 'unmet'}`}>
                  <CheckCircle2 size={14} color={strength.requirements.hasNumber ? '#16A34A' : '#CBD5E1'} />
                  <span>At least one numerical digit (0-9)</span>
                </div>
                <div className={`change-pass-check-item ${strength.requirements.hasSpecial ? 'met' : 'unmet'}`}>
                  <CheckCircle2 size={14} color={strength.requirements.hasSpecial ? '#16A34A' : '#CBD5E1'} />
                  <span>At least one special character (!@#$%^&*)</span>
                </div>
                <div className={`change-pass-check-item ${!hibpStatus.checking && newPassword.length >= 8 && !hibpStatus.isPwned ? 'met' : hibpStatus.isPwned ? 'unmet' : 'unmet'}`}>
                  {hibpStatus.isPwned ? (
                    <ShieldAlert size={14} color="#DC2626" />
                  ) : (
                    <ShieldCheck size={14} color={(!hibpStatus.checking && newPassword.length >= 8 && !hibpStatus.isPwned) ? '#16A34A' : '#CBD5E1'} />
                  )}
                  <span style={{ color: hibpStatus.isPwned ? '#DC2626' : 'inherit', fontWeight: hibpStatus.isPwned ? 600 : 'normal' }}>
                    {hibpStatus.checking
                      ? 'Verifying password with Have I Been Pwned...'
                      : hibpStatus.isPwned
                      ? `Leaked in ${hibpStatus.breachCount.toLocaleString()} breaches (Compromised!)`
                      : 'No known public data breaches (Have I Been Pwned)'}
                  </span>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              className="change-pass-submit-btn"
              disabled={submitting || !strength.isValid || hibpStatus.isPwned || hibpStatus.checking}
            >
              <span>{submitting ? 'Updating Password...' : 'Save New Password & Continue'}</span>
              {!submitting && <ArrowRight size={18} />}
            </button>

            {/* SIGN OUT OPTION */}
            <div className="change-pass-footer-link">
              Signed in with wrong account?
              <button type="button" className="change-pass-signout-btn" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </form>

        </div>
      </main>
    </div>
  );
}
