import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Server,
  Eye,
  EyeOff,
  Send,
  RefreshCw,
  Edit3,
  Trash2,
  Plus,
  X,
  Check,
  CreditCard,
  Key,
  Activity
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import SecurityProductionPanel from '../../components/admin/SecurityProductionPanel';
import { API_BASE_URL } from '../../utils/apiConfig';

const PRESET_PROVIDERS = [
  {
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    auth_required: true,
    help: 'Requires a Google App Password if 2-Step Verification is enabled.'
  },
  {
    name: 'Outlook / Office365',
    host: 'smtp.office365.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    auth_required: true,
    help: 'Use your full Microsoft 365 / Outlook email address as username.'
  },
  {
    name: 'Yahoo Mail',
    host: 'smtp.mail.yahoo.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    auth_required: true,
    help: 'Requires a Yahoo App Password generated from Account Security.'
  },
  {
    name: 'Zoho Mail',
    host: 'smtp.zoho.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    auth_required: true,
    help: 'Use your full Zoho email address and password.'
  },
  {
    name: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    use_tls: true,
    use_ssl: false,
    auth_required: true,
    help: 'Set Username as "apikey" and Password as your SendGrid API Key.'
  },
  {
    name: 'Custom SMTP Server',
    host: '',
    port: 587,
    use_tls: true,
    use_ssl: false,
    auth_required: true,
    help: 'Enter custom host, port, authentication, and encryption settings.'
  }
];

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('smtp'); // 'smtp' | 'profile'

  // Account Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // SMTP Settings State
  const [settingsList, setSettingsList] = useState([]);
  const [activeSetting, setActiveSetting] = useState(null);
  const [loadingSmtp, setLoadingSmtp] = useState(false);
  const [toast, setToast] = useState({ type: '', text: '' });

  // Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Test Connection Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testingTargetSetting, setTestingTargetSetting] = useState(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    provider: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    username: '',
    password: '',
    auth_required: true,
    use_tls: true,
    use_ssl: false,
    sender_email: '',
    is_active: false
  });
  const [savingSmtp, setSavingSmtp] = useState(false);

  // PayU Payment Gateway State
  const [payuEnv, setPayuEnv] = useState('test');
  const [payuKey, setPayuKey] = useState('7kml0E');
  const [payuSalt, setPayuSalt] = useState('RoxqbnOyguo6AlDmEPuvqI5HjzZXZOEx');
  const [showPayuKey, setShowPayuKey] = useState(false);
  const [showPayuSalt, setShowPayuSalt] = useState(false);
  const [savingPayu, setSavingPayu] = useState(false);
  const [testingPayu, setTestingPayu] = useState(false);
  const [payuTestResult, setPayuTestResult] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem('adminUser') || sessionStorage.getItem('adminUser');
    if (u) {
      try {
        const parsed = JSON.parse(u);
        setUser(parsed);
        if (parsed.email && !formData.sender_email) {
          setFormData((prev) => ({ ...prev, sender_email: parsed.email }));
        }
      } catch (e) {}
    }
    fetchSmtpSettings();
    fetchPayUSettings();
  }, []);

  const fetchPayUSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/settings/payment-gateway`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.paymentGateway) {
        const env = data.paymentGateway.environment || 'test';
        setPayuEnv(env);
        setPayuKey(data.paymentGateway.merchant_key || (env === 'production' ? '7kml0E' : 'gtKFFx'));
        setPayuSalt(data.paymentGateway.merchant_salt || (env === 'production' ? 'RoxqbnOyguo6AlDmEPuvqI5HjzZXZOEx' : 'eCwWELxi'));
      }
    } catch (e) {
      console.warn('Error fetching PayU settings:', e);
    }
  };

  const handleLoadTestPresets = () => {
    setPayuEnv('test');
    setPayuKey('gtKFFx');
    setPayuSalt('eCwWELxi');
    showToast('info', 'Loaded PayU Official Sandbox Test Credentials (test.payu.in)');
  };

  const handleLoadProdPresets = () => {
    setPayuEnv('production');
    setPayuKey('7kml0E');
    setPayuSalt('RoxqbnOyguo6AlDmEPuvqI5HjzZXZOEx');
    showToast('info', 'Loaded PayU Live Production Preset (secure.payu.in)');
  };

  const handleSavePayUSettings = async (e) => {
    e.preventDefault();
    setSavingPayu(true);
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/settings/payment-gateway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          environment: payuEnv,
          merchantKey: payuKey,
          merchantSalt: payuSalt,
          allowedMethods: ['UPI', 'CARD']
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', '✓ PayU Payment Gateway settings updated successfully!');
        fetchPayUSettings();
      } else {
        showToast('error', data.message || 'Failed to update PayU settings');
      }
    } catch (err) {
      showToast('error', 'Network error updating PayU settings');
    } finally {
      setSavingPayu(false);
    }
  };

  const handleTestPayUCredentials = async () => {
    setTestingPayu(true);
    setPayuTestResult(null);
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/settings/payment-gateway/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      setPayuTestResult(data);
      if (data.success) {
        showToast('success', '✓ ' + data.message);
      } else {
        showToast('error', data.message || 'PayU credentials verification failed.');
      }
    } catch (err) {
      setPayuTestResult({ success: false, message: 'Network error verifying PayU credentials' });
      showToast('error', 'Network error verifying PayU credentials');
    } finally {
      setTestingPayu(false);
    }
  };

  const fetchSmtpSettings = async () => {
    setLoadingSmtp(true);
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/smtp-settings/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.settings)) {
        setSettingsList(data.settings);
        setActiveSetting(data.activeSetting || null);
      }
    } catch (err) {
      console.error('Error fetching SMTP settings:', err);
    } finally {
      setLoadingSmtp(false);
    }
  };

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: '', text: '' }), 5000);
  };

  // Provider Preset Selection Handler
  const handlePresetSelect = (providerName) => {
    const preset = PRESET_PROVIDERS.find((p) => p.name === providerName) || PRESET_PROVIDERS[5];
    setFormData((prev) => ({
      ...prev,
      provider: preset.name,
      host: preset.host || prev.host,
      port: preset.port,
      use_tls: preset.use_tls,
      use_ssl: preset.use_ssl,
      auth_required: preset.auth_required
    }));
  };

  // Port Toggle Handler (SSL vs TLS logic)
  const handlePortChange = (e) => {
    const p = Number(e.target.value);
    let tls = formData.use_tls;
    let ssl = formData.use_ssl;
    if (p === 465) {
      ssl = true;
      tls = false;
    } else if (p === 587) {
      tls = true;
      ssl = false;
    }
    setFormData((prev) => ({ ...prev, port: p, use_tls: tls, use_ssl: ssl }));
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      provider: 'Gmail',
      host: 'smtp.gmail.com',
      port: 587,
      username: '',
      password: '',
      auth_required: true,
      use_tls: true,
      use_ssl: false,
      sender_email: user?.email || 'notifications@mccmrfip.com',
      is_active: settingsList.length === 0
    });
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (setting) => {
    setEditingId(setting.id);
    setFormData({
      provider: setting.provider || 'Custom SMTP Server',
      host: setting.host,
      port: setting.port,
      username: setting.username || '',
      password: setting.has_password ? '••••••••••••' : '',
      auth_required: Boolean(setting.auth_required),
      use_tls: Boolean(setting.use_tls),
      use_ssl: Boolean(setting.use_ssl),
      sender_email: setting.sender_email,
      is_active: Boolean(setting.is_active)
    });
    setShowFormModal(true);
  };

  // Save / Update Form Submission
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.host) {
      showToast('error', 'SMTP Host is required.');
      return;
    }
    if (!formData.sender_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.sender_email)) {
      showToast('error', 'Please enter a valid Sender Email address.');
      return;
    }

    setSavingSmtp(true);
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const url = editingId
        ? `${API_BASE_URL}/api/smtp-settings/${editingId}/`
        : `${API_BASE_URL}/api/smtp-settings/`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        setShowFormModal(false);
        showToast('success', editingId ? '✓ SMTP configuration updated.' : '✓ SMTP configuration created.');
        fetchSmtpSettings();
      } else {
        showToast('error', data.message || 'Failed to save configuration.');
      }
    } catch (err) {
      showToast('error', 'Error connecting to backend server.');
    } finally {
      setSavingSmtp(false);
    }
  };

  // Toggle Active Status Switch (Enforces Single Active)
  const handleToggleActive = async (setting) => {
    const newActiveState = !setting.is_active;
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/smtp-settings/${setting.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ is_active: newActiveState })
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', newActiveState ? `✓ Configuration #${setting.id} set as ACTIVE.` : `○ Configuration #${setting.id} deactivated.`);
        fetchSmtpSettings();
      } else {
        showToast('error', data.message || 'Failed to toggle status.');
      }
    } catch (err) {
      showToast('error', 'Server error toggling active status.');
    }
  };

  // Delete Setting Handler
  const handleDeleteSetting = async (setting) => {
    if (!window.confirm(`Are you sure you want to delete SMTP configuration for "${setting.host}"?`)) return;

    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/smtp-settings/${setting.id}/`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', '✓ SMTP configuration deleted.');
        fetchSmtpSettings();
      } else {
        showToast('error', data.message || 'Failed to delete configuration.');
      }
    } catch (err) {
      showToast('error', 'Failed to delete configuration.');
    }
  };

  // Open Test Connection Diagnostics Modal
  const handleOpenTestModal = (setting) => {
    setTestingTargetSetting(setting);
    setTestEmailRecipient(user?.email || setting?.sender_email || 'admin@mccmrfip.com');
    setDiagnosticResult(null);
    setShowTestModal(true);
  };

  // Run Test Connection Diagnostics
  const handleRunDiagnosticTest = async (e) => {
    e.preventDefault();
    if (!testEmailRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailRecipient)) {
      showToast('error', 'Please enter a valid test recipient email.');
      return;
    }

    setTestingConnection(true);
    setDiagnosticResult(null);

    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const targetId = testingTargetSetting?.id || '0';

      const res = await fetch(`${API_BASE_URL}/api/smtp-settings/${targetId}/test-connection/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          test_email: testEmailRecipient,
          setting_data: testingTargetSetting ? undefined : formData
        })
      });

      const data = await res.json();
      setDiagnosticResult(data);
      if (data.success) {
        showToast('success', '✓ ' + data.message);
        fetchSmtpSettings();
      }
    } catch (err) {
      setDiagnosticResult({
        success: false,
        diagnosticCode: 'Network Timeout',
        message: 'Connection timed out or failed to reach server.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Account Password Update Handler
  const handleProfilePasswordChange = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });

    if (!currentPassword) {
      setProfileMsg({ type: 'error', text: 'Please enter your current password.' });
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setProfileMsg({ type: 'error', text: 'New password must be at least 4 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setProfileMsg({ type: 'error', text: 'New Password and Confirm Password do not match.' });
      return;
    }

    setProfileSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const targetIdentifier = user?.email || user?.username || 'admin@mccmrfip.com';

      const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: targetIdentifier,
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      setProfileSubmitting(false);

      if (data.success) {
        setProfileMsg({ type: 'success', text: 'Admin account password updated successfully in the system!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        if (data.token) {
          localStorage.setItem('adminToken', data.token);
          sessionStorage.setItem('adminToken', data.token);
        }
      } else {
        setProfileMsg({ type: 'error', text: data.message || 'Failed to update password. Please check your current password.' });
      }
    } catch (err) {
      console.warn('Network issue changing admin password:', err);
      setProfileSubmitting(false);
      setProfileMsg({ type: 'error', text: 'Network connection issue. Failed to update password.' });
    }
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AdminLayout
      title="System Settings & SMTP Infrastructure"
      subtitle="Manage dynamic multi-provider SMTP configurations, active dispatchers, and security parameters."
    >
      {/* Toast Banner */}
      {toast.text && (
        <div
          className={`profile-modal-alert ${toast.type}`}
          style={{
            marginBottom: '1.25rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            borderLeft: `4px solid ${toast.type === 'success' ? '#16A34A' : '#DC2626'}`
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span style={{ fontWeight: 600 }}>{toast.text}</span>
        </div>
      )}

      {/* SUB-TAB BAR */}
      <div className="smtp-tabs-bar">
        <button
          className={`smtp-tab-btn ${activeSubTab === 'smtp' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('smtp')}
        >
          <Server size={18} />
          <span>SMTP Management</span>
        </button>
        <button
          className={`smtp-tab-btn ${activeSubTab === 'payment-gateway' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('payment-gateway')}
        >
          <CreditCard size={18} />
          <span>PayU Gateway Settings</span>
        </button>
        <button
          className={`smtp-tab-btn ${activeSubTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('profile')}
        >
          <ShieldCheck size={18} />
          <span>Account Security & Profile</span>
        </button>
        <button
          className={`smtp-tab-btn ${activeSubTab === 'security-production' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('security-production')}
        >
          <Activity size={18} />
          <span>Production & Security Suite</span>
        </button>
      </div>

      {/* TAB 1: SMTP MANAGEMENT */}
      {activeSubTab === 'smtp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* ACTIVE DISPATCH STATUS BANNER */}
          <div className="smtp-hero-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                className="smtp-hero-icon-box"
                style={{
                  backgroundColor: activeSetting ? '#DCFCE7' : '#FEF3C7',
                  color: activeSetting ? '#16A34A' : '#D97706'
                }}
              >
                <Mail size={26} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                    Active Outgoing Email Dispatcher
                  </h3>
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      letterSpacing: '0.03em',
                      backgroundColor: activeSetting ? '#DCFCE7' : '#FEF3C7',
                      color: activeSetting ? '#15803D' : '#B45309',
                      border: `1px solid ${activeSetting ? '#86EFAC' : '#FDE68A'}`
                    }}
                  >
                    {activeSetting ? '● DYNAMIC MYSQL ACTIVE' : '○ ENVIRONMENT FALLBACK'}
                  </span>
                </div>

                <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0.35rem 0 0 0' }}>
                  {activeSetting ? (
                    <>
                      Sending from <strong>{activeSetting.sender_email}</strong> via <strong>{activeSetting.host}:{activeSetting.port}</strong> ({activeSetting.provider})
                    </>
                  ) : (
                    <>
                      No active database SMTP record. Falling back to system default <strong>notifications@mccmrfip.com</strong>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {activeSetting && (
                <button
                  className="smtp-action-btn smtp-action-btn-test"
                  onClick={() => handleOpenTestModal(activeSetting)}
                  style={{ padding: '0.6rem 1.1rem', fontSize: '0.88rem' }}
                >
                  <Send size={16} />
                  <span>Test Active Dispatcher</span>
                </button>
              )}

              <button
                className="add-company-btn"
                onClick={handleOpenCreateModal}
                style={{ padding: '0.65rem 1.25rem', whiteSpace: 'nowrap' }}
              >
                <Plus size={18} />
                <span>Add SMTP Configuration</span>
              </button>
            </div>
          </div>

          {/* STORED SMTP CONFIGURATIONS TABLE */}
          <div className="smtp-table-card">
            <div className="smtp-table-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8B0000', margin: 0 }}>
                  Stored SMTP Configurations
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0.25rem 0 0 0' }}>
                  Manage multi-provider configurations. Only ONE configuration can be Active at any time.
                </p>
              </div>

              <button
                className="smtp-action-btn smtp-action-btn-edit"
                onClick={fetchSmtpSettings}
                style={{ padding: '0.5rem 0.95rem' }}
              >
                <RefreshCw size={14} className={loadingSmtp ? 'spin-icon' : ''} />
                <span>Refresh List</span>
              </button>
            </div>

            <div className="smtp-table-wrapper">
              <table className="smtp-table">
                <thead>
                  <tr>
                    <th>Active Status</th>
                    <th>Provider</th>
                    <th>Host & Port</th>
                    <th>Sender Email</th>
                    <th>Security Flags</th>
                    <th>Last Connection Test</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settingsList.length > 0 ? (
                    settingsList.map((s) => (
                      <tr key={s.id} style={{ backgroundColor: s.is_active ? '#F0FDF4' : 'transparent' }}>
                        <td>
                          <button
                            onClick={() => handleToggleActive(s)}
                            className={s.is_active ? 'smtp-badge-active' : 'smtp-badge-inactive'}
                            title={s.is_active ? 'Click to deactivate' : 'Click to activate'}
                          >
                            <span>{s.is_active ? '● ACTIVE' : '○ INACTIVE'}</span>
                          </button>
                        </td>

                        <td style={{ fontWeight: 800, color: '#0F172A' }}>
                          {s.provider || 'Custom SMTP'}
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, color: '#1E293B' }}>{s.host}</div>
                          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Port: {s.port}</span>
                        </td>

                        <td style={{ fontWeight: 600, color: '#334155' }}>{s.sender_email}</td>

                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {s.use_tls ? (
                              <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.15rem 0.5rem', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem' }}>
                                TLS
                              </span>
                            ) : null}
                            {s.use_ssl ? (
                              <span style={{ backgroundColor: '#E0E7FF', color: '#3730A3', padding: '0.15rem 0.5rem', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem' }}>
                                SSL
                              </span>
                            ) : null}
                            {s.auth_required ? (
                              <span style={{ backgroundColor: '#F1F5F9', color: '#334155', padding: '0.15rem 0.5rem', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem' }}>
                                Auth ON
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '0.15rem 0.5rem', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem' }}>
                                Auth OFF
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          {s.last_tested_at ? (
                            <div>
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  color: s.last_test_status === 'CONNECTED' ? '#16A34A' : '#DC2626'
                                }}
                              >
                                {s.last_test_status === 'CONNECTED' ? '✓ Passed' : '✕ Failed'}
                              </span>
                              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{s.last_tested_at}</div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Not tested</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              className="smtp-action-btn smtp-action-btn-test"
                              onClick={() => handleOpenTestModal(s)}
                              title="Test SMTP connection and send test email"
                            >
                              <Send size={13} />
                              <span>Test</span>
                            </button>

                            <button
                              className="smtp-action-btn smtp-action-btn-edit"
                              onClick={() => handleOpenEditModal(s)}
                              title="Edit configuration"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              className="smtp-action-btn smtp-action-btn-delete"
                              onClick={() => handleDeleteSetting(s)}
                              title="Delete configuration"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                        No stored SMTP configurations found. Click "+ Add SMTP Configuration" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PAYU PAYMENT GATEWAY SETTINGS */}
      {activeSubTab === 'payment-gateway' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div className="admin-card">
            <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CreditCard size={22} color="#8B0000" />
                <div>
                  <h3 className="admin-card-title">PayU India Payment Gateway Credentials</h3>
                  <p className="admin-card-subtitle" style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                    Configure Merchant Key, Merchant Salt, and environment mode for PayU Hosted Checkout & S2S API.
                  </p>
                </div>
              </div>
              <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>
                ● Active Gateway
              </span>
            </div>

            {/* CREDENTIAL NOTICE BANNER */}
            <div style={{ margin: '1rem 0 0 0', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: '0.85rem 1.1rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Key size={20} color="#0284C7" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.84rem', color: '#0369A1', lineHeight: 1.45 }}>
                <strong>Merchant Key & Salt Integration Guide:</strong>
                <br />
                • <strong>Test / Sandbox:</strong> Use Test Merchant Key <code style={{ backgroundColor: '#E0F2FE', padding: '1px 5px', borderRadius: 4 }}>gtK2yq</code> and Salt <code style={{ backgroundColor: '#E0F2FE', padding: '1px 5px', borderRadius: 4 }}>eCwTwB0s</code> on <code style={{ backgroundColor: '#E0F2FE', padding: '1px 5px', borderRadius: 4 }}>test.payu.in</code>.
                <br />
                • <strong>Production / Live:</strong> Obtain your production Key and Salt from your registered <a href="https://payu.in" target="_blank" rel="noreferrer" style={{ color: '#0369A1', fontWeight: 700, textDecoration: 'underline' }}>PayU Dashboard</a> & select Production mode (<code style={{ backgroundColor: '#E0F2FE', padding: '1px 5px', borderRadius: 4 }}>secure.payu.in</code>).
              </div>
            </div>

            {/* QUICK PRESET & ACCESS LINKS BAR */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', backgroundColor: '#F1F5F9', padding: '0.75rem 1rem', borderRadius: 8, marginTop: '1rem', marginBottom: '1rem', border: '1px solid #CBD5E1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Quick Presets:</span>
                <button
                  type="button"
                  onClick={handleLoadTestPresets}
                  style={{
                    backgroundColor: payuEnv === 'test' ? '#1E293B' : '#FFFFFF',
                    color: payuEnv === 'test' ? '#FFFFFF' : '#1E293B',
                    border: '1px solid #94A3B8',
                    borderRadius: 6,
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🧪 Load Test Sandbox (gtKFFx / eCwWELxi)
                </button>
                <button
                  type="button"
                  onClick={handleLoadProdPresets}
                  style={{
                    backgroundColor: payuEnv === 'production' ? '#1E293B' : '#FFFFFF',
                    color: payuEnv === 'production' ? '#FFFFFF' : '#1E293B',
                    border: '1px solid #94A3B8',
                    borderRadius: 6,
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🔒 Load Live Production Preset (7kml0E)
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <a
                  href="https://dashboard.payu.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563EB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <span>PayU Live Portal</span> ↗
                </a>
                <span style={{ color: '#94A3B8' }}>|</span>
                <a
                  href="https://test.payu.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563EB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <span>PayU Test Portal</span> ↗
                </a>
              </div>
            </div>

            <form onSubmit={handleSavePayUSettings} style={{ padding: '0.5rem 0 0 0' }}>
              <div className="modal-form-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Payment Gateway Provider</label>
                  <input type="text" className="form-input" value="PayU India (Hosted Checkout & S2S API)" disabled style={{ backgroundColor: '#F8FAFC' }} />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Gateway Environment *</label>
                  <select className="form-select" value={payuEnv} onChange={(e) => setPayuEnv(e.target.value)}>
                    <option value="test">Test / Sandbox Mode (test.payu.in)</option>
                    <option value="production">Production / Live Mode (secure.payu.in)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Merchant Key (KEY) *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPayuKey ? "text" : "password"}
                      className="form-input"
                      value={payuKey}
                      onChange={(e) => setPayuKey(e.target.value)}
                      placeholder="Enter PayU Merchant Key (e.g. gtK2yq)"
                      required
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPayuKey(!showPayuKey)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B'
                      }}
                      title={showPayuKey ? "Hide Merchant Key" : "View Merchant Key"}
                    >
                      {showPayuKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Merchant Salt (SALT) *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPayuSalt ? "text" : "password"}
                      className="form-input"
                      value={payuSalt}
                      onChange={(e) => setPayuSalt(e.target.value)}
                      placeholder="Enter PayU Merchant Salt"
                      required
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPayuSalt(!showPayuSalt)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B'
                      }}
                      title={showPayuSalt ? "Hide Merchant Salt" : "View Merchant Salt"}
                    >
                      {showPayuSalt ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#1E293B' }}>
                  Allowed Payment Methods
                </h4>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 700, color: '#1E293B' }}>
                    <input type="checkbox" checked readOnly style={{ width: 16, height: 16 }} />
                    <span>UPI (Google Pay, PhonePe, Paytm, BHIM)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 700, color: '#1E293B' }}>
                    <input type="checkbox" checked readOnly style={{ width: 16, height: 16 }} />
                    <span>Credit / Debit Cards (Visa, Mastercard, RuPay)</span>
                  </label>
                </div>
              </div>

              {/* PAYU CREDENTIALS TEST DIAGNOSTIC PANEL */}
              {payuTestResult && (
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 10,
                    marginBottom: '1.5rem',
                    backgroundColor: payuTestResult.success ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${payuTestResult.success ? '#86EFAC' : '#FCA5A5'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.4rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: 12,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        backgroundColor: payuTestResult.success ? '#16A34A' : '#DC2626',
                        color: '#FFFFFF'
                      }}
                    >
                      {payuTestResult.success ? '✓ VERIFIED OPERATIONAL' : '✕ VERIFICATION ERROR'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: payuTestResult.success ? '#166534' : '#991B1B', margin: '0 0 0.5rem 0' }}>
                    {payuTestResult.message}
                  </p>
                  {payuTestResult.details && (
                    <div style={{ fontSize: '0.78rem', color: '#475569', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div>● Target URL: {payuTestResult.details.payuUrl}</div>
                      <div>● Active Merchant Key: {payuTestResult.details.merchantKey}</div>
                      <div>● Sample SHA-512 Hash: {payuTestResult.details.generatedHashPreview}</div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="smtp-action-btn smtp-action-btn-test"
                  onClick={handleTestPayUCredentials}
                  disabled={testingPayu}
                  style={{ padding: '0.65rem 1.15rem', fontSize: '0.88rem' }}
                >
                  <RefreshCw size={16} className={testingPayu ? 'spin-icon' : ''} />
                  <span>{testingPayu ? 'Verifying Credentials...' : 'Verify Merchant Credentials'}</span>
                </button>

                <button type="submit" className="add-company-btn" disabled={savingPayu}>
                  <Check size={16} />
                  <span>{savingPayu ? 'Saving Settings...' : 'Save PayU Gateway Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNT PROFILE & SECURITY */}
      {activeSubTab === 'profile' && (
        <div className="admin-dual-grid">
          {/* PROFILE CARD */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Administrator Profile</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem' }}>
              <div className="admin-avatar" style={{ width: 60, height: 60, fontSize: '1.5rem', backgroundColor: '#8B0000', color: '#FFFFFF' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  {user?.name || (isSuperAdmin ? 'Super Admin' : 'Admin')}
                </h4>
                <span className={`admin-role-badge ${isSuperAdmin ? 'super' : 'admin'}`} style={{ marginTop: 4 }}>
                  {isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'}
                </span>
              </div>
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">Username / Login ID</label>
              <input
                type="text"
                className="profile-field-input"
                value={user?.username || (isSuperAdmin ? 'MCCMRFIP@super' : 'MCCMRFIP@admin')}
                disabled
                readOnly
                style={{ backgroundColor: '#F8FAFC' }}
              />
            </div>

            <div className="profile-field-group">
              <label className="profile-field-label">Email Address</label>
              <input
                type="email"
                className="profile-field-input"
                value={user?.email || 'superadmin@mccmrfip.com'}
                disabled
                readOnly
                style={{ backgroundColor: '#F8FAFC' }}
              />
            </div>
          </div>

          {/* PASSWORD UPDATE CARD */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Account Security</h3>
            </div>

            {profileMsg.text && (
              <div className={`profile-modal-alert ${profileMsg.type}`} style={{ marginBottom: '1rem' }}>
                {profileMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleProfilePasswordChange}>
              <div className="profile-field-group">
                <label className="profile-field-label">Current Password</label>
                <input
                  type="password"
                  className="profile-field-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">New Password</label>
                <input
                  type="password"
                  className="profile-field-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">Confirm New Password</label>
                <input
                  type="password"
                  className="profile-field-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={profileSubmitting}>
                  <Lock size={16} />
                  <span>{profileSubmitting ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: ENTERPRISE PRODUCTION & SECURITY SUITE */}
      {activeSubTab === 'security-production' && (
        <SecurityProductionPanel />
      )}

      {/* ================================================== */}
      {/* 1. ADD / EDIT SMTP CONFIGURATION FORM MODAL */}
      {/* ================================================== */}
      {showFormModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '650px', borderRadius: 16 }}>
            <div className="admin-modal-header" style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '0.85rem' }}>
              <div>
                <h2 className="admin-modal-title" style={{ fontSize: '1.25rem', color: '#8B0000', margin: 0 }}>
                  {editingId ? 'Edit SMTP Configuration' : 'Add SMTP Configuration'}
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>
                  Configure host, port, authentication, and encryption settings for outgoing email dispatch.
                </p>
              </div>
              <button className="login-card-close" onClick={() => setShowFormModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body" style={{ paddingTop: '1.25rem' }}>
              {/* PRESET PROVIDER BUTTONS */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>
                  Quick Preset Provider Selector
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {PRESET_PROVIDERS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handlePresetSelect(p.name)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: formData.provider === p.name ? '#8B0000' : '#CBD5E1',
                        backgroundColor: formData.provider === p.name ? '#FEF2F2' : '#FFFFFF',
                        color: formData.provider === p.name ? '#8B0000' : '#334155',
                        fontWeight: formData.provider === p.name ? 800 : 500,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmitForm}>
                <div className="modal-form-grid" style={{ gap: '1rem' }}>
                  {/* HOST */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      SMTP Host *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      placeholder="e.g. smtp.gmail.com"
                      required
                    />
                  </div>

                  {/* PORT */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Port *
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.port}
                      onChange={handlePortChange}
                      placeholder="587 or 465"
                      required
                    />
                  </div>

                  {/* SENDER EMAIL */}
                  <div className="form-group full-width">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Sender Email (From Header) *
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.sender_email}
                      onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                      placeholder="notifications@company.com"
                      required
                    />
                  </div>

                  {/* AUTH REQUIRED TOGGLE */}
                  <div
                    className="form-group full-width"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#F8FAFC',
                      padding: '0.75rem 1rem',
                      borderRadius: 8,
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1F2937' }}>
                        SMTP Authentication Required
                      </span>
                      <p style={{ fontSize: '0.76rem', color: '#64748B', margin: 0 }}>
                        Enable if server requires Username and Password.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, auth_required: !formData.auth_required })}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: 16,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        backgroundColor: formData.auth_required ? '#8B0000' : '#CBD5E1',
                        color: '#FFFFFF'
                      }}
                    >
                      {formData.auth_required ? 'YES' : 'NO'}
                    </button>
                  </div>

                  {/* USERNAME & PASSWORD */}
                  {formData.auth_required && (
                    <>
                      <div className="form-group full-width">
                        <label className="form-label" style={{ fontWeight: 700 }}>
                          Username *
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          placeholder="e.g. notifications@company.com"
                          required={formData.auth_required}
                        />
                      </div>

                      <div className="form-group full-width">
                        <label className="form-label" style={{ fontWeight: 700 }}>
                          Password (Encrypted at Rest) *
                        </label>

                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPasswordInput ? 'text' : 'password'}
                            className="form-input"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder={editingId ? '•••••••••••• (Leave blank to keep existing password)' : 'Enter SMTP password or App Password'}
                            style={{ paddingRight: '2.5rem' }}
                          />

                          <button
                            type="button"
                            onClick={() => setShowPasswordInput(!showPasswordInput)}
                            style={{
                              position: 'absolute',
                              right: '0.75rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              cursor: 'pointer'
                            }}
                          >
                            {showPasswordInput ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* TLS & SSL SWITCH TOGGLES */}
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Use TLS (STARTTLS)</span>
                    <input
                      type="checkbox"
                      checked={formData.use_tls}
                      onChange={(e) => setFormData({ ...formData, use_tls: e.target.checked })}
                      style={{ cursor: 'pointer', width: 18, height: 18 }}
                    />
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Use SSL (Port 465)</span>
                    <input
                      type="checkbox"
                      checked={formData.use_ssl}
                      onChange={(e) => setFormData({ ...formData, use_ssl: e.target.checked })}
                      style={{ cursor: 'pointer', width: 18, height: 18 }}
                    />
                  </div>

                  {/* ACTIVE CONFIGURATION SWITCH */}
                  <div
                    className="form-group full-width"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: formData.is_active ? '#DCFCE7' : '#F8FAFC',
                      padding: '0.75rem 1rem',
                      borderRadius: 8,
                      border: `1px solid ${formData.is_active ? '#86EFAC' : '#E2E8F0'}`
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: formData.is_active ? '#166534' : '#1F2937' }}>
                        Set as Active Dispatcher
                      </span>
                      <p style={{ fontSize: '0.76rem', color: formData.is_active ? '#15803D' : '#64748B', margin: 0 }}>
                        Enforces Single-Active constraint. Deactivates all other SMTP records.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: 16,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        backgroundColor: formData.is_active ? '#16A34A' : '#94A3B8',
                        color: '#FFFFFF'
                      }}
                    >
                      {formData.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>
                </div>

                <hr className="form-divider" style={{ margin: '1.25rem 0 1rem 0' }} />

                <div className="form-actions-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="cancel-btn" onClick={() => setShowFormModal(false)}>
                    Cancel
                  </button>

                  <button type="submit" className="add-company-btn" disabled={savingSmtp}>
                    <Check size={16} />
                    <span>{savingSmtp ? 'Saving...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 2. TEST CONNECTION DIAGNOSTIC MODAL */}
      {/* ================================================== */}
      {showTestModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '520px', borderRadius: 16 }}>
            <div className="admin-modal-header" style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Send size={20} color="#8B0000" />
                <h3 className="admin-modal-title" style={{ fontSize: '1.15rem', color: '#8B0000', margin: 0 }}>
                  Test Connection & Diagnostics
                </h3>
              </div>
              <button className="login-card-close" onClick={() => setShowTestModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body" style={{ paddingTop: '1.1rem' }}>
              <form onSubmit={handleRunDiagnosticTest}>
                <div className="form-group full-width" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Recipient Test Email *
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4, display: 'block' }}>
                    Sends a test HTML email via host <strong>{testingTargetSetting?.host || formData.host}</strong>.
                  </span>
                </div>

                {/* DIAGNOSTICS RESULT DISPLAY */}
                {diagnosticResult && (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: 10,
                      marginBottom: '1rem',
                      backgroundColor: diagnosticResult.success ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${diagnosticResult.success ? '#86EFAC' : '#FCA5A5'}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.4rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: 12,
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          backgroundColor: diagnosticResult.success ? '#16A34A' : '#DC2626',
                          color: '#FFFFFF'
                        }}
                      >
                        {diagnosticResult.diagnosticCode}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: diagnosticResult.success ? '#166534' : '#991B1B', margin: 0 }}>
                      {diagnosticResult.message}
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="button" className="cancel-btn" onClick={() => setShowTestModal(false)}>
                    Close
                  </button>

                  <button type="submit" className="add-company-btn" disabled={testingConnection}>
                    <RefreshCw size={16} className={testingConnection ? 'spin-icon' : ''} />
                    <span>{testingConnection ? 'Testing (10s timeout)...' : 'Run Diagnostics Test'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
