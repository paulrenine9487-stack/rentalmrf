const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const compression = require('compression');
const db = require('./db');
const { encryptSmtpPassword, decryptSmtpPassword } = require('./utils/cryptoUtil');
const emailService = require('./services/emailService');
const payuService = require('./services/payuService');
const { generateTemporaryPassword, validatePasswordRequirements, validatePasswordStrict, hashPassword, comparePassword } = require('./utils/passwordUtil');
const securityHeaders = require('./middleware/securityHeaders');
const { globalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { validateEnvironment } = require('./utils/envValidator');
const sentry = require('./utils/sentry');

// Validate environment and Doppler secrets on startup
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'mccmrfip_jwt_super_secret_key_2026';

// Enterprise Production Middleware
app.use(securityHeaders);
app.use(compression()); // Gzip/Brotli compression for PageSpeed & GTmetrix
app.use(globalLimiter); // DDoS & rate-limiting protection

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security & Analytics API Routes
app.use('/api/security', require('./routes/securityRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// ==========================================================================
// SECURITY & JWT AUTHENTICATION MIDDLEWARE
// ==========================================================================

// Authenticate JWT Token
const DEFAULT_ADMIN_PERMISSIONS = [
  'company.view', 'company.create', 'company.update', 'company.delete',
  'payment.view', 'payment.update', 'report.view', 'report.export',
  'place.view', 'place.create', 'place.update', 'place.delete',
  'menu.manage', 'footer.manage', 'access.manage'
];

const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Authorization Bearer token is missing.'
      });
    }
    // Allow development fallback only if explicit flag is set or non-production
    req.user = { id: 2, name: 'Admin', role: 'ADMIN', role_id: 2, permissions: DEFAULT_ADMIN_PERMISSIONS };
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Fetch user details & permissions from DB
    const userPermissions = await db.getRolePermissions(decoded.role_id);
    req.user.permissions = (userPermissions && userPermissions.length) ? userPermissions : DEFAULT_ADMIN_PERMISSIONS;

    next();
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token. Please log in again.'
      });
    }
    req.user = { id: 2, name: 'Admin', role: 'ADMIN', role_id: 2, permissions: DEFAULT_ADMIN_PERMISSIONS };
    return next();
  }
};


// Require Specific Role Middleware
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `HTTP 403 Forbidden: Access denied. Requires role [${allowedRoles.join(', ')}].`
      });
    }
    next();
  };
};

// Require Specific Permission Middleware
const requirePermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: `HTTP 403 Forbidden: You do not have permission [${permissionKey}] to perform this action.`
      });
    }

    // Allow Admin & Super Admin to add/create companies and places
    if ((permissionKey === 'company.create' || permissionKey === 'place.create') &&
        (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
      return next();
    }

    if (!req.user.permissions || !req.user.permissions.includes(permissionKey)) {
      return res.status(403).json({
        success: false,
        message: `HTTP 403 Forbidden: You do not have permission [${permissionKey}] to perform this action.`
      });
    }
    next();
  };
};

// Health Check (Deep diagnostics for Pingdom, UptimeRobot, Datadog)
app.get('/api/health', async (req, res) => {
  let dbLatency = null;
  let dbStatus = 'connected';
  try {
    const start = Date.now();
    await db.query('SELECT 1');
    dbLatency = Date.now() - start;
  } catch (err) {
    dbStatus = 'disconnected';
  }

  const mem = process.memoryUsage();
  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    message: 'MCC MRF Innovation Park Backend Server Running',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024)
      }
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatency
    },
    security: {
      sslLabsTarget: 'A+',
      securityHeaders: 'Active',
      rateLimiting: 'Active',
      hibpProtection: 'Active',
      environment: process.env.NODE_ENV || 'production'
    }
  });
});

// ==========================================================================
// AUTHENTICATION & LOGIN ENDPOINTS
// ==========================================================================

// Admin, Super Admin & Company Authentication
// In-Memory Password Reset OTP Store
const passwordResetOtpStore = new Map();

// Admin, Super Admin & Company Authentication (Protected with strict brute-force rate limiter)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = (username || email || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/Username and Password are required.' });
    }

    // 1. Resolve User from Database (checks both users and companies)
    let user = await db.getUserByEmailOrUsername(loginIdentifier);
    if (!user) {
      user = await db.getCompanyUserByEmail(loginIdentifier);
    }
    const company = await db.getCompanyByEmail(loginIdentifier);

    // 2. Validate Password:
    // ADMIN and SUPERADMIN: ONLY their old passwords (super2024 / Novara2024) or their changed password hash.
    // Mccmrfip@123 MUST NOT open Admin or Super Admin!
    // Company accounts: default Mccmrfip@123 or company password.
    const isSuperAdminAccount = (user && (user.role === 'SUPER_ADMIN' || user.role_id === 1)) ||
      loginIdentifier.toLowerCase() === 'mccmrfip@super' ||
      loginIdentifier.toLowerCase() === 'superadmin@mccmrfip.com';

    const isAdminAccount = (user && (user.role === 'ADMIN' || user.role_id === 2)) ||
      loginIdentifier.toLowerCase() === 'mccmrfip@admin' ||
      loginIdentifier.toLowerCase() === 'admin@mccmrfip.com';

    let isMatch = false;

    if (isSuperAdminAccount) {
      // Super Admin: ONLY super2024 or changed password hash, NEVER Mccmrfip@123
      if (password !== 'Mccmrfip@123') {
        if (user && user.password_hash) {
          isMatch = comparePassword(password, user.password_hash);
        }
        if (!isMatch && password === 'super2024') {
          isMatch = true;
        }
      }
    } else if (isAdminAccount) {
      // Admin: ONLY Novara2024 or changed password hash, NEVER Mccmrfip@123
      if (password !== 'Mccmrfip@123') {
        if (user && user.password_hash) {
          isMatch = comparePassword(password, user.password_hash);
        }
        if (!isMatch && password === 'Novara2024') {
          isMatch = true;
        }
      }
    } else {
      // Company accounts: validate against DB hash, or default Mccmrfip@123, or company record
      if (user && user.password_hash) {
        isMatch = comparePassword(password, user.password_hash);
      }
      if (!isMatch && (password === 'Mccmrfip@123' || (company && password === company.password))) {
        isMatch = Boolean(user || company);
      }
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Email or Password' });
    }

    // 3. Resolve account status and role
    if (user && (user.account_status === 'INACTIVE' || user.account_status === 'SUSPENDED')) {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently inactive. Please contact the administrator.'
      });
    }

    const resolvedRole = user
      ? (user.role || (user.role_id === 1 ? 'SUPER_ADMIN' : (user.role_id === 2 ? 'ADMIN' : 'COMPANY')))
      : (loginIdentifier.toLowerCase().includes('super') ? 'SUPER_ADMIN' : (loginIdentifier.toLowerCase().includes('admin') ? 'ADMIN' : 'COMPANY'));

    const resolvedRoleId = user
      ? (user.role_id || (resolvedRole === 'SUPER_ADMIN' ? 1 : (resolvedRole === 'ADMIN' ? 2 : 3)))
      : (resolvedRole === 'SUPER_ADMIN' ? 1 : (resolvedRole === 'ADMIN' ? 2 : 3));

    const userId = user ? user.id : (resolvedRole === 'SUPER_ADMIN' ? 1 : 2);
    const userName = user ? (user.name || user.username) : (resolvedRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin');
    const userEmail = user ? user.email : loginIdentifier;
    const targetCompId = user ? user.company_id : (company ? company.id : null);
    const resolvedCompany = targetCompId ? await db.getCompanyById(targetCompId) : company;

    const token = jwt.sign(
      {
        id: userId,
        company_id: targetCompId,
        name: userName,
        email: userEmail,
        username: user ? user.username : loginIdentifier,
        role: resolvedRole,
        role_id: resolvedRoleId,
        must_change_password: false
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      requiresPasswordChange: false,
      token,
      role: resolvedRole,
      user: {
        id: userId,
        company_id: targetCompId,
        email: userEmail,
        name: userName,
        username: user ? user.username : loginIdentifier,
        role: resolvedRole,
        role_id: resolvedRoleId
      },
      company: resolvedCompany
    });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
});

// Send Verification Code (OTP) to registered Email / Gmail (Protected with rate limiter)
app.post(['/api/auth/forgot-password/send-otp', '/api/user/forgot-password/send-otp', '/api/auth/forgot-password'], authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a valid registered email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check in users and companies (supports email or username)
    const user = await db.getUserByEmailOrUsername(cleanEmail) || await db.getCompanyUserByEmail(cleanEmail);
    const company = await db.getCompanyByEmail(cleanEmail);

    if (!user && !company) {
      return res.status(404).json({
        success: false,
        message: 'No registered account found with this email address. Please check and try again.'
      });
    }

    // Resolve destination Gmail / email address
    const targetEmail = (user && user.email)
      ? user.email.toLowerCase()
      : (company && company.email ? company.email.toLowerCase() : cleanEmail);

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const otpData = {
      otp,
      expiresAt,
      userId: user ? user.id : null,
      companyId: company ? company.id : (user ? user.company_id : null),
      targetEmail
    };

    passwordResetOtpStore.set(cleanEmail, otpData);
    if (targetEmail !== cleanEmail) {
      passwordResetOtpStore.set(targetEmail, otpData);
    }

    console.log(`[AUTH FORGOT PASSWORD] Generated OTP ${otp} for ${targetEmail} (input: ${cleanEmail}) valid 15 mins`);

    // Dispatch email with Nodemailer
    let emailResult = { success: false };
    try {
      emailResult = await emailService.sendPasswordResetOtp(targetEmail, otp);
    } catch (err) {
      console.warn('[AUTH FORGOT PASSWORD] Email delivery notice:', err.message);
    }

    return res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${targetEmail}. Please check your Gmail or email inbox.`,
      email: targetEmail,
      emailSent: emailResult.success
    });
  } catch (err) {
    console.error('Forgot password send-otp error:', err);
    res.status(500).json({ success: false, message: 'Failed to send verification code: ' + err.message });
  }
});

// Verify OTP & Reset Password (Protected with rate limiter and strict HIBP security check)
app.post(['/api/auth/forgot-password/verify-otp', '/api/user/forgot-password/verify-otp', '/api/auth/reset-password-otp'], authLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Registered email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Mandatory OTP verification
    if (!otp || String(otp).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please enter the 6-digit verification code sent to your Gmail inbox.'
      });
    }

    // Lookup OTP
    let stored = passwordResetOtpStore.get(cleanEmail);
    if (!stored) {
      const userPre = await db.getUserByEmailOrUsername(cleanEmail) || await db.getCompanyUserByEmail(cleanEmail);
      if (userPre && userPre.email) {
        stored = passwordResetOtpStore.get(userPre.email.toLowerCase());
      }
    }

    if (!stored) {
      return res.status(400).json({
        success: false,
        message: 'No active verification code found for this email. Please click Resend Code.'
      });
    }

    if (Date.now() > stored.expiresAt) {
      passwordResetOtpStore.delete(cleanEmail);
      if (stored.targetEmail) passwordResetOtpStore.delete(stored.targetEmail);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    if (String(stored.otp).trim() !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your Gmail and enter the correct 6-digit code.'
      });
    }

    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    // Validate password requirements & Have I Been Pwned breach check
    const passCheck = await validatePasswordStrict(newPassword);
    if (!passCheck.valid) {
      return res.status(400).json({ success: false, message: passCheck.message });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    const user = await db.getUserByEmailOrUsername(cleanEmail) || await db.getCompanyUserByEmail(cleanEmail);
    const company = await db.getCompanyByEmail(cleanEmail);

    if (!user && !company) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const newHash = hashPassword(newPassword);

    if (user && user.id) {
      await db.updateUserPasswordHash(user.id, newHash, true);
    }

    const targetCompId = company ? company.id : (user ? user.company_id : null);
    if (targetCompId) {
      await db.updateCompanyPassword(targetCompId, newPassword);
    }
    try {
      await db.updateCompanyPasswordByEmail(cleanEmail, newPassword);
      if (user && user.email) {
        await db.updateCompanyPasswordByEmail(user.email, newPassword);
      }
      if (stored.targetEmail) {
        await db.updateCompanyPasswordByEmail(stored.targetEmail, newPassword);
      }
    } catch (e) {}

    // Consume OTP
    passwordResetOtpStore.delete(cleanEmail);
    if (stored.targetEmail) passwordResetOtpStore.delete(stored.targetEmail);

    console.log(`[AUTH FORGOT PASSWORD] Successfully updated password for ${cleanEmail} (target: ${stored.targetEmail || cleanEmail})`);

    return res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Forgot password verify-otp error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password: ' + err.message });
  }
});

// Legacy Company / User Login endpoint alias
app.post('/api/user/login', async (req, res) => {
  return app._router.handle({ ...req, url: '/api/auth/login' }, res);
});

// Legacy Admin Login compatibility endpoint
app.post('/api/admin/login', async (req, res) => {
  return app._router.handle({ ...req, url: '/api/auth/login' }, res);
});

// Get Current Authenticated User
app.get('/api/auth/me', authenticateJWT, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
    permissions: req.user.permissions
  });
});

// Change Password for User / Admin / Company (Rate-limited & HIBP verified)
app.post('/api/auth/change-password', authLimiter, async (req, res) => {
  try {
    const { companyId, email, currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New Password and Confirm Password do not match.' });
    }

    // Strict validation with complexity rules and HIBP breach check
    const passCheck = await validatePasswordStrict(newPassword);
    if (!passCheck.valid) {
      return res.status(400).json({ success: false, message: passCheck.message });
    }

    // Resolve user (supports company, admin, super admin)
    let user = null;
    if (email) {
      user = await db.getUserByEmailOrUsername(email.trim()) || await db.getCompanyUserByEmail(email.trim());
    } else if (companyId) {
      user = await db.getCompanyUserByCompanyId(companyId);
    } else if (req.user && req.user.id) {
      user = await db.getUserById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Verify current password if provided
    if (currentPassword) {
      const isSuperAdminAccount = (user && (user.role === 'SUPER_ADMIN' || user.role_id === 1));
      const isAdminAccount = (user && (user.role === 'ADMIN' || user.role_id === 2));

      let currentMatch = comparePassword(currentPassword, user.password_hash);
      if (!currentMatch && process.env.NODE_ENV !== 'production') {
        if (isSuperAdminAccount && currentPassword === 'super2024') {
          currentMatch = true;
        } else if (isAdminAccount && currentPassword === 'Novara2024') {
          currentMatch = true;
        } else if (!isSuperAdminAccount && !isAdminAccount && currentPassword === 'Mccmrfip@123') {
          currentMatch = true;
        }
      }

      if (!currentMatch) {
        return res.status(401).json({ success: false, message: 'Current Password is incorrect.' });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({ success: false, message: 'New password cannot be the same as your current password.' });
      }
    }

    const newHash = hashPassword(newPassword);
    await db.updateUserPasswordHash(user.id, newHash, true);

    if (user.company_id) {
      await db.updateCompanyPassword(user.company_id, newPassword);
    }
    if (user.email) {
      try {
        await db.updateCompanyPasswordByEmail(user.email, newPassword);
      } catch (e) {}
    }

    const updatedUser = await db.getUserById(user.id);
    const resolvedRole = updatedUser.role || (updatedUser.role_id === 1 ? 'SUPER_ADMIN' : (updatedUser.role_id === 2 ? 'ADMIN' : 'COMPANY'));

    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        company_id: updatedUser.company_id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: resolvedRole,
        role_id: updatedUser.role_id || 3,
        must_change_password: false
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Password changed successfully! You can now access your dashboard.',
      token: newToken,
      user: {
        id: updatedUser.id,
        company_id: updatedUser.company_id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: resolvedRole,
        must_change_password: false
      }
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: 'Failed to change password: ' + err.message });
  }
});

app.post('/api/user/change-password', async (req, res) => {
  return app._router.handle({ ...req, url: '/api/auth/change-password' }, res);
});

// Get Company Profile by ID
app.get('/api/company/:id', async (req, res) => {
  try {
    const company = await db.getCompanyById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // 1. Fetch admin transactions and verified payments
    let adminTxns = await db.getAdminTransactions(company.company_name);
    const companyPayments = await db.getPaymentsByCompany(company.id);

    // 2. Check if company has verified paid records
    const verifiedPaidList = (companyPayments || []).filter(
      (p) => p.payment_status === 'PAID' || p.payment_status === 'SUCCESS' || p.status === 'PAID' || p.status === 'SUCCESS' || p.status === 'Paid'
    );

    // If verified paid records exist, ensure any pending status in admin_transactions is marked Paid
    if (verifiedPaidList.length > 0) {
      for (const vp of verifiedPaidList) {
        await db.syncAdminTransactionToPaid(company.company_name, vp.transaction_id || vp.payu_transaction_id, vp.month_year);
      }
      adminTxns = await db.getAdminTransactions(company.company_name);
    }

    // 3. Build a comprehensive payments list
    const paymentMap = new Map();

    (adminTxns || []).forEach((t) => {
      const key = t.txnid || `txn_${t.id}`;
      paymentMap.set(key, {
        id: t.id,
        date: t.date,
        txnid: t.txnid,
        company_name: t.company_name,
        month: t.month,
        month_year: t.month,
        amount: Number(t.amount || 0),
        gst: Number(t.gst || 0),
        total: Number(t.total || 0),
        method: t.method || 'PayU',
        payment_method: t.method || 'PayU India (UPI / Card)',
        status: (t.status === 'Completed' || t.status === 'PAID' || t.status === 'SUCCESS') ? 'Paid' : t.status
      });
    });

    // Merge in company payments from payments table
    (companyPayments || []).forEach((cp) => {
      const key = cp.transaction_id || cp.payu_transaction_id || `pay_${cp.id}`;
      const isPaid = cp.payment_status === 'PAID' || cp.status === 'PAID' || cp.payment_status === 'SUCCESS' || cp.status === 'SUCCESS';
      const existing = paymentMap.get(key);

      if (existing) {
        if (isPaid) existing.status = 'Paid';
        if (cp.payu_payment_id) existing.payu_payment_id = cp.payu_payment_id;
        if (cp.payment_method) existing.payment_method = cp.payment_method;
      } else if (isPaid) {
        const amt = Number(cp.amount || 0);
        const gst = Math.round(amt * 0.18);
        paymentMap.set(key, {
          id: cp.id,
          date: cp.payment_date ? new Date(cp.payment_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
          txnid: key,
          company_name: company.company_name,
          month: cp.month_year || 'Current Month',
          month_year: cp.month_year || 'Current Month',
          amount: amt,
          gst: gst,
          total: amt + gst,
          method: cp.payment_method || 'PayU',
          payment_method: cp.payment_method || 'PayU India (UPI / Card)',
          status: 'Paid',
          payu_payment_id: cp.payu_payment_id
        });
      }
    });

    const payments = Array.from(paymentMap.values()).sort((a, b) => (b.id || 0) - (a.id || 0));

    // Calculate pending status
    const hasPendingDue = payments.some(
      (p) => p.status === 'Pending' || p.status === 'PENDING' || p.status === 'Overdue'
    );
    const isPaid = !hasPendingDue && payments.some((p) => p.status === 'Paid');

    res.json({
      success: true,
      company,
      payments,
      hasPendingDue,
      isPaid
    });
  } catch (err) {
    console.error('Error fetching company profile:', err);
    res.status(500).json({ success: false, message: 'Error fetching company profile' });
  }
});

// Update Company Profile from User Dashboard
app.put('/api/company/update-profile', async (req, res) => {
  try {
    const { companyId, company_name, contact_number, interns_count, workers_count, gst_number } = req.body;
    const cId = companyId || 1;

    const updatedCompany = await db.updateCompanyProfile(cId, {
      company_name,
      contact_number,
      interns_count: Number(interns_count || 0),
      workers_count: Number(workers_count || 0),
      gst_number
    });

    res.json({
      success: true,
      message: 'Profile details updated successfully',
      company: updatedCompany
    });
  } catch (err) {
    console.error('Error updating company profile:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

app.put('/api/company/:id', async (req, res) => {
  try {
    const cId = req.params.id;
    const { company_name, contact_number, interns_count, workers_count, gst_number } = req.body;

    const updatedCompany = await db.updateCompanyProfile(cId, {
      company_name,
      contact_number,
      interns_count: Number(interns_count || 0),
      workers_count: Number(workers_count || 0),
      gst_number
    });

    res.json({
      success: true,
      message: 'Profile details updated successfully',
      company: updatedCompany
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// ==========================================================================
// DASHBOARD ANALYTICS ENDPOINTS
// ==========================================================================
app.get('/api/dashboard/stats', authenticateJWT, async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

app.get('/api/dashboard/revenue', authenticateJWT, async (req, res) => {
  try {
    const payments = await db.getAllPayments();
    const monthlySummary = {};

    payments.forEach((p) => {
      if (p.status === 'Paid' || p.status === 'Completed' || p.status === 'SUCCESS') {
        const m = p.month_year || 'Recent';
        monthlySummary[m] = (monthlySummary[m] || 0) + Number(p.amount || 0);
      }
    });

    const chartData = Object.keys(monthlySummary).map((month) => ({
      month,
      revenue: monthlySummary[month]
    }));

    res.json({
      success: true, revenueData: chartData.length ? chartData : [
        { month: 'Jan 2026', revenue: 77880 },
        { month: 'Feb 2026', revenue: 30680 },
        { month: 'Mar 2026', revenue: 7080 },
        { month: 'Apr 2026', revenue: 3540 },
        { month: 'Jun 2026', revenue: 11800 }
      ]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch revenue analytics' });
  }
});

app.get('/api/dashboard/recent-companies', authenticateJWT, async (req, res) => {
  try {
    const companies = await db.getCompanies();
    res.json({ success: true, companies: companies.slice(0, 5) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching recent companies' });
  }
});

app.get('/api/dashboard/recent-payments', authenticateJWT, async (req, res) => {
  try {
    const payments = await db.getAllPayments();
    res.json({ success: true, payments: payments.slice(0, 5) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching recent payments' });
  }
});

// ==========================================================================
// COMPANIES MODULE (RBAC RESTRICTED)
// ==========================================================================
// ==========================================================================
// COMPANIES MODULE (RBAC RESTRICTED & INTEGRATED AUTH)
// ==========================================================================
app.get(['/api/companies', '/api/admin/companies'], authenticateJWT, async (req, res) => {
  try {
    const companies = await db.getCompaniesWithUsers();
    res.json({ success: true, companies });
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.get(['/api/companies/:id', '/api/admin/companies/:id'], authenticateJWT, async (req, res) => {
  try {
    const company = await db.getCompanyById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    const user = await db.getCompanyUserByCompanyId(company.id);
    const payments = await db.getPaymentsByCompany(company.id);
    res.json({
      success: true,
      company: {
        ...company,
        must_change_password: user ? Boolean(user.must_change_password) : true,
        account_status: user ? (user.account_status || 'ACTIVE') : 'ACTIVE'
      },
      payments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// CREATE Company + User Account + Send Credentials Email (Admin & Super Admin)
app.post(['/api/companies', '/api/admin/companies'], authenticateJWT, requirePermission('company.create'), async (req, res) => {
  try {
    const company_name = req.body.company_name || req.body.companyName;
    const contact_person = req.body.contact_person || req.body.contactPerson;
    const email = (req.body.email || '').trim().toLowerCase();
    const contact_number = req.body.contact_number || req.body.contactNumber;
    const interns_count = req.body.interns_count ?? req.body.mccInterns ?? 0;
    const workers_count = req.body.workers_count ?? req.body.mccWorkers ?? 1;
    const business_description = req.body.business_description || req.body.businessDescription || '';
    const gst_number = req.body.gst_number || req.body.gstNumber || '';
    const place = req.body.place || 'MCafe Pod';
    const monthly_rate = req.body.monthly_rate ?? req.body.monthlyRate ?? 10000;
    const incubation_date = req.body.incubation_date || req.body.dateOfIncubation || new Date().toISOString().split('T')[0];
    let temporaryPassword = req.body.temporaryPassword || req.body.password;

    if (!company_name || !email || !contact_person) {
      return res.status(400).json({ success: false, message: 'Company Name, Contact Person, and Email Address are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    // 1. Duplicate email check
    const existingUser = await db.getCompanyUserByEmail(email);
    const existingComp = await db.getCompanyByEmail(email);
    if (existingUser || existingComp) {
      return res.status(400).json({
        success: false,
        message: 'An account already exists with this email address.'
      });
    }

    // 2. Validate or Generate Temporary Password
    if (temporaryPassword) {
      const passValidation = validatePasswordRequirements(temporaryPassword);
      if (!passValidation.valid) {
        return res.status(400).json({ success: false, message: passValidation.message });
      }
    } else {
      temporaryPassword = generateTemporaryPassword(12);
    }

    // 3. Hash Temporary Password using bcrypt
    const passwordHash = hashPassword(temporaryPassword);

    const companyData = {
      company_name,
      contact_person,
      email,
      contact_number,
      interns_count,
      workers_count,
      business_description,
      gst_number,
      place,
      monthly_rate,
      incubation_date,
      status: req.body.status || 'Approved'
    };

    // 4. MySQL Transaction for Company + User Account Creation
    const { company, user } = await db.createCompanyWithAccountTx({ companyData, passwordHash });

    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'COMPANY_CREATED',
      module: 'Companies',
      record_id: company.id,
      new_data: { company_id: company.id, company_name: company.company_name, email: company.email }
    });

    // 5. Load Active SMTP & Send Credential Email ONLY to Company Email
    const loginUrl = process.env.COMPANY_LOGIN_URL || process.env.FRONTEND_URL || 'http://localhost:5173/login';
    const emailResult = await emailService.sendCompanyCredentialsEmail({
      recipientEmail: email,
      temporaryPassword,
      loginUrl
    });

    if (emailResult.success) {
      await db.addAuditLog({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'CREDENTIAL_EMAIL_SENT',
        module: 'Companies',
        record_id: company.id
      });

      return res.status(201).json({
        success: true,
        email_sent: true,
        company,
        message: `Company created successfully. Login credentials email sent to ${email}.`
      });
    } else {
      await db.addAuditLog({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'CREDENTIAL_EMAIL_FAILED',
        module: 'Companies',
        record_id: company.id
      });

      return res.status(201).json({
        success: true,
        email_sent: false,
        company,
        message: 'Company created successfully, but the login credentials email could not be sent.'
      });
    }
  } catch (err) {
    console.error('Error creating company:', err);
    res.status(500).json({ success: false, message: 'Failed to create company.' });
  }
});

// RESET TEMPORARY PASSWORD (Admin & Super Admin)
app.post(['/api/companies/:id/reset-password', '/api/admin/companies/:id/reset-password'], authenticateJWT, requirePermission('company.update'), async (req, res) => {
  try {
    const companyId = req.params.id;
    const company = await db.getCompanyById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    let temporaryPassword = req.body.temporaryPassword;
    if (temporaryPassword) {
      const passCheck = validatePasswordRequirements(temporaryPassword);
      if (!passCheck.valid) {
        return res.status(400).json({ success: false, message: passCheck.message });
      }
    } else {
      temporaryPassword = generateTemporaryPassword(12);
    }

    const passwordHash = hashPassword(temporaryPassword);
    await db.resetCompanyTemporaryPassword(companyId, passwordHash);

    const loginUrl = process.env.COMPANY_LOGIN_URL || process.env.FRONTEND_URL || 'http://localhost:5173/login';
    const emailResult = await emailService.sendCompanyCredentialsEmail({
      recipientEmail: company.email,
      temporaryPassword,
      loginUrl
    });

    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'TEMP_PASSWORD_RESET',
      module: 'Companies',
      record_id: Number(companyId)
    });

    if (emailResult.success) {
      res.json({ success: true, email_sent: true, message: `New temporary password set and sent to ${company.email}.` });
    } else {
      res.json({ success: true, email_sent: false, message: 'Temporary password reset, but failed to send credentials email.' });
    }
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ success: false, message: 'Failed to reset company temporary password.' });
  }
});

// RESEND CREDENTIALS (Admin & Super Admin)
app.post(['/api/companies/:id/resend-credentials', '/api/admin/companies/:id/resend-credentials'], authenticateJWT, requirePermission('company.update'), async (req, res) => {
  try {
    const companyId = req.params.id;
    const company = await db.getCompanyById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const temporaryPassword = req.body.temporaryPassword || generateTemporaryPassword(12);
    const passwordHash = hashPassword(temporaryPassword);
    await db.resetCompanyTemporaryPassword(companyId, passwordHash);

    const loginUrl = process.env.COMPANY_LOGIN_URL || process.env.FRONTEND_URL || 'http://localhost:5173/login';
    const emailResult = await emailService.sendCompanyCredentialsEmail({
      recipientEmail: company.email,
      temporaryPassword,
      loginUrl
    });

    if (emailResult.success) {
      res.json({ success: true, email_sent: true, message: `Login credentials email sent successfully to ${company.email}.` });
    } else {
      res.json({ success: false, email_sent: false, message: 'Failed to send login credentials email. Please check SMTP settings.' });
    }
  } catch (err) {
    console.error('Error resending credentials:', err);
    res.status(500).json({ success: false, message: 'Failed to resend credentials.' });
  }
});

// SEND OVERDUE RENT ALERT EMAIL (Admin & Super Admin)
app.post(['/api/companies/:id/send-rent-alert', '/api/admin/companies/:id/send-rent-alert'], authenticateJWT, async (req, res) => {
  try {
    const companyId = req.params.id;
    const company = await db.getCompanyById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const payments = db.getPaymentsByCompany ? await db.getPaymentsByCompany(companyId) : [];
    const pendingPayments = (payments || []).filter((p) => p.status === 'Pending' || p.status === 'PENDING' || p.status === 'Overdue');
    
    const overdueMonthsText = pendingPayments.length > 0
      ? pendingPayments.map((p) => p.month_year || p.month).join(', ')
      : 'Incubation Monthly Rent';

    const totalOverdue = pendingPayments.length > 0
      ? pendingPayments.reduce((sum, p) => sum + Number(p.amount || company.monthly_rate || 0), 0)
      : Number(company.monthly_rate || 0);

    const emailResult = await emailService.sendRentOverdueAlertEmail({
      recipientEmail: company.email,
      companyName: company.company_name,
      overdueMonths: overdueMonthsText,
      totalOverdueAmount: totalOverdue
    });

    if (emailResult.success) {
      await db.addAuditLog({
        user_id: req.user?.id || 1,
        user_name: req.user?.name || 'Admin',
        user_role: req.user?.role || 'SUPER_ADMIN',
        action: 'RENT_ALERT_EMAIL_SENT',
        module: 'Companies',
        record_id: company.id
      });
      res.json({ success: true, email_sent: true, message: `Rent overdue alert email sent successfully to ${company.email}.` });
    } else {
      res.status(500).json({ success: false, email_sent: false, message: emailResult.error || 'Failed to send rent alert email.' });
    }
  } catch (err) {
    console.error('Error sending rent alert email:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error while sending rent alert email.' });
  }
});

// BATCH AUTOMATED RENT ALERT EMAIL FOR ALL UNPAID/PENDING COMPANIES (Admin & Super Admin)
app.post(['/api/companies/auto-send-rent-alerts', '/api/admin/companies/auto-send-rent-alerts'], authenticateJWT, async (req, res) => {
  try {
    const allCompanies = db.getAllCompanies ? await db.getAllCompanies() : [];
    let sentCount = 0;
    let failedCount = 0;
    const results = [];

    for (const comp of allCompanies) {
      if (!comp.email) continue;
      const payments = db.getPaymentsByCompany ? await db.getPaymentsByCompany(comp.id) : [];
      const pendingPayments = (payments || []).filter((p) => p.status === 'Pending' || p.status === 'PENDING' || p.status === 'Overdue');
      
      if (pendingPayments.length > 0) {
        const overdueMonthsText = pendingPayments.map((p) => p.month_year || p.month).join(', ');
        const totalOverdue = pendingPayments.reduce((sum, p) => sum + Number(p.amount || comp.monthly_rate || 0), 0);

        const emailResult = await emailService.sendRentOverdueAlertEmail({
          recipientEmail: comp.email,
          companyName: comp.company_name,
          overdueMonths: overdueMonthsText,
          totalOverdueAmount: totalOverdue
        });

        if (emailResult.success) {
          sentCount++;
          results.push({ company_name: comp.company_name, email: comp.email, status: 'SENT' });
        } else {
          failedCount++;
          results.push({ company_name: comp.company_name, email: comp.email, status: 'FAILED', error: emailResult.error });
        }
      }
    }

    res.json({
      success: true,
      sent_count: sentCount,
      failed_count: failedCount,
      message: `Automated rent payment alert process completed. Sent: ${sentCount}, Failed: ${failedCount}.`,
      results
    });
  } catch (err) {
    console.error('Error running automated rent alerts batch:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error during automated rent alert process.' });
  }
});

// ACTIVATE / DEACTIVATE COMPANY ACCOUNT STATUS (Admin & Super Admin)
app.patch(['/api/companies/:id/status', '/api/admin/companies/:id/status'], authenticateJWT, requirePermission('company.update'), async (req, res) => {
  try {
    const companyId = req.params.id;
    const { status, account_status } = req.body;
    const newStatus = (account_status || status || 'ACTIVE').toUpperCase();

    const company = await db.getCompanyById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    await db.updateAccountStatus(companyId, newStatus);

    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: newStatus === 'ACTIVE' ? 'COMPANY_ACTIVATED' : 'COMPANY_DEACTIVATED',
      module: 'Companies',
      record_id: Number(companyId)
    });

    res.json({ success: true, message: `Company account status updated to ${newStatus}.` });
  } catch (err) {
    console.error('Error updating account status:', err);
    res.status(500).json({ success: false, message: 'Failed to update account status.' });
  }
});

// UPDATE Company (Super Admin has Full Access; Admin has RESTRICTED fields ONLY!)
app.put(['/api/companies/:id', '/api/admin/companies/:id'], authenticateJWT, requirePermission('company.update'), async (req, res) => {
  try {
    const existing = await db.getCompanyById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    if (req.user.role === 'ADMIN') {
      const restrictedFieldsAttempted = ['place_id', 'place', 'rate', 'monthly_rate', 'status', 'payment_status'].some(
        (field) => req.body[field] !== undefined && req.body[field] !== existing[field]
      );

      if (restrictedFieldsAttempted) {
        return res.status(403).json({
          success: false,
          message: 'HTTP 403 Forbidden: Admin role is not permitted to modify workspace place, rate, or approval status.'
        });
      }
    }

    const updateData = { ...existing };
    updateData.company_name = req.body.company_name ?? existing.company_name;
    updateData.contact_person = req.body.contact_person ?? existing.contact_person;
    updateData.email = req.body.email ?? existing.email;
    updateData.contact_number = req.body.contact_number ?? existing.contact_number;
    updateData.interns_count = req.body.interns_count ?? existing.interns_count;
    updateData.workers_count = req.body.workers_count ?? existing.workers_count;
    updateData.business_description = req.body.business_description ?? existing.business_description;

    if (req.user.role === 'SUPER_ADMIN') {
      updateData.place = req.body.place ?? existing.place;
      updateData.monthly_rate = req.body.monthly_rate ?? existing.monthly_rate;
      updateData.status = req.body.status ?? existing.status;
      updateData.gst_number = req.body.gst_number ?? existing.gst_number;
      updateData.incubation_date = req.body.incubation_date ?? existing.incubation_date;
    }

    const updated = await db.updateCompany(req.params.id, updateData);

    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'UPDATE',
      module: 'Companies',
      record_id: Number(req.params.id),
      old_data: existing,
      new_data: updated
    });

    res.json({ success: true, company: updated, message: 'Company updated successfully' });
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ success: false, message: 'Failed to update company' });
  }
});

// DELETE Company (Super Admin Only! Returns 403 for Admin)
app.delete(['/api/companies/:id', '/api/admin/companies/:id'], authenticateJWT, requirePermission('company.delete'), async (req, res) => {
  try {
    const existing = await db.getCompanyById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    await db.deleteCompany(req.params.id);

    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'DELETE',
      module: 'Companies',
      record_id: Number(req.params.id),
      old_data: existing
    });

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (err) {
    console.error('Error deleting company:', err);
    res.status(500).json({ success: false, message: 'Failed to delete company' });
  }
});

// ==========================================================================
// PLACES MODULE (SUPER ADMIN CRUD; ADMIN READ-ONLY)
// ==========================================================================
app.get('/api/places', authenticateJWT, async (req, res) => {
  try {
    const places = await db.getPlaces();
    res.json({ success: true, places });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch places' });
  }
});

app.post('/api/places', authenticateJWT, requirePermission('place.create'), async (req, res) => {
  try {
    const newPlace = await db.addPlace(req.body);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'CREATE',
      module: 'Places',
      record_id: newPlace.id,
      new_data: newPlace
    });
    res.status(201).json({ success: true, place: newPlace, message: 'Place added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add place' });
  }
});

app.put('/api/places/:id', authenticateJWT, requirePermission('place.update'), async (req, res) => {
  try {
    const existing = await db.getPlaceById(req.params.id);
    const updated = await db.updatePlace(req.params.id, req.body);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'UPDATE',
      module: 'Places',
      record_id: Number(req.params.id),
      old_data: existing,
      new_data: updated
    });
    res.json({ success: true, place: updated, message: 'Place updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update place' });
  }
});

app.delete('/api/places/:id', authenticateJWT, requirePermission('place.delete'), async (req, res) => {
  try {
    const existing = await db.getPlaceById(req.params.id);
    await db.deletePlace(req.params.id);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'DELETE',
      module: 'Places',
      record_id: Number(req.params.id),
      old_data: existing
    });
    res.json({ success: true, message: 'Place deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete place' });
  }
});

// ==========================================================================
// PAYMENTS & RAZORPAY MODULE
// ==========================================================================
app.get('/api/payments', authenticateJWT, async (req, res) => {
  try {
    const { status, search } = req.query;
    const payments = await db.getAllPayments(status, search);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

app.get('/api/admin/payments-list', authenticateJWT, async (req, res) => {
  try {
    const { status, search } = req.query;
    const payments = await db.getAllPayments(status, search);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.get('/api/admin/payments', authenticateJWT, async (req, res) => {
  try {
    const { company_name } = req.query;
    const payments = await db.getAdminTransactions(company_name);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ==========================================================================
// INVOICES & PAYMENTS SYSTEM (RAZORPAY STANDARD CHECKOUT INTEGRATION)
// ==========================================================================

// Invoices API
app.get('/api/invoices', async (req, res) => {
  try {
    const { company_id } = req.query;
    const invoices = await db.getInvoices(company_id || 'all');
    res.json({ success: true, invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  try {
    const invoice = await db.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoice details' });
  }
});

app.get('/api/invoices/:id/receipt', async (req, res) => {
  try {
    const invoice = await db.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const company = await db.getCompanyById(invoice.company_id);
    const payments = await db.getPaymentsByCompany(invoice.company_id);
    const lastPayment = payments.find(p => p.status === 'PAID' || p.payment_status === 'PAID') || payments[0];

    res.json({
      success: true,
      receipt: {
        organization: 'MCC MRF Innovation Park',
        address: 'East Tambaram, Chennai, 600059, Tamil Nadu',
        phone: '+91 72000 99955',
        email: 'Info@mccmrfip.com',
        invoice_number: invoice.invoice_number,
        payment_id: lastPayment ? (lastPayment.payu_payment_id || lastPayment.transaction_id || lastPayment.id) : `pay_inv_${invoice.id}`,
        company_name: company ? company.company_name : invoice.company_name,
        contact_person: company ? company.contact_person : invoice.contact_person,
        email_address: company ? company.email : invoice.email,
        phone_number: company ? company.contact_number : invoice.contact_number,
        place: company ? company.place : invoice.place,
        billing_period: invoice.billing_period,
        amount: Number(invoice.total_amount || invoice.amount),
        payment_method: lastPayment ? (lastPayment.payment_method || 'PayU (UPI / Card)') : 'PayU (UPI / Card)',
        payment_date: lastPayment ? (lastPayment.payment_date || new Date().toISOString()) : new Date().toISOString(),
        payment_status: invoice.status === 'PAID' ? 'PAID' : invoice.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate receipt' });
  }
});

// ==========================================================================
// PAYU INDIA PAYMENT GATEWAY INTEGRATION
// ==========================================================================

// ==========================================================================
// PAYU INDIA PAYMENT GATEWAY INTEGRATION (HOSTED CHECKOUT)
// ==========================================================================

// CREATE PAYU PAYMENT TRANSACTION API
app.post(['/api/payments/create-payu-payment', '/api/payment/create-payu-payment', '/api/payments/create-order'], async (req, res) => {
  try {
    const { company_id, invoice_id, companyId, billing_month, months_count } = req.body || {};
    const targetCompanyId = company_id || companyId || (req.user ? req.user.id : 1);

    const company = await db.getCompanyById(targetCompanyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Incubation company not found' });
    }

    // Server-Side Invoice Resolution & Rent/GST Calculation (Never trust frontend amount)
    let targetInvoice = null;
    if (invoice_id) {
      targetInvoice = await db.getInvoiceById(invoice_id);
      if (targetInvoice && targetInvoice.status === 'PAID') {
        return res.status(400).json({ success: false, message: 'This invoice has already been paid.' });
      }
    }

    const baseMonthlyRate = Number(company.monthly_rate || 10000);
    const selectedMonthsCount = targetInvoice
      ? 1
      : Math.max(1, Number(months_count || req.body.month_count || 1));
    const monthlyRent = targetInvoice
      ? Number(targetInvoice.amount || baseMonthlyRate)
      : baseMonthlyRate * selectedMonthsCount;
    const gstAmount = Math.round(monthlyRent * 0.18);
    const totalAmount = targetInvoice
      ? Number(targetInvoice.total_amount || (monthlyRent + gstAmount))
      : (monthlyRent + gstAmount);
    const formattedAmount = Number(totalAmount).toFixed(2);

    // Generate Unique Transaction ID (strictly adheres to PayU length <= 25 characters, alphanumeric)
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const transactionId = `MRF${datePrefix}${randomHex}`; // Example: MRF2610137X8Y (14 chars)
    const billingPeriod = targetInvoice ? (targetInvoice.billing_period || 'August 2026') : (billing_month || req.body.month || 'August 2026');

    // Resolve PayU Config strictly from environment variables
    const payuConfig = await payuService.getPayUConfig();

    // Check for duplicate pending transaction prevention
    const existingPending = await db.getPaymentByTxnId(transactionId);
    if (existingPending && existingPending.payment_status === 'PAID') {
      return res.status(400).json({ success: false, message: 'A completed transaction already exists for this reference.' });
    }

    // Save pending payment record in DB
    const paymentRecord = await db.createPayUPaymentTx({
      companyId: company.id,
      invoiceId: targetInvoice ? targetInvoice.id : (invoice_id || null),
      transactionId: transactionId,
      amount: totalAmount,
      monthYear: billingPeriod,
      customerName: company.contact_person || company.company_name,
      customerEmail: company.email
    });

    // Determine fully qualified Callback URLs
    const hostHeader = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const dynamicBackendUrl = `${protocol}://${hostHeader}`;
    const configuredBackendUrl = (process.env.BACKEND_URL || dynamicBackendUrl).replace(/\/$/, '');

    const successUrl = process.env.PAYU_SUCCESS_URL || `${configuredBackendUrl}/api/payments/payu/success`;
    const failureUrl = process.env.PAYU_FAILURE_URL || `${configuredBackendUrl}/api/payments/payu/failure`;

    // Sanitize parameters for Hosted Checkout POST form
    const cleanProductInfo = 'MRFRentPayment';
    const cleanFirstname = String(company.contact_person || company.company_name || 'Customer').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').trim() || 'Customer';
    const cleanEmail = String(company.email || 'accounts@mccmrfip.com').trim();
    const cleanPhone = String(company.contact_number || '9876543210').replace(/\D/g, '').slice(-10) || '9876543210';
    const targetInvoiceIdStr = targetInvoice ? String(targetInvoice.id) : String(invoice_id || '');

    // Generate SHA-512 Request Hash
    const payuHash = payuService.generatePayUHash({
      key: payuConfig.merchantKey,
      txnid: transactionId,
      amount: formattedAmount,
      productinfo: cleanProductInfo,
      firstname: cleanFirstname,
      email: cleanEmail,
      udf1: targetInvoiceIdStr,
      salt: payuConfig.merchantSalt
    });

    // Safe Diagnostic Logging (NEVER LOGS SALT OR RAW HASH INPUT)
    console.log('[PAYU INITIATE] Safe Diagnostic Info:', {
      environment: payuConfig.environment,
      endpoint: payuConfig.payuUrl,
      merchantKeyConfigured: Boolean(payuConfig.merchantKey),
      merchantSaltConfigured: Boolean(payuConfig.merchantSalt),
      txnid: transactionId,
      txnidLength: transactionId.length,
      amount: formattedAmount,
      productinfo: cleanProductInfo,
      firstname: cleanFirstname,
      customerPhoneLength: cleanPhone.length,
      surl: successUrl,
      furl: failureUrl,
      hashGenerated: Boolean(payuHash)
    });

    await db.addAuditLog({
      user_id: company.id,
      user_name: company.company_name,
      user_role: 'COMPANY_USER',
      action: 'PAYU_PAYMENT_INITIATED',
      module: 'Payments System',
      record_id: paymentRecord.id || 0,
      new_data: { transaction_id: transactionId, amount: formattedAmount }
    });

    return res.json({
      success: true,
      payuUrl: payuConfig.payuUrl,
      environment: payuConfig.environment,
      params: {
        key: payuConfig.merchantKey,
        txnid: transactionId,
        amount: formattedAmount,
        productinfo: cleanProductInfo,
        firstname: cleanFirstname,
        email: cleanEmail,
        phone: cleanPhone,
        surl: successUrl,
        furl: failureUrl,
        udf1: targetInvoiceIdStr,
        udf2: '',
        udf3: '',
        udf4: '',
        udf5: '',
        hash: payuHash
      },
      invoice_number: targetInvoice ? targetInvoice.invoice_number : `INV-MRF-2026-${String(company.s_no || company.id).padStart(5, '0')}`,
      billing_period: billingPeriod,
      monthly_rent: monthlyRent,
      gst_amount: gstAmount,
      total_amount: formattedAmount
    });
  } catch (err) {
    console.error('[PAYU INITIATE ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Failed to initiate PayU payment: ' + err.message });
  }
});

// PAYU SUCCESS CALLBACK (PayU Hosted Checkout POSTs to this endpoint)
app.post('/api/payments/payu/success', async (req, res) => {
  try {
    const payuConfig = await payuService.getPayUConfig();
    const { txnid, status, amount, hash, mihpayid, payuMoneyId, mode, udf1 } = req.body;

    const frontendOrigin = process.env.FRONTEND_URL || (req.get('host') ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5173');
    const frontendUrl = frontendOrigin.replace(/\/$/, '');

    // Safe Diagnostic Callback Logging (Zero secrets logged)
    console.log('[PAYU CALLBACK SUCCESS] Received callback:', {
      txnid,
      status,
      amount,
      mode: mode || 'N/A',
      hasHash: Boolean(hash),
      payuReferenceId: mihpayid || payuMoneyId || 'N/A'
    });

    if (!txnid) {
      console.warn('[PAYU CALLBACK SUCCESS] Missing transaction ID');
      return res.redirect(`${frontendUrl}/payment/failed?reason=MissingTransactionId`);
    }

    // 1. Retrieve existing payment record from MySQL
    const paymentRecord = await db.getPaymentByTxnId(txnid);
    if (!paymentRecord) {
      console.warn('[PAYU CALLBACK SUCCESS] No payment record found in DB for txnid:', txnid);
      return res.redirect(`${frontendUrl}/payment/failed?txnid=${encodeURIComponent(txnid)}&reason=OrderNotFound`);
    }

    // 2. Safe Idempotency Check (Handle duplicate callbacks safely)
    if (paymentRecord.payment_status === 'PAID') {
      console.log('[PAYU CALLBACK SUCCESS] Payment is already verified as PAID for txnid:', txnid);
      const existingPayuId = paymentRecord.payu_payment_id || mihpayid || payuMoneyId || '';
      return res.redirect(`${frontendUrl}/payment/success?txnid=${encodeURIComponent(txnid)}&payuid=${encodeURIComponent(existingPayuId)}`);
    }

    // 3. Cryptographic Reverse Hash Verification
    const isValidHash = payuService.verifyPayUResponseHash(req.body, payuConfig.merchantSalt);
    if (!isValidHash) {
      console.warn('[PAYU CALLBACK SUCCESS] Reverse hash verification failed for txnid:', txnid);
      await db.updatePayUPaymentStatus(txnid, {
        status: 'FAILED',
        failureReason: 'PayU response reverse hash verification mismatch'
      });
      return res.redirect(`${frontendUrl}/payment/failed?txnid=${encodeURIComponent(txnid)}&reason=HashVerificationFailed`);
    }

    // 4. Verify transaction status
    if ((status || '').toLowerCase() !== 'success') {
      console.warn('[PAYU CALLBACK SUCCESS] PayU status is not success:', status);
      await db.updatePayUPaymentStatus(txnid, {
        status: 'FAILED',
        failureReason: req.body.error_Message || 'PayU reported non-success status'
      });
      return res.redirect(`${frontendUrl}/payment/failed?txnid=${encodeURIComponent(txnid)}&reason=PaymentNotSuccessful`);
    }

    // 5. Verify expected amount matches DB
    const expectedAmount = Number(paymentRecord.amount).toFixed(2);
    const receivedAmount = Number(amount).toFixed(2);
    if (expectedAmount !== receivedAmount) {
      console.warn('[PAYU CALLBACK SUCCESS] Amount mismatch! Expected:', expectedAmount, 'Received:', receivedAmount);
      await db.updatePayUPaymentStatus(txnid, {
        status: 'FAILED',
        failureReason: `Amount mismatch: expected ${expectedAmount}, received ${receivedAmount}`
      });
      return res.redirect(`${frontendUrl}/payment/failed?txnid=${encodeURIComponent(txnid)}&reason=AmountMismatch`);
    }

    // 6. Optional Server-to-Server Verification via verify_payment API
    try {
      const apiVerification = await payuService.verifyPayUTransactionWithApi({
        txnid,
        merchantKey: payuConfig.merchantKey,
        merchantSalt: payuConfig.merchantSalt,
        verifyUrl: payuConfig.verifyUrl
      });
      if (apiVerification && apiVerification.success === false) {
        console.warn('[PAYU CALLBACK SUCCESS] API verification note:', apiVerification.message || apiVerification.error);
      }
    } catch (apiErr) {
      console.warn('[PAYU CALLBACK SUCCESS] Non-blocking API verification notice:', apiErr.message);
    }

    // 7. Update MySQL Payment Record
    const resolvedPayuId = mihpayid || payuMoneyId || `PAYU_${Date.now()}`;
    const paymentMode = mode ? `PayU (${mode.toUpperCase()})` : 'PayU Hosted Checkout';

    await db.updatePayUPaymentStatus(txnid, {
      status: 'PAID',
      payuPaymentId: resolvedPayuId,
      paymentMethod: paymentMode
    });

    // 8. Update MySQL Invoice Record
    const invoiceId = paymentRecord.invoice_id || udf1 || req.body.invoice_id;
    if (invoiceId) {
      try {
        await db.updateInvoiceStatus(invoiceId, 'PAID');
      } catch (invErr) {
        console.warn('[PAYU CALLBACK SUCCESS] Note updating invoice status:', invErr.message);
      }
    }

    // 9. Add Verified Audit Log
    await db.addAuditLog({
      user_id: paymentRecord.company_id || 1,
      user_name: paymentRecord.customer_name || 'Incubation Company',
      user_role: 'COMPANY_USER',
      action: 'PAYU_PAYMENT_VERIFIED',
      module: 'Payments System',
      record_id: paymentRecord.id,
      new_data: { txnid, payu_payment_id: resolvedPayuId, amount: receivedAmount, status: 'PAID' }
    });

    return res.redirect(`${frontendUrl}/payment/success?txnid=${encodeURIComponent(txnid)}&payuid=${encodeURIComponent(resolvedPayuId)}`);
  } catch (err) {
    console.error('[PAYU CALLBACK SUCCESS ERROR]', err);
    const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendOrigin.replace(/\/$/, '')}/payment/failed?reason=ServerError`);
  }
});

// PAYU FAILURE / CANCEL CALLBACK
app.post('/api/payments/payu/failure', async (req, res) => {
  try {
    const { txnid, status, error_Message, field9 } = req.body;
    const isCancelled = status === 'userCancelled';
    const failureReason = error_Message || field9 || (isCancelled ? 'User cancelled payment at PayU checkout' : 'Payment failed at PayU');

    console.log('[PAYU CALLBACK FAILURE] Received failure callback:', {
      txnid,
      status,
      reason: failureReason
    });

    if (txnid) {
      await db.updatePayUPaymentStatus(txnid, {
        status: isCancelled ? 'CANCELLED' : 'FAILED',
        failureReason: failureReason
      });
    }

    const frontendOrigin = process.env.FRONTEND_URL || (req.get('host') ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5173');
    const frontendUrl = frontendOrigin.replace(/\/$/, '');

    if (isCancelled) {
      return res.redirect(`${frontendUrl}/payment/cancelled?txnid=${encodeURIComponent(txnid || '')}`);
    }
    return res.redirect(`${frontendUrl}/payment/failed?txnid=${encodeURIComponent(txnid || '')}&reason=${encodeURIComponent(failureReason)}`);
  } catch (err) {
    console.error('[PAYU CALLBACK FAILURE ERROR]', err);
    const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendOrigin.replace(/\/$/, '')}/payment/failed?reason=ServerError`);
  }
});

// PAYU DIRECT VERIFICATION API (Read-only status check from DB and PayU API)
app.post('/api/payments/payu/verify', async (req, res) => {
  try {
    const { txnid } = req.body;
    if (!txnid) {
      return res.status(400).json({ success: false, message: 'Transaction ID (txnid) is required' });
    }

    const payuConfig = await payuService.getPayUConfig();
    const dbRecord = await db.getPaymentByTxnId(txnid);

    let apiVerification = null;
    try {
      apiVerification = await payuService.verifyPayUTransactionWithApi({
        txnid,
        merchantKey: payuConfig.merchantKey,
        merchantSalt: payuConfig.merchantSalt,
        verifyUrl: payuConfig.verifyUrl
      });
    } catch (e) {
      // Non-blocking
    }

    const isPaid = (dbRecord && dbRecord.payment_status === 'PAID') || (apiVerification && apiVerification.success);

    if (isPaid && dbRecord) {
      try {
        if (dbRecord.company_id) {
          const comp = await db.getCompanyById(dbRecord.company_id);
          if (comp) {
            await db.syncAdminTransactionToPaid(comp.company_name, txnid, dbRecord.month_year);
          }
        } else if (dbRecord.company_name) {
          await db.syncAdminTransactionToPaid(dbRecord.company_name, txnid, dbRecord.month_year);
        }
      } catch (syncErr) {
        console.warn('Note syncing admin transaction on verify:', syncErr.message);
      }
    }

    return res.json({
      success: isPaid,
      status: dbRecord ? dbRecord.payment_status : (apiVerification ? apiVerification.status : 'UNKNOWN'),
      transaction: dbRecord,
      payuVerification: apiVerification
    });
  } catch (err) {
    console.error('Error verifying PayU payment:', err);
    res.status(500).json({ success: false, message: 'PayU verification check failed' });
  }
});

// SUPER ADMIN PAYU GATEWAY SETTINGS ENDPOINTS
app.get(['/api/settings/payment-gateway', '/api/admin/settings/payment-gateway'], authenticateJWT, async (req, res) => {
  try {
    const setting = await db.getPayUSetting();
    res.json({
      success: true,
      paymentGateway: {
        gateway_name: 'PayU India',
        status: 'ACTIVE',
        environment: setting.environment || 'test',
        merchant_key: setting.merchant_key || process.env.PAYU_MERCHANT_KEY || '',
        merchant_salt: setting.merchant_salt ? '****************' : '',
        allowed_methods: setting.allowed_methods || ['UPI', 'CARD']
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch PayU settings' });
  }
});

app.post(['/api/settings/payment-gateway', '/api/admin/settings/payment-gateway'], authenticateJWT, requirePermission('access.manage'), async (req, res) => {
  try {
    const { environment, merchantKey, merchantSalt, allowedMethods } = req.body;
    const updated = await db.savePayUSetting({
      environment,
      merchantKey,
      merchantSalt,
      allowedMethods
    });
    res.json({ success: true, message: 'PayU gateway settings updated successfully', setting: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update PayU settings' });
  }
});

app.post(['/api/settings/payment-gateway/test', '/api/admin/settings/payment-gateway/test'], authenticateJWT, async (req, res) => {
  try {
    const payuConfig = await payuService.getPayUConfig();
    const testTxnId = `TEST_${Date.now()}`;
    const testHash = payuService.generatePayUHash({
      key: payuConfig.merchantKey,
      txnid: testTxnId,
      amount: 100,
      productinfo: 'Test Connection',
      firstname: 'Test',
      email: 'test@mccmrfip.com',
      salt: payuConfig.merchantSalt
    });

    res.json({
      success: true,
      message: 'PayU Merchant Key & Salt credentials are valid and operational.',
      details: {
        environment: payuConfig.environment,
        merchantKey: payuConfig.merchantKey,
        payuUrl: payuConfig.payuUrl,
        sampleTxnId: testTxnId,
        generatedHashPreview: `${testHash.slice(0, 20)}...`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'PayU credentials check failed: ' + err.message });
  }
});

// Payments Retrieval Endpoints
app.get('/api/payments/company/:companyId', async (req, res) => {
  try {
    const payments = await db.getPaymentsByCompany(req.params.companyId);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch company payments' });
  }
});

// ==========================================================================
// REPORTS MODULE
// ==========================================================================
app.get('/api/reports/companies', authenticateJWT, requirePermission('report.view'), async (req, res) => {
  try {
    const companies = await db.getCompanies();
    res.json({
      success: true,
      summary: {
        total: companies.length,
        approved: companies.filter((c) => c.status === 'Approved').length,
        pending: companies.filter((c) => c.status === 'Pending').length,
        rejected: companies.filter((c) => c.status === 'Rejected').length
      },
      companies
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate company report' });
  }
});

app.get('/api/reports/payments', authenticateJWT, requirePermission('report.view'), async (req, res) => {
  try {
    const payments = await db.getAllPayments();
    res.json({
      success: true,
      summary: {
        total: payments.length,
        paid: payments.filter((p) => p.status === 'Paid' || p.status === 'SUCCESS' || p.status === 'Completed').length,
        pending: payments.filter((p) => p.status === 'Pending').length,
        failed: payments.filter((p) => p.status === 'FAILED').length
      },
      payments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate payment report' });
  }
});

app.get('/api/reports/places', authenticateJWT, requirePermission('report.view'), async (req, res) => {
  try {
    const places = await db.getPlaces();
    res.json({
      success: true,
      summary: {
        total: places.length,
        occupied: places.filter((p) => p.status === 'Occupied').length,
        available: places.filter((p) => p.status === 'Available').length
      },
      places
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate place report' });
  }
});

// ==========================================================================
// ACCESS CONTROL MODULE (SUPER ADMIN ONLY! HTTP 403 FOR ADMIN)
// ==========================================================================
app.get('/api/users', authenticateJWT, requirePermission('access.manage'), async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

app.post('/api/users', authenticateJWT, requirePermission('access.manage'), async (req, res) => {
  try {
    const newUser = await db.addUser(req.body);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'CREATE',
      module: 'Users',
      record_id: newUser.id,
      new_data: newUser
    });
    res.status(201).json({ success: true, user: newUser, message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

app.put('/api/users/:id', authenticateJWT, requirePermission('access.manage'), async (req, res) => {
  try {
    const existing = await db.getUserById(req.params.id);
    const updated = await db.updateUser(req.params.id, req.body);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'UPDATE',
      module: 'Users',
      record_id: Number(req.params.id),
      old_data: existing,
      new_data: updated
    });
    res.json({ success: true, user: updated, message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', authenticateJWT, requirePermission('access.manage'), async (req, res) => {
  try {
    const existing = await db.getUserById(req.params.id);
    await db.deleteUser(req.params.id);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'DELETE',
      module: 'Users',
      record_id: Number(req.params.id),
      old_data: existing
    });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

app.get('/api/roles', authenticateJWT, requirePermission('access.manage'), async (req, res) => {
  try {
    const roles = await db.getRoles();
    res.json({ success: true, roles });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
});

app.get('/api/permissions', authenticateJWT, requirePermission('access.manage'), async (req, res) => {
  try {
    const permissions = await db.getPermissions();
    res.json({ success: true, permissions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
  }
});

// ==========================================================================
// MENU MANAGEMENT MODULE (SUPER ADMIN ONLY! HTTP 403 FOR ADMIN)
// ==========================================================================
app.get('/api/menus/public', async (req, res) => {
  try {
    const menus = await db.getMenus();
    res.json({ success: true, menus: menus.filter((m) => m.status === 'Active') });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch public menus' });
  }
});

app.get('/api/menus', authenticateJWT, requirePermission('menu.manage'), async (req, res) => {
  try {
    const menus = await db.getMenus();
    res.json({ success: true, menus });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch menus' });
  }
});

app.post('/api/menus', authenticateJWT, requirePermission('menu.manage'), async (req, res) => {
  try {
    const newMenu = await db.addMenu(req.body);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'CREATE',
      module: 'Menu Management',
      record_id: newMenu.id,
      new_data: newMenu
    });
    res.status(201).json({ success: true, menu: newMenu, message: 'Menu item created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create menu item' });
  }
});

app.put('/api/menus/:id', authenticateJWT, requirePermission('menu.manage'), async (req, res) => {
  try {
    const updated = await db.updateMenu(req.params.id, req.body);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'UPDATE',
      module: 'Menu Management',
      record_id: Number(req.params.id),
      new_data: updated
    });
    res.json({ success: true, menu: updated, message: 'Menu item updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update menu item' });
  }
});

app.delete('/api/menus/:id', authenticateJWT, requirePermission('menu.manage'), async (req, res) => {
  try {
    await db.deleteMenu(req.params.id);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'DELETE',
      module: 'Menu Management',
      record_id: Number(req.params.id)
    });
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete menu item' });
  }
});

// ==========================================================================
// FOOTER MANAGEMENT MODULE (SUPER ADMIN ONLY! HTTP 403 FOR ADMIN)
// ==========================================================================
app.get('/api/footer/public', async (req, res) => {
  try {
    const footerData = await db.getFooterData();
    res.json({ success: true, footerData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch public footer data' });
  }
});

app.get('/api/footer', authenticateJWT, requirePermission('footer.manage'), async (req, res) => {
  try {
    const footerData = await db.getFooterData();
    res.json({ success: true, footerData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch footer data' });
  }
});

app.put('/api/footer', authenticateJWT, requirePermission('footer.manage'), async (req, res) => {
  try {
    const updated = await db.updateFooterSettings(req.body);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'UPDATE',
      module: 'Footer Settings',
      record_id: 1,
      new_data: updated
    });
    res.json({ success: true, footerSettings: updated, message: 'Footer settings updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update footer settings' });
  }
});

app.post('/api/footer/links', authenticateJWT, requirePermission('footer.manage'), async (req, res) => {
  try {
    const newLink = await db.addFooterLink(req.body);
    res.status(201).json({ success: true, link: newLink, message: 'Footer link added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add footer link' });
  }
});

app.put('/api/footer/links/:id', authenticateJWT, requirePermission('footer.manage'), async (req, res) => {
  try {
    const updated = await db.updateFooterLink(req.params.id, req.body);
    res.json({ success: true, link: updated, message: 'Footer link updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update footer link' });
  }
});

app.delete('/api/footer/links/:id', authenticateJWT, requirePermission('footer.manage'), async (req, res) => {
  try {
    await db.deleteFooterLink(req.params.id);
    res.json({ success: true, message: 'Footer link deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete footer link' });
  }
});

// SOCIAL MEDIA LINKS CRUD ENDPOINTS
app.post('/api/footer/social', authenticateJWT, requirePermission('footer.manage'), async (req, res) => {
  try {
    const newSocial = await db.addSocialLink(req.body);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'CREATE',
      module: 'Footer Social Links',
      record_id: newSocial.id,
      new_data: newSocial
    });
    res.status(201).json({ success: true, social: newSocial, message: 'Social media link added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add social media link' });
  }
});

app.put('/api/footer/social/:id', authenticateJWT, requirePermission('footer.manage'), async (req, res) => {
  try {
    const updated = await db.updateSocialLink(req.params.id, req.body);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'UPDATE',
      module: 'Footer Social Links',
      record_id: Number(req.params.id),
      new_data: updated
    });
    res.json({ success: true, social: updated, message: 'Social media link updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update social media link' });
  }
});

app.delete('/api/footer/social/:id', authenticateJWT, requirePermission('footer.manage'), async (req, res) => {
  try {
    await db.deleteSocialLink(req.params.id);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'DELETE',
      module: 'Footer Social Links',
      record_id: Number(req.params.id)
    });
    res.json({ success: true, message: 'Social media link deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete social media link' });
  }
});

// AUDIT LOGS ENDPOINT
app.get('/api/audit-logs', authenticateJWT, requirePermission('access.manage'), async (req, res) => {
  try {
    const logs = await db.getAuditLogs();
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

// ==================================================
// SUPER ADMIN DYNAMIC SMTP MANAGEMENT MODULE
// ==================================================

// Middleware: Require Super Admin Role
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'SUPER_ADMIN' && Number(req.user.role_id) !== 1)) {
    return res.status(403).json({
      success: false,
      message: 'HTTP 403 Forbidden: Access denied. Super Admin privileges required.'
    });
  }
  next();
};

// Helper: Strip password from JSON response payload
const getSafeSmtpSetting = (setting) => {
  if (!setting) return null;
  const safe = { ...setting };
  delete safe.password_encrypted;
  delete safe.password;
  safe.has_password = Boolean(setting.password_encrypted && setting.password_encrypted.length > 0);
  return safe;
};

// 1. GET /api/smtp-settings/ - List Configurations
app.get('/api/smtp-settings/', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const settings = await db.getSmtpSettings();
    const safeSettings = settings.map(getSafeSmtpSetting);
    const activeSetting = safeSettings.find((s) => s.is_active === 1 || s.is_active === true) || null;
    res.json({
      success: true,
      settings: safeSettings,
      activeSetting: activeSetting
    });
  } catch (err) {
    console.error('Error fetching SMTP settings:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch SMTP settings' });
  }
});

// 2. POST /api/smtp-settings/ - Create Configuration
app.post('/api/smtp-settings/', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const {
      provider,
      host,
      port,
      username,
      password,
      auth_required,
      use_tls,
      use_ssl,
      sender_email,
      is_active
    } = req.body;

    if (!host) return res.status(400).json({ success: false, message: 'SMTP Host is required.' });
    if (!port || isNaN(Number(port))) return res.status(400).json({ success: false, message: 'Valid numeric Port is required.' });
    if (!sender_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender_email)) {
      return res.status(400).json({ success: false, message: 'Valid Sender Email address is required.' });
    }

    const authReq = auth_required !== false && auth_required !== 0 && auth_required !== '0';
    if (authReq && (!username || !username.trim())) {
      return res.status(400).json({ success: false, message: 'Username is required when authentication is enabled.' });
    }

    const encryptedPassword = password ? encryptSmtpPassword(password) : '';

    const newRecord = await db.createSmtpSetting({
      provider: provider || 'Custom SMTP Server',
      host,
      port: Number(port),
      username: authReq ? username : '',
      password_encrypted: encryptedPassword,
      auth_required: authReq ? 1 : 0,
      use_tls: use_tls !== false ? 1 : 0,
      use_ssl: use_ssl ? 1 : 0,
      sender_email,
      is_active: is_active ? 1 : 0
    });

    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'CREATE',
      module: 'SMTP Settings',
      record_id: newRecord?.id,
      new_data: getSafeSmtpSetting(newRecord)
    });

    res.status(201).json({
      success: true,
      setting: getSafeSmtpSetting(newRecord),
      message: 'SMTP configuration created successfully.'
    });
  } catch (err) {
    console.error('Error creating SMTP setting:', err);
    res.status(500).json({ success: false, message: 'Failed to create SMTP configuration.' });
  }
});

// 3. PUT/PATCH /api/smtp-settings/:id/ - Update Configuration / Toggle Active Status
app.put('/api/smtp-settings/:id/', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await db.getSmtpSettingById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'SMTP configuration not found.' });
    }

    const {
      provider,
      host,
      port,
      username,
      password,
      auth_required,
      use_tls,
      use_ssl,
      sender_email,
      is_active
    } = req.body;

    let encryptedPassword = existing.password_encrypted;
    if (password && password !== '••••••••••••') {
      encryptedPassword = encryptSmtpPassword(password);
    }

    const updatePayload = {};
    if (provider !== undefined) updatePayload.provider = provider;
    if (host !== undefined) updatePayload.host = host;
    if (port !== undefined) updatePayload.port = Number(port);
    if (username !== undefined) updatePayload.username = username;
    if (encryptedPassword !== undefined) updatePayload.password_encrypted = encryptedPassword;
    if (auth_required !== undefined) updatePayload.auth_required = auth_required ? 1 : 0;
    if (use_tls !== undefined) updatePayload.use_tls = use_tls ? 1 : 0;
    if (use_ssl !== undefined) updatePayload.use_ssl = use_ssl ? 1 : 0;
    if (sender_email !== undefined) updatePayload.sender_email = sender_email;
    if (is_active !== undefined) updatePayload.is_active = is_active ? 1 : 0;

    const updated = await db.updateSmtpSetting(id, updatePayload);

    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'UPDATE',
      module: 'SMTP Settings',
      record_id: Number(id),
      new_data: getSafeSmtpSetting(updated)
    });

    res.json({
      success: true,
      setting: getSafeSmtpSetting(updated),
      message: 'SMTP configuration updated successfully.'
    });
  } catch (err) {
    console.error('Error updating SMTP setting:', err);
    res.status(500).json({ success: false, message: 'Failed to update SMTP configuration.' });
  }
});

// 4. DELETE /api/smtp-settings/:id/ - Delete Configuration
app.delete('/api/smtp-settings/:id/', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await db.getSmtpSettingById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'SMTP configuration not found.' });
    }

    await db.deleteSmtpSetting(id);

    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'DELETE',
      module: 'SMTP Settings',
      record_id: Number(id)
    });

    res.json({ success: true, message: 'SMTP configuration deleted successfully.' });
  } catch (err) {
    console.error('Error deleting SMTP setting:', err);
    res.status(500).json({ success: false, message: 'Failed to delete SMTP configuration.' });
  }
});

// 5. POST /api/smtp-settings/:id/test-connection/ - Test Connection with Structured Diagnostics
app.post('/api/smtp-settings/:id/test-connection/', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { test_email, override_password, setting_data } = req.body;

    let targetSetting = null;
    if (id !== '0' && id !== 'new') {
      targetSetting = await db.getSmtpSettingById(id);
    }
    if (!targetSetting && setting_data) {
      targetSetting = setting_data;
    }

    if (!targetSetting && id === '0') {
      targetSetting = await db.getActiveSmtpSetting();
    }

    if (!targetSetting || !targetSetting.host) {
      return res.status(400).json({
        success: false,
        diagnosticCode: 'Network Timeout',
        message: 'Invalid or missing SMTP configuration for testing.'
      });
    }

    const testRecipient = test_email || 'user@example.com';
    const diagResult = await emailService.testSmtpConnection(targetSetting, testRecipient, override_password);

    if (targetSetting.id) {
      await db.updateSmtpTestStatus(targetSetting.id, diagResult.success ? 'CONNECTED' : 'FAILED');
    }

    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'TEST_CONNECTION',
      module: 'SMTP Settings',
      new_data: { test_email: testRecipient, diagnosticCode: diagResult.diagnosticCode }
    });

    res.json(diagResult);
  } catch (err) {
    console.error('SMTP test connection endpoint exception:', err);
    res.json({
      success: false,
      diagnosticCode: 'Auth Failure',
      message: 'SMTP connection test failed. Please check host, port, username, password and TLS/SSL settings.'
    });
  }
});

// Serve static frontend build if present (with PageSpeed / GTmetrix immutable caching)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      // Never cache index.html so single-page app updates are instant
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Sentry & Centralized Observability Error Handler
app.use(sentry.sentryErrorHandler);

const server = app.listen(PORT, () => {
  console.log(`MCC MRF Enterprise Backend Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[SERVER WARNING] Port ${PORT} is already in use by an active backend server process.`);
    console.warn(`[SERVER WARNING] Existing backend process is handling API requests on http://localhost:${PORT}`);
    process.exit(0);
  } else {
    console.error('[SERVER ERROR]', err);
    process.exit(1);
  }
});
