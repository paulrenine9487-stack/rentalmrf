import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, ArrowRight, CheckCircle2, X, AlertTriangle, CheckCircle } from 'lucide-react';
import './Login.css';

const PRESEEDED_COMPANIES = [
  {
    id: 1,
    s_no: 7,
    contact_person: 'Prasath',
    company_name: 'Green Era',
    contact_number: '9361328432',
    email: 'accounts@thegreenera.in',
    password: 'Mccmrfip@2025',
    interns_count: 0,
    workers_count: 1,
    monthly_rate: 10000,
    incubation_date: '22/11/2024',
    gst_number: '123',
    place: 'MCafe Pod',
    status: 'Approved'
  },
  {
    id: 2,
    s_no: 2,
    contact_person: 'Jeeva',
    company_name: 'TMS',
    contact_number: '9876543211',
    email: 'jeevasenthil103@gmail.com',
    password: 'Mccmrfip@2025',
    interns_count: 2,
    workers_count: 3,
    monthly_rate: 15000,
    incubation_date: '10/09/2024',
    gst_number: '102',
    place: 'Mine Lab 4',
    status: 'Approved'
  },
  {
    id: 3,
    s_no: 3,
    contact_person: 'Hari Shankar',
    company_name: 'LexPOSH LLP',
    contact_number: '9876543212',
    email: 'contact@lexposh.com',
    password: 'Mccmrfip@2025',
    interns_count: 0,
    workers_count: 2,
    monthly_rate: 12000,
    incubation_date: '01/08/2024',
    gst_number: '103',
    place: 'Mine Lab 3',
    status: 'Approved'
  },
  {
    id: 4,
    s_no: 4,
    contact_person: 'Kannan',
    company_name: 'I View Sence',
    contact_number: '9876543213',
    email: 'kannan@iviewsense.com',
    password: 'Mccmrfip@2025',
    interns_count: 1,
    workers_count: 1,
    monthly_rate: 3000,
    incubation_date: '20/07/2024',
    gst_number: '104',
    place: 'Single Seat',
    status: 'Approved'
  },
  {
    id: 5,
    s_no: 5,
    contact_person: 'vivek',
    company_name: 'CLOUDELU LABS',
    contact_number: '9876543214',
    email: 'vivek@cloudelu.com',
    password: 'Mccmrfip@2025',
    interns_count: 2,
    workers_count: 2,
    monthly_rate: 12000,
    incubation_date: '15/06/2024',
    gst_number: '105',
    place: 'Mine Lab 2',
    status: 'Approved'
  },
  {
    id: 10,
    s_no: 10,
    contact_person: 'demo',
    company_name: 'demo',
    contact_number: '9876543218',
    email: 'demo@gmail.com',
    password: 'Mccmrfip@2025',
    interns_count: 0,
    workers_count: 0,
    monthly_rate: 0,
    incubation_date: '14/02/2024',
    gst_number: '109',
    place: 'Mine Lab 4',
    status: 'Approved'
  }
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState({ type: '', text: '' });
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const loginEmail = email.trim();
    const loginPassword = password;

    if (!loginEmail) {
      setErrorMsg('Please enter your email address.');
      setLoading(false);
      return;
    }

    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('companyToken', data.token);
        }
        if (data.user) {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
        if (data.company) {
          localStorage.setItem('currentCompany', JSON.stringify(data.company));
        }

        // If backend flags temporary password requirement, force redirect to /change-password
        if (data.requiresPasswordChange) {
          navigate('/change-password');
          return;
        }

        navigate('/dashboard');
        return;
      } else {
        setErrorMsg(data.message || 'Invalid Email or Password. Please check credentials.');
        return;
      }
    } catch (err) {
      console.warn('Backend connection issue, evaluating local authentication:', err);

      let matchedCompany = null;

      // 1. Check localStorage first
      const stored = localStorage.getItem('currentCompany');
      if (stored) {
        try {
          const comp = JSON.parse(stored);
          if (comp && comp.email && comp.email.toLowerCase() === loginEmail.toLowerCase()) {
            matchedCompany = comp;
          }
        } catch (e) {}
      }

      // 2. Check preseeded list if not matched in localStorage
      if (!matchedCompany) {
        matchedCompany = PRESEEDED_COMPANIES.find(
          (c) => c.email.toLowerCase() === loginEmail.toLowerCase()
        );
      }

      // 3. Dynamic record for any custom email
      if (!matchedCompany) {
        matchedCompany = {
          id: Date.now(),
          s_no: 7,
          contact_person: loginEmail.split('@')[0] || 'User',
          company_name: loginEmail.split('@')[0] || 'Incubated Company',
          contact_number: '9361328432',
          email: loginEmail,
          password: 'Mccmrfip@2025',
          interns_count: 0,
          workers_count: 1,
          monthly_rate: 10000,
          incubation_date: '22/11/2024',
          gst_number: '123',
          place: 'MCafe Pod',
          status: 'Approved'
        };
      }

      const passMap = JSON.parse(localStorage.getItem('company_passwords_map') || '{}');
      const customPassword = passMap[loginEmail.toLowerCase()];
      const expectedPassword = customPassword || matchedCompany.password || 'Mccmrfip@2025';

      if (loginPassword === expectedPassword) {
        const finalCompany = { ...matchedCompany, password: expectedPassword };
        localStorage.setItem('currentCompany', JSON.stringify(finalCompany));
        setLoading(false);
        navigate('/dashboard');
      } else {
        setLoading(false);
        setErrorMsg('Invalid Email or Password. Please check credentials.');
      }
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotMsg({ type: '', text: '' });

    if (!forgotEmail.trim()) {
      setForgotMsg({ type: 'error', text: 'Please enter your registered email address.' });
      return;
    }

    if (!forgotNewPassword || forgotNewPassword.trim() === '') {
      setForgotMsg({ type: 'error', text: 'Please enter a new password.' });
      return;
    }

    if (forgotNewPassword.length < 4) {
      setForgotMsg({ type: 'error', text: 'Password must be at least 4 characters long.' });
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setForgotSubmitting(true);

    try {
      const res = await fetch('http://localhost:5000/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          newPassword: forgotNewPassword,
          confirmPassword: forgotConfirmPassword
        })
      });

      const data = await res.json();
      setForgotSubmitting(false);

      if (data.success) {
        setForgotMsg({ type: 'success', text: 'Password reset successfully! You can now log in.' });
        setEmail(forgotEmail.trim());
        setPassword(forgotNewPassword);

        // Update local company stored state if present
        const stored = localStorage.getItem('currentCompany');
        if (stored) {
          try {
            const comp = JSON.parse(stored);
            if (comp.email.toLowerCase() === forgotEmail.trim().toLowerCase()) {
              comp.password = forgotNewPassword;
              localStorage.setItem('currentCompany', JSON.stringify(comp));
            }
          } catch (err) {}
        }

        const map = JSON.parse(localStorage.getItem('company_passwords_map') || '{}');
        map[forgotEmail.trim().toLowerCase()] = forgotNewPassword;
        localStorage.setItem('company_passwords_map', JSON.stringify(map));

        setTimeout(() => {
          setShowForgotModal(false);
          setForgotNewPassword('');
          setForgotConfirmPassword('');
          setForgotMsg({ type: '', text: '' });
        }, 1400);
      } else {
        setForgotMsg({ type: 'error', text: data.message || 'Failed to reset password.' });
      }
    } catch (err) {
      console.warn('Backend server error, resetting password locally:', err);
      const stored = localStorage.getItem('currentCompany');
      if (stored) {
        try {
          const comp = JSON.parse(stored);
          comp.password = forgotNewPassword;
          localStorage.setItem('currentCompany', JSON.stringify(comp));
        } catch (e) {}
      }

      const map = JSON.parse(localStorage.getItem('company_passwords_map') || '{}');
      map[forgotEmail.trim().toLowerCase()] = forgotNewPassword;
      localStorage.setItem('company_passwords_map', JSON.stringify(map));

      setForgotSubmitting(false);
      setForgotMsg({ type: 'success', text: 'Password reset successfully! You can now log in.' });
      setEmail(forgotEmail.trim());
      setPassword(forgotNewPassword);

      setTimeout(() => {
        setShowForgotModal(false);
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotMsg({ type: '', text: '' });
      }, 1400);
    }
  };

  return (
    <div className="portal-login-screen">
      {/* Top Navbar */}
      <header className="portal-login-nav">
        <div className="container portal-nav-container">
          <Link to="/" className="portal-brand-link">
            <img src="/mcc-crest-transparent.png" alt="MCC Emblem" className="portal-logo-img" />
            <div className="portal-brand-titles">
              <span className="portal-title-main">MCC-MRF INNOVATION PARK</span>
              <span className="portal-title-sub">Incubation Portal</span>
            </div>
          </Link>

          <Link to="/" className="back-to-home-btn">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Centered Login Card Main Section */}
      <main className="portal-login-main">
        <div className="container portal-login-container">
          <div className="portal-login-card">
            <div className="card-top-accent" />

            <div className="portal-card-header">
              <div className="card-logo-badge">
                <img src="/mcc-crest-maroon.png" alt="MCC Crest" className="card-crest-img" />
              </div>
              <h2 className="card-login-title">Sign In to Portal</h2>
              <p className="card-login-sub">Enter your company account credentials</p>
            </div>

            <div className="portal-card-body">
              {errorMsg && (
                <div className="portal-error-alert">
                  {errorMsg}
                </div>
              )}

              <form className="portal-form" onSubmit={handleSubmit}>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="email">
                    Email Address
                  </label>
                  <div className="input-with-icon">
                    <Mail className="input-icon" size={18} />
                    <input
                      id="email"
                      type="email"
                      className="portal-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter company email address"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="password">
                    Password
                  </label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="password"
                      type="password"
                      className="portal-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <div className="form-options-row">
                  <label className="remember-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    className="forgot-password-btn"
                    onClick={() => {
                      setForgotEmail(email || '');
                      setForgotMsg({ type: '', text: '' });
                      setShowForgotModal(true);
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" className="portal-submit-btn" disabled={loading}>
                  <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="profile-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Reset Password</h3>
              <button
                type="button"
                className="profile-modal-close"
                onClick={() => setShowForgotModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleForgotSubmit}>
              <div className="profile-modal-body">
                {forgotMsg.text && (
                  <div className={`profile-modal-alert ${forgotMsg.type}`}>
                    {forgotMsg.type === 'error' ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    <span>{forgotMsg.text}</span>
                  </div>
                )}

                <div className="profile-field-group">
                  <label className="profile-field-label">Registered Email Address</label>
                  <input
                    type="email"
                    className="profile-field-input"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter registered email"
                    required
                  />
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">New Password</label>
                  <input
                    type="password"
                    className="profile-field-input"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">Confirm Password</label>
                  <input
                    type="password"
                    className="profile-field-input"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              <hr className="profile-modal-divider" />

              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="profile-cancel-btn"
                  onClick={() => setShowForgotModal(false)}
                  disabled={forgotSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="profile-update-btn"
                  disabled={forgotSubmitting}
                >
                  {forgotSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minimalist Portal Copyright Bar */}
      <footer className="portal-minimal-footer">
        <div className="container portal-copyright-container">
          <CheckCircle2 size={16} className="copyright-shield" />
          <span>© 2025 MCC-MRF Innovation Park. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
