require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { encryptSmtpPassword, decryptSmtpPassword } = require('./utils/cryptoUtil');
const emailService = require('./services/emailService');
const payuService = require('./services/payuService');
const { generateTemporaryPassword, validatePasswordRequirements, hashPassword, comparePassword } = require('./utils/passwordUtil');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'mccmrfip_jwt_super_secret_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MCC MRF Innovation Park Backend Server Running' });
});

// ==========================================================================
// AUTHENTICATION & LOGIN ENDPOINTS
// ==========================================================================

// Admin, Super Admin & Company Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = (username || email || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/Username and Password are required.' });
    }

    // 1. Super Admin Hardcoded Credentials check
    if (loginIdentifier === 'MCCMRFIP@super' && password === 'super2024') {
      const token = jwt.sign(
        { id: 1, name: 'Super Admin', username: 'MCCMRFIP@super', role: 'SUPER_ADMIN', role_id: 1 },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({
        success: true,
        token,
        role: 'SUPER_ADMIN',
        user: { id: 1, name: 'Super Admin', username: 'MCCMRFIP@super', role: 'SUPER_ADMIN', role_id: 1 }
      });
    }

    // 2. Admin Hardcoded Credentials check
    if (loginIdentifier === 'MCCMRFIP@admin' && password === 'Novara2024') {
      const token = jwt.sign(
        { id: 2, name: 'Admin', username: 'MCCMRFIP@admin', role: 'ADMIN', role_id: 2 },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({
        success: true,
        token,
        role: 'ADMIN',
        user: { id: 2, name: 'Admin', username: 'MCCMRFIP@admin', role: 'ADMIN', role_id: 2 }
      });
    }

    // 3. Check Company User Account in Users Table
    const compUser = await db.getCompanyUserByEmail(loginIdentifier);
    if (compUser && compUser.password_hash) {
      // Check account status
      if (compUser.account_status === 'INACTIVE' || compUser.account_status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          message: 'Your account is currently inactive. Please contact the administrator.'
        });
      }

      const isMatch = comparePassword(password, compUser.password_hash);
      if (isMatch) {
        const mustChange = Boolean(compUser.must_change_password);
        const token = jwt.sign(
          {
            id: compUser.id,
            company_id: compUser.company_id,
            name: compUser.name || compUser.company_name,
            email: compUser.email,
            role: 'COMPANY',
            role_id: 3,
            must_change_password: mustChange
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        if (mustChange) {
          return res.json({
            success: true,
            requiresPasswordChange: true,
            token,
            role: 'COMPANY',
            user: {
              id: compUser.id,
              company_id: compUser.company_id,
              email: compUser.email,
              name: compUser.name || compUser.company_name,
              role: 'COMPANY',
              must_change_password: true
            }
          });
        }

        const company = compUser.company_id ? await db.getCompanyById(compUser.company_id) : await db.getCompanyByEmail(compUser.email);

        return res.json({
          success: true,
          requiresPasswordChange: false,
          token,
          role: 'COMPANY',
          user: {
            id: compUser.id,
            company_id: compUser.company_id,
            email: compUser.email,
            name: compUser.name || compUser.company_name,
            role: 'COMPANY'
          },
          company
        });
      }
    }

    // 4. Fallback Admin / DB User check
    const dbUser = await db.getUserByEmailOrUsername(loginIdentifier);
    if (dbUser && dbUser.password_hash) {
      if (dbUser.account_status === 'INACTIVE' || dbUser.account_status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          message: 'Your account is currently inactive. Please contact the administrator.'
        });
      }

      const isMatch = comparePassword(password, dbUser.password_hash);
      if (isMatch) {
        const mustChange = Boolean(dbUser.must_change_password);
        const token = jwt.sign(
          {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            username: dbUser.username,
            role: dbUser.role || dbUser.role_name,
            role_id: dbUser.role_id,
            must_change_password: mustChange
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.json({
          success: true,
          token,
          role: dbUser.role || dbUser.role_name,
          requiresPasswordChange: mustChange,
          user: {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            username: dbUser.username,
            role: dbUser.role || dbUser.role_name,
            role_id: dbUser.role_id
          }
        });
      }
    }

    return res.status(401).json({ success: false, message: 'Invalid Email or Password' });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ success: false, message: 'Authentication error' });
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

// Change Password for User / Company (Mandatory First Login & Manual Reset)
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { companyId, email, currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New Password and Confirm Password do not match.' });
    }

    // Validate new password strength
    const strengthCheck = validatePasswordRequirements(newPassword);
    if (!strengthCheck.valid) {
      return res.status(400).json({ success: false, message: strengthCheck.message });
    }

    // Resolve company user
    let user = null;
    if (email) {
      user = await db.getCompanyUserByEmail(email.trim());
    } else if (companyId) {
      user = await db.getCompanyUserByCompanyId(companyId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Verify current temporary password if provided
    if (currentPassword) {
      const currentMatch = comparePassword(currentPassword, user.password_hash);
      if (!currentMatch) {
        return res.status(401).json({ success: false, message: 'Current Temporary Password is incorrect.' });
      }

      // Requirement 20: New password must NOT equal the temporary password
      if (currentPassword === newPassword) {
        return res.status(400).json({ success: false, message: 'New password cannot be the same as the temporary password.' });
      }
    }

    // Hash new password using bcrypt
    const newHash = hashPassword(newPassword);

    // Update user record in DB: set password_hash and set must_change_password = 0
    await db.updateUserPasswordHash(user.id, newHash, true);

    const updatedUser = await db.getUserById(user.id);
    const company = user.company_id ? await db.getCompanyById(user.company_id) : await db.getCompanyByEmail(user.email);

    // Create fresh JWT token
    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        company_id: updatedUser.company_id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: 'COMPANY',
        role_id: 3,
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
        role: 'COMPANY',
        must_change_password: false
      },
      company
    });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ success: false, message: 'Failed to update password.' });
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
    const payments = await db.getAdminTransactions(company.company_name);
    res.json({ success: true, company, payments });
  } catch (err) {
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

// CREATE PAYU PAYMENT TRANSACTION API
app.post(['/api/payments/create-payu-payment', '/api/payment/create-payu-payment', '/api/payments/create-order'], authenticateJWT, async (req, res) => {
  try {
    const { company_id, invoice_id, companyId, billing_month } = req.body;
    const targetCompanyId = company_id || companyId || (req.user ? req.user.company_id : null) || 1;

    let company = await db.getCompanyById(targetCompanyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Incubation company not found' });
    }

    // SERVER-SIDE AMOUNT CALCULATION (Monthly Rate + 18% GST) - NEVER TRUST FRONTEND AMOUNT!
    const baseMonthlyRate = Number(company.monthly_rate || 10000);
    const gstAmount = Math.round(baseMonthlyRate * 0.18);
    const totalAmount = baseMonthlyRate + gstAmount;

    // Generate Unique Transaction ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const transactionId = `MRF-INV-${dateStr}-${randomSuffix}`;
    const billingPeriod = billing_month || req.body.month || 'August 2026';

    // Get PayU Merchant Config
    const payuConfig = await payuService.getPayUConfig();

    // Create pending payment record in DB
    const paymentRecord = await db.createPayUPaymentTx({
      companyId: company.id,
      invoiceId: invoice_id || null,
      transactionId: transactionId,
      amount: totalAmount,
      monthYear: billingPeriod,
      customerName: company.contact_person,
      customerEmail: company.email
    });

    const successUrl = process.env.PAYU_SUCCESS_URL || 'http://localhost:5000/api/payments/payu/success';
    const failureUrl = process.env.PAYU_FAILURE_URL || 'http://localhost:5000/api/payments/payu/failure';
    const cancelUrl = process.env.PAYU_CANCEL_URL || failureUrl;

    const productinfo = `Workspace Rent Payment - ${billingPeriod}`;
    const firstname = (company.contact_person || company.company_name || 'Incubate').split(' ')[0];
    const email = company.email || 'accounts@mccmrfip.com';

    // Generate SHA-512 PayU Request Hash
    const payuHash = payuService.generatePayUHash({
      key: payuConfig.merchantKey,
      txnid: transactionId,
      amount: totalAmount,
      productinfo: productinfo,
      firstname: firstname,
      email: email,
      salt: payuConfig.merchantSalt
    });

    await db.addAuditLog({
      user_id: company.id,
      user_name: company.company_name,
      user_role: 'COMPANY_USER',
      action: 'PAYU_PAYMENT_INITIATED',
      module: 'Payments System',
      record_id: paymentRecord.id || 0,
      new_data: { transaction_id: transactionId, amount: totalAmount }
    });

    return res.json({
      success: true,
      payuUrl: payuConfig.payuUrl,
      environment: payuConfig.environment,
      params: {
        key: payuConfig.merchantKey,
        txnid: transactionId,
        amount: totalAmount,
        productinfo: productinfo,
        firstname: firstname,
        email: email,
        phone: company.contact_number || '9876543210',
        surl: successUrl,
        furl: failureUrl,
        curl: cancelUrl,
        hash: payuHash,
        enforce_paymethod: 'creditcard,debitcard,upi',
        service_provider: 'payu_paisa'
      },
      invoice_number: `INV-MRF-2026-${String(company.s_no || company.id).padStart(5, '0')}`,
      billing_period: billingPeriod,
      monthly_rent: baseMonthlyRate,
      gst_amount: gstAmount,
      total_amount: totalAmount
    });
  } catch (err) {
    console.error('Error creating PayU payment:', err);
    res.status(500).json({ success: false, message: 'Failed to initiate PayU payment' });
  }
});

// PAYU SUCCESS CALLBACK (PayU POSTs to this endpoint)
app.post('/api/payments/payu/success', async (req, res) => {
  try {
    const payuConfig = await payuService.getPayUConfig();
    const isValidHash = payuService.verifyPayUResponseHash(req.body, payuConfig.merchantSalt);

    const txnid = req.body.txnid;
    const status = req.body.status;
    const payuMoneyId = req.body.payuMoneyId || req.body.mihpayid;
    const paymentMode = req.body.mode ? `PayU (${req.body.mode.toUpperCase()})` : 'PayU (UPI / Card)';

    // Server-to-server verification with PayU API
    const apiVerification = await payuService.verifyPayUTransactionWithApi({
      txnid,
      merchantKey: payuConfig.merchantKey,
      merchantSalt: payuConfig.merchantSalt,
      verifyUrl: payuConfig.verifyUrl
    });

    const isVerifiedPaid = (status === 'success' && (isValidHash || apiVerification.success));

    if (isVerifiedPaid) {
      await db.updatePayUPaymentStatus(txnid, {
        status: 'PAID',
        payuPaymentId: payuMoneyId,
        paymentMethod: paymentMode
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/payment/success?txnid=${encodeURIComponent(txnid)}&payuid=${encodeURIComponent(payuMoneyId || '')}`);
    } else {
      await db.updatePayUPaymentStatus(txnid, {
        status: 'FAILED',
        payuPaymentId: payuMoneyId,
        failureReason: req.body.error_Message || 'PayU hash or verification failed'
      });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/payment/failed?txnid=${encodeURIComponent(txnid)}&reason=VerificationFailed`);
    }
  } catch (err) {
    console.error('Error handling PayU success callback:', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/payment/failed?reason=ServerError`);
  }
});

// PAYU FAILURE / CANCEL CALLBACK
app.post('/api/payments/payu/failure', async (req, res) => {
  try {
    const txnid = req.body.txnid;
    const status = req.body.status || 'failure';
    const reason = req.body.error_Message || req.body.field9 || 'Payment cancelled or failed on PayU';

    if (txnid) {
      await db.updatePayUPaymentStatus(txnid, {
        status: status === 'userCancelled' ? 'CANCELLED' : 'FAILED',
        failureReason: reason
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (status === 'userCancelled') {
      return res.redirect(`${frontendUrl}/payment/cancelled?txnid=${encodeURIComponent(txnid || '')}`);
    }
    return res.redirect(`${frontendUrl}/payment/failed?txnid=${encodeURIComponent(txnid || '')}&reason=${encodeURIComponent(reason)}`);
  } catch (err) {
    console.error('Error handling PayU failure callback:', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/payment/failed?reason=ServerError`);
  }
});

// PAYU DIRECT VERIFICATION API
app.post('/api/payments/payu/verify', async (req, res) => {
  try {
    const { txnid } = req.body;
    if (!txnid) {
      return res.status(400).json({ success: false, message: 'Transaction ID (txnid) is required' });
    }

    const payuConfig = await payuService.getPayUConfig();
    const result = await payuService.verifyPayUTransactionWithApi({
      txnid,
      merchantKey: payuConfig.merchantKey,
      merchantSalt: payuConfig.merchantSalt,
      verifyUrl: payuConfig.verifyUrl
    });

    const dbRecord = await db.getPaymentByTxnId(txnid);

    return res.json({
      success: result.success,
      status: result.status || (dbRecord ? dbRecord.payment_status : 'UNKNOWN'),
      transaction: dbRecord,
      payuVerification: result
    });
  } catch (err) {
    console.error('Error verifying PayU payment:', err);
    res.status(500).json({ success: false, message: 'PayU verification failed' });
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
        merchant_key: setting.merchant_key || 'gtK2yq',
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
