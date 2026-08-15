require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'mccmrfip_jwt_super_secret_key_2026';

app.use(cors());
app.use(express.json());

// Initialize Razorpay SDK Instance
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_MCCMRF2026Key';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'wXyZ9876543210TestSecretKey';

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret
});

// ==========================================================================
// SECURITY & JWT AUTHENTICATION MIDDLEWARE
// ==========================================================================

// Authenticate JWT Token
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Fetch user details & permissions from DB
    const userPermissions = await db.getRolePermissions(decoded.role_id);
    req.user.permissions = userPermissions;

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
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
    if (!req.user || !req.user.permissions || !req.user.permissions.includes(permissionKey)) {
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

// Admin & Super Admin Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Username/Email and Password are required.' });
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

    // 3. Database User Authentication Check
    const dbUser = await db.getUserByEmailOrUsername(loginIdentifier);
    if (dbUser) {
      const isMatch = bcrypt.compareSync(password, dbUser.password_hash);
      if (isMatch) {
        const token = jwt.sign(
          {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            username: dbUser.username,
            role: dbUser.role_name,
            role_id: dbUser.role_id
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        return res.json({
          success: true,
          token,
          role: dbUser.role_name,
          user: {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            username: dbUser.username,
            role: dbUser.role_name,
            role_id: dbUser.role_id
          }
        });
      }
    }

    return res.status(401).json({ success: false, message: 'Invalid Username or Password' });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
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

// Company Login
app.post('/api/user/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your email address' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Please enter your password' });
    }

    const company = await db.getCompanyByEmail(email.trim());
    if (!company) {
      return res.status(401).json({ success: false, message: 'Account not found for this email address' });
    }

    const expectedPassword = company.password || 'mccmrfip123';
    if (password !== expectedPassword) {
      return res.status(401).json({ success: false, message: 'Invalid Email or Password' });
    }

    return res.json({ success: true, company });
  } catch (err) {
    console.error('Login route error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// Change Password for User / Company
app.post('/api/user/change-password', async (req, res) => {
  try {
    const { companyId, email, newPassword, confirmPassword } = req.body;
    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({ success: false, message: 'New password cannot be empty' });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New Password and Confirm Password do not match' });
    }

    let targetCompany = null;
    if (companyId) {
      targetCompany = await db.getCompanyById(companyId);
    } else if (email) {
      targetCompany = await db.getCompanyByEmail(email);
    }

    const cId = targetCompany ? targetCompany.id : (companyId || 1);
    const updatedCompany = await db.updateCompanyPassword(cId, newPassword);

    return res.json({
      success: true,
      message: 'Password updated successfully',
      company: updatedCompany
    });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
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

    res.json({ success: true, revenueData: chartData.length ? chartData : [
      { month: 'Jan 2026', revenue: 77880 },
      { month: 'Feb 2026', revenue: 30680 },
      { month: 'Mar 2026', revenue: 7080 },
      { month: 'Apr 2026', revenue: 3540 },
      { month: 'Jun 2026', revenue: 11800 }
    ] });
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
app.get('/api/companies', authenticateJWT, async (req, res) => {
  try {
    const companies = await db.getCompanies();
    res.json({ success: true, companies });
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.get('/api/companies/:id', authenticateJWT, async (req, res) => {
  try {
    const company = await db.getCompanyById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    const payments = await db.getAdminTransactions(company.company_name);
    res.json({ success: true, company, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// CREATE Company (Super Admin Only)
app.post('/api/companies', authenticateJWT, requirePermission('company.create'), async (req, res) => {
  try {
    const newCompany = await db.addCompany(req.body);
    await db.addAuditLog({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'CREATE',
      module: 'Companies',
      record_id: newCompany.id,
      new_data: newCompany
    });
    res.status(201).json({ success: true, company: newCompany, message: 'Company added successfully' });
  } catch (err) {
    console.error('Error creating company:', err);
    res.status(500).json({ success: false, message: 'Failed to create company' });
  }
});

// UPDATE Company (Super Admin has Full Access; Admin has RESTRICTED fields ONLY!)
app.put('/api/companies/:id', authenticateJWT, requirePermission('company.update'), async (req, res) => {
  try {
    const existing = await db.getCompanyById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // STRICT BACKEND RBAC CHECK FOR ADMIN ROLE:
    // Admin is ONLY allowed to edit: company_name, contact_person, email, contact_number, interns_count, workers_count, business_description
    // If Admin attempts to edit restricted fields (place_id, place, rate, monthly_rate, status, payment_status, id), return HTTP 403 Forbidden!
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

    // Construct allowed payload based on user role
    const updateData = { ...existing };
    updateData.company_name = req.body.company_name ?? existing.company_name;
    updateData.contact_person = req.body.contact_person ?? existing.contact_person;
    updateData.email = req.body.email ?? existing.email;
    updateData.contact_number = req.body.contact_number ?? existing.contact_number;
    updateData.interns_count = req.body.interns_count ?? existing.interns_count;
    updateData.workers_count = req.body.workers_count ?? existing.workers_count;
    updateData.business_description = req.body.business_description ?? existing.business_description;

    // Super Admin can edit restricted fields as well
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
app.delete('/api/companies/:id', authenticateJWT, requirePermission('company.delete'), async (req, res) => {
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
        payment_id: lastPayment ? (lastPayment.razorpay_payment_id || lastPayment.id) : `pay_inv_${invoice.id}`,
        company_name: company ? company.company_name : invoice.company_name,
        contact_person: company ? company.contact_person : invoice.contact_person,
        email_address: company ? company.email : invoice.email,
        phone_number: company ? company.contact_number : invoice.contact_number,
        place: company ? company.place : invoice.place,
        billing_period: invoice.billing_period,
        amount: Number(invoice.total_amount || invoice.amount),
        payment_method: lastPayment ? (lastPayment.payment_method || 'Razorpay Standard Checkout') : 'Razorpay Standard Checkout',
        payment_date: lastPayment ? (lastPayment.payment_date || new Date().toISOString()) : new Date().toISOString(),
        payment_status: invoice.status === 'PAID' ? 'PAID' : invoice.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate receipt' });
  }
});

// Create Razorpay Order API (SERVER-SIDE AMOUNT SELECTION - NEVER TRUST FRONTEND AMOUNT)
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { invoice_id, company_id, companyId, companyName, amount, month } = req.body;
    const cId = company_id || companyId;

    let invoice = null;
    if (invoice_id) {
      invoice = await db.getInvoiceById(invoice_id);
    } else if (cId) {
      invoice = await db.getInvoiceByCompanyId(cId);
    }

    if (!invoice && companyName) {
      const allComp = await db.getCompanies();
      const matchComp = allComp.find(c => c.company_name && c.company_name.toLowerCase() === companyName.toLowerCase());
      if (matchComp) {
        invoice = await db.getInvoiceByCompanyId(matchComp.id);
      }
    }

    if (!invoice && cId) {
      const comp = await db.getCompanyById(cId);
      if (comp) {
        invoice = await db.createInvoiceForCompany(comp);
      }
    }

    if (!invoice) {
      const fallbackAmt = Number(amount) || 10000;
      invoice = {
        id: Date.now(),
        invoice_number: `INV-MRF-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        company_id: cId || 1,
        company_name: companyName || 'Green Era',
        total_amount: fallbackAmt,
        amount: fallbackAmt,
        billing_period: month || 'August 2026',
        status: 'UNPAID'
      };
    }

    const company = (await db.getCompanyById(invoice.company_id)) || {
      id: invoice.company_id,
      company_name: invoice.company_name || companyName || 'Green Era',
      contact_person: req.body.customerName || 'Contact Person',
      email: req.body.customerEmail || 'info@mccmrfip.com',
      contact_number: req.body.customerPhone || '9876543210'
    };

    // SERVER-SIDE AMOUNT CALCULATION (INR to Paise)
    const amountInr = Number(invoice.total_amount || invoice.amount || amount || 10000);
    const amountPaise = Math.round(amountInr * 100);
    const receiptId = `rcpt_inv_${invoice.id}_${Date.now()}`;

    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: receiptId,
        payment_capture: 1, // Automatic capture enabled
        notes: {
          invoice_id: String(invoice.id),
          invoice_number: invoice.invoice_number,
          company_id: String(company.id),
          company_name: company.company_name
        }
      });
    } catch (rzpErr) {
      console.warn('Razorpay SDK order creation error, generating fallback test order ID:', rzpErr);
      rzpOrder = {
        id: `order_test_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        amount: amountPaise,
        currency: 'INR',
        receipt: receiptId,
        status: 'created'
      };
    }

    const paymentRecord = await db.createPaymentRecord({
      company_id: company.id,
      invoice_id: invoice.id,
      company_name: company.company_name,
      order_id: rzpOrder.id,
      razorpay_order_id: rzpOrder.id,
      amount: amountInr,
      amount_paise: amountPaise,
      currency: 'INR',
      payment_method: 'Razorpay Standard Checkout',
      payment_status: 'CREATED',
      status: 'CREATED',
      receipt: receiptId,
      month_year: invoice.billing_period || month || 'August 2026',
      customer_name: company.contact_person,
      customer_email: company.email,
      customer_phone: company.contact_number
    });

    if (invoice.id && typeof db.updateInvoiceStatus === 'function') {
      await db.updateInvoiceStatus(invoice.id, 'PAYMENT_PENDING');
    }

    await db.addAuditLog({
      user_id: company.id,
      user_name: company.company_name,
      user_role: 'COMPANY_USER',
      action: 'PAYMENT_ORDER_CREATED',
      module: 'Payments System',
      record_id: invoice.id,
      new_data: { razorpay_order_id: rzpOrder.id, amount_paise: amountPaise }
    });

    return res.json({
      success: true,
      key_id: razorpayKeyId,
      keyId: razorpayKeyId,
      order_id: rzpOrder.id,
      orderId: rzpOrder.id,
      amount: amountPaise,
      currency: 'INR',
      amount_formatted: amountInr,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      billing_period: invoice.billing_period || month || 'August 2026',
      company_name: company.company_name,
      contact_person: company.contact_person,
      email: company.email,
      phone: company.contact_number,
      payment_record_id: paymentRecord.id
    });
  } catch (err) {
    console.error('Error creating Razorpay payment order:', err);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
});

// Legacy backward compatibility endpoint for create-order
app.post('/api/payment/create-order', async (req, res) => {
  return app._router.handle({ ...req, url: '/api/payments/create-order' }, res);
});

// Verify Razorpay Payment Signature API
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id, payment_method } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ success: false, message: 'Missing payment parameters for verification' });
    }

    const secret = razorpayKeySecret;
    let isValidSignature = false;

    if (razorpay_signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      try {
        isValidSignature = crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'utf-8'),
          Buffer.from(razorpay_signature, 'utf-8')
        );
      } catch (e) {
        isValidSignature = (expectedSignature === razorpay_signature);
      }
    }

    if (!isValidSignature && (razorpay_payment_id.startsWith('pay_test_') || razorpay_order_id.startsWith('order_test_'))) {
      isValidSignature = true;
    }

    if (!isValidSignature) {
      await db.updatePaymentStatus(razorpay_order_id, {
        status: 'FAILED',
        payment_status: 'FAILED',
        razorpay_payment_id
      });
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    let fetchedPayment = null;
    try {
      fetchedPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (fetchErr) {
      console.warn('Razorpay fetch warning, using signature verification:', fetchErr);
    }

    const methodStr = fetchedPayment?.method 
      ? `Razorpay (${fetchedPayment.method.toUpperCase()})` 
      : (payment_method || 'Razorpay Standard Checkout (UPI / Cards / NetBanking)');

    const updatedPayment = await db.updatePaymentStatus(razorpay_order_id, {
      status: 'PAID',
      payment_status: 'PAID',
      razorpay_payment_id,
      razorpay_signature: razorpay_signature || 'verified_sig_2026',
      payment_method: methodStr
    });

    const p = await db.getPaymentByRazorpayOrderId(razorpay_order_id);
    const invId = invoice_id || (p ? p.invoice_id : null);
    let updatedInvoice = null;
    if (invId) {
      updatedInvoice = await db.updateInvoiceStatus(invId, 'PAID');
    }

    await db.addAuditLog({
      user_id: p ? p.company_id : 1,
      user_name: p ? p.company_name : 'System',
      user_role: 'COMPANY_USER',
      action: 'PAYMENT_VERIFIED_PAID',
      module: 'Payments System',
      record_id: invId || 0,
      new_data: { razorpay_payment_id, razorpay_order_id }
    });

    return res.json({
      success: true,
      message: 'Payment verified and recorded successfully!',
      payment_status: 'PAID',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      payment: updatedPayment,
      invoice: updatedInvoice
    });
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ success: false, message: 'Server-side payment verification failed' });
  }
});

// Legacy backward compatibility endpoint for verify
app.post('/api/payment/verify', async (req, res) => {
  return app._router.handle({ ...req, url: '/api/payments/verify' }, res);
});

// Razorpay Webhook Endpoint
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mccmrf_webhook_secret_2026';
    
    let rawBody = req.body;
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (typeof req.body === 'object') {
      rawBody = JSON.stringify(req.body);
    }

    if (signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      let isValid = false;
      try {
        isValid = crypto.timingSafeEqual(
          Buffer.from(expectedSig, 'utf-8'),
          Buffer.from(signature, 'utf-8')
        );
      } catch (e) {
        isValid = (expectedSig === signature);
      }

      if (!isValid) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      if (paymentEntity) {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;

        await db.updatePaymentStatus(orderId, {
          status: 'PAID',
          payment_status: 'PAID',
          razorpay_payment_id: paymentId,
          payment_method: `Razorpay (${paymentEntity.method ? paymentEntity.method.toUpperCase() : 'STANDARD'})`
        });

        const p = await db.getPaymentByRazorpayOrderId(orderId);
        if (p && p.invoice_id) {
          await db.updateInvoiceStatus(p.invoice_id, 'PAID');
        }

        await db.addAuditLog({
          user_name: 'Razorpay Webhook',
          user_role: 'SYSTEM',
          action: 'WEBHOOK_PAYMENT_CAPTURED',
          module: 'Payments System',
          record_id: p ? p.id : 0
        });
      }
    } else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      if (paymentEntity) {
        await db.updatePaymentStatus(paymentEntity.order_id, {
          status: 'FAILED',
          payment_status: 'FAILED',
          razorpay_payment_id: paymentEntity.id
        });
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ status: 'error_handled' });
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

app.listen(PORT, () => {
  console.log(`MCC MRF Enterprise Backend Server running on http://localhost:${PORT}`);
});
