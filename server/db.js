require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Pre-seeded initial company data starting s_no at 1
const INITIAL_COMPANIES = [
  {
    id: 1,
    s_no: 1,
    contact_person: 'test',
    company_name: 'test new',
    contact_number: '9876543210',
    email: 'franklin@mcc.edu.in',
    password: 'Mccmrfip@2025',
    interns_count: 1,
    workers_count: 2,
    monthly_rate: 1,
    incubation_date: '2024-10-15',
    gst_number: '101',
    place: 'CABIN 1',
    business_description: 'Testing startup cabin workspace.',
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
    incubation_date: '2024-09-10',
    gst_number: '102',
    place: 'Mine Lab 4',
    business_description: 'Talent management services.',
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
    incubation_date: '2024-08-01',
    gst_number: '103',
    place: 'Mine Lab 3',
    business_description: 'Legal compliance and POSH services.',
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
    incubation_date: '2024-07-20',
    gst_number: '104',
    place: 'Single Seat',
    business_description: 'AI vision analytics solutions.',
    status: 'Approved'
  },
  {
    id: 5,
    s_no: 5,
    contact_person: 'vivek',
    company_name: 'CLOUDELU LABS (OPC) PRIVATE LIMITED',
    contact_number: '9876543214',
    email: 'vivek@cloudelu.com',
    password: 'Mccmrfip@2025',
    interns_count: 2,
    workers_count: 2,
    monthly_rate: 12000,
    incubation_date: '2024-06-15',
    gst_number: '105',
    place: 'Mine Lab 2',
    business_description: 'Cloud infrastructure and devops solutions.',
    status: 'Approved'
  },
  {
    id: 6,
    s_no: 6,
    contact_person: 'Prasath',
    company_name: 'Green Era',
    contact_number: '9361328432',
    email: 'accounts@thegreenera.in',
    password: 'Mccmrfip@2025',
    interns_count: 0,
    workers_count: 1,
    monthly_rate: 10000,
    incubation_date: '2024-11-22',
    gst_number: '123',
    place: 'MCafe Pod',
    business_description: 'Sustainable green tech and rental incubation startup.',
    status: 'Approved'
  },
  {
    id: 7,
    s_no: 7,
    contact_person: 'Lee',
    company_name: 'Cafe',
    contact_number: '9876543215',
    email: 'Lee@gmail.com',
    password: 'Mccmrfip@2025',
    interns_count: 0,
    workers_count: 4,
    monthly_rate: 20000,
    incubation_date: '2024-05-10',
    gst_number: '106',
    place: 'Cafe',
    business_description: 'Campus cafeteria incubation unit.',
    status: 'Approved'
  },
  {
    id: 8,
    s_no: 8,
    contact_person: 'Abraham',
    company_name: 'Five Amstrong',
    contact_number: '9876543216',
    email: 'abrahamrebairoj@fiveangstrom.in',
    password: 'Mccmrfip@2025',
    interns_count: 1,
    workers_count: 2,
    monthly_rate: 10000,
    incubation_date: '2024-04-12',
    gst_number: '107',
    place: 'POD hexagon',
    business_description: 'Nanotech and materials research.',
    status: 'Approved'
  },
  {
    id: 9,
    s_no: 9,
    contact_person: 'Vinod',
    company_name: 'Reef',
    contact_number: '9876543217',
    email: 'vinod@gmail.com',
    password: 'Mccmrfip@2025',
    interns_count: 0,
    workers_count: 5,
    monthly_rate: 40000,
    incubation_date: '2024-03-01',
    gst_number: '108',
    place: 'Psychomatric lab Half Day',
    business_description: 'Psychometric testing laboratory.',
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
    incubation_date: '2024-02-14',
    gst_number: '109',
    place: 'Mine Lab 4',
    business_description: 'Demo incubator testing unit.',
    status: 'Approved'
  }
];

const INITIAL_TRANSACTIONS = [
  {
    id: 1,
    date: '10/6/2026',
    txnid: 'TXN17810691397782',
    company_name: 'Green Era',
    month: 'June 2026',
    amount: 10000,
    gst: 1800,
    total: 11800,
    method: 'PayU',
    status: 'Pending'
  },
  {
    id: 2,
    date: '2/4/2026',
    txnid: 'TXN17751487178598',
    company_name: 'Five Amstrong',
    month: 'January to February 2026',
    amount: 10000,
    gst: 3600,
    total: 23600,
    method: 'PayU',
    status: 'Pending'
  },
  {
    id: 3,
    date: '2/4/2026',
    txnid: 'TXN17751199115278',
    company_name: 'I View Sence',
    month: 'April 2026',
    amount: 3000,
    gst: 540,
    total: 3540,
    method: 'PayU',
    status: 'Pending'
  },
  {
    id: 4,
    date: '18/3/2026',
    txnid: 'TXN17736544606896',
    company_name: 'I View Sence',
    month: 'February to March 2026',
    amount: 3000,
    gst: 1080,
    total: 7080,
    method: 'UPI',
    status: 'Completed'
  }
];

const INITIAL_PLACES = [
  { id: 1, name: 'MCafe Pod', description: 'Dedicated incubation pod workspace near MCafe', capacity: 6, monthly_rate: 10000, status: 'Occupied' },
  { id: 2, name: 'CABIN 1', description: 'Private startup cabin with AC and high-speed fiber internet', capacity: 4, monthly_rate: 15000, status: 'Occupied' },
  { id: 3, name: 'Mine Lab 4', description: 'Advanced AI and Deep Tech laboratory workstation', capacity: 12, monthly_rate: 15000, status: 'Occupied' },
  { id: 4, name: 'Mine Lab 3', description: 'Legal Tech and Analytics lab space', capacity: 10, monthly_rate: 12000, status: 'Occupied' },
  { id: 5, name: 'Single Seat', description: 'Single flexi-desk hot desking seat', capacity: 1, monthly_rate: 3000, status: 'Occupied' },
  { id: 6, name: 'Mine Lab 2', description: 'Cloud Infrastructure and DevOps testing facility', capacity: 10, monthly_rate: 12000, status: 'Occupied' },
  { id: 7, name: 'Cafe', description: 'Incubation unit in cafeteria annex', capacity: 15, monthly_rate: 20000, status: 'Occupied' },
  { id: 8, name: 'POD Hexagon', description: 'Hexagonal collaborative team pod', capacity: 6, monthly_rate: 10000, status: 'Occupied' },
  { id: 9, name: 'Psychometric Lab Half Day', description: 'Psychometric and behavioural research lab space', capacity: 20, monthly_rate: 40000, status: 'Available' },
  { id: 10, name: 'Mine Lab 1', description: 'Hardware & IoT prototyping bench space', capacity: 8, monthly_rate: 15000, status: 'Available' }
];

const INITIAL_MENUS = [
  { id: 1, title: 'Home', url: '/', parent_id: null, display_order: 1, status: 'Active' },
  { id: 2, title: 'About Us', url: '/#about', parent_id: null, display_order: 2, status: 'Active' },
  { id: 3, title: 'Services', url: '/#services', parent_id: null, display_order: 3, status: 'Active' },
  { id: 4, title: 'Contact', url: '/#contact', parent_id: null, display_order: 4, status: 'Active' }
];

const INITIAL_FOOTER_SETTINGS = {
  id: 1,
  organization_name: 'MCC MRF Innovation Park',
  description: 'Nurturing innovation and entrepreneurship at Madras Christian College Campus.',
  email: 'Info@mccmrfip.com',
  phone: '+91 72000 99955',
  address: 'East Tambaram, Chennai, 600059, Tamil Nadu',
  logo_url: '/mcc-crest-maroon.png',
  copyright_text: '© 2025 MCC MRF Innovation Park. All rights reserved.'
};

const INITIAL_FOOTER_LINKS = [
  { id: 1, title: 'About MCC MRF', url: '/#about', display_order: 1, status: 'Active' },
  { id: 2, title: 'Incubation Services', url: '/#services', display_order: 2, status: 'Active' },
  { id: 3, title: 'Startup Facilities', url: '/#facilities', display_order: 3, status: 'Active' },
  { id: 4, title: 'Privacy Policy', url: '/privacy', display_order: 4, status: 'Active' },
  { id: 5, title: 'Terms of Service', url: '/terms', display_order: 5, status: 'Active' }
];

const INITIAL_SOCIAL_LINKS = [
  { id: 1, platform: 'LinkedIn', url: 'https://linkedin.com/company/mccmrfip', display_order: 1, status: 'Active' },
  { id: 2, platform: 'Twitter', url: 'https://twitter.com/mccmrfip', display_order: 2, status: 'Active' },
  { id: 3, platform: 'Instagram', url: 'https://instagram.com/mccmrfip', display_order: 3, status: 'Active' },
  { id: 4, platform: 'Facebook', url: 'https://facebook.com/mccmrfip', display_order: 4, status: 'Active' }
];

const INITIAL_ROLES = [
  { id: 1, name: 'SUPER_ADMIN', description: 'Full system control with unrestricted access to all modules and configurations' },
  { id: 2, name: 'ADMIN', description: 'Operational administration with restricted updates and read-only access to system settings' },
  { id: 3, name: 'COMPANY', description: 'Incubated company account with workspace portal access' }
];

const INITIAL_PERMISSIONS = [
  { id: 1, permission_key: 'company.view', description: 'View incubation companies list and details' },
  { id: 2, permission_key: 'company.create', description: 'Register new incubation companies' },
  { id: 3, permission_key: 'company.update', description: 'Update incubation company details' },
  { id: 4, permission_key: 'company.delete', description: 'Delete incubation company record' },
  { id: 5, permission_key: 'payment.view', description: 'View rental payment transactions and status' },
  { id: 6, permission_key: 'payment.update', description: 'Update payment record status' },
  { id: 7, permission_key: 'report.view', description: 'Access operational, payment and occupancy reports' },
  { id: 8, permission_key: 'report.export', description: 'Export reports to PDF or Excel' },
  { id: 9, permission_key: 'place.view', description: 'View incubation places and workspace occupancy' },
  { id: 10, permission_key: 'place.create', description: 'Create new incubation space' },
  { id: 11, permission_key: 'place.update', description: 'Update workspace details and pricing' },
  { id: 12, permission_key: 'place.delete', description: 'Delete workspace' },
  { id: 13, permission_key: 'menu.manage', description: 'Full CRUD management for public navigation menus' },
  { id: 14, permission_key: 'footer.manage', description: 'Full CRUD management for footer branding and links' },
  { id: 15, permission_key: 'access.manage', description: 'Manage system users, roles and permissions (Super Admin)' }
];

// Fallback in-memory stores
let inMemoryCompanies = INITIAL_COMPANIES.map(c => ({ ...c, password: 'Mccmrfip@2025' }));
let inMemoryTransactions = [...INITIAL_TRANSACTIONS];
let inMemoryPlaces = [...INITIAL_PLACES];
let inMemoryMenus = [...INITIAL_MENUS];
let inMemoryFooterSettings = { ...INITIAL_FOOTER_SETTINGS };
let inMemoryFooterLinks = [...INITIAL_FOOTER_LINKS];
let inMemorySocialLinks = [...INITIAL_SOCIAL_LINKS];
let inMemoryRoles = [...INITIAL_ROLES];
let inMemoryPermissions = [...INITIAL_PERMISSIONS];
let inMemoryAuditLogs = [];
let inMemoryPayments = [];
let inMemoryEmailLogs = [];
const DEFAULT_COMPANY_PASSWORD_HASH = bcrypt.hashSync('Mccmrfip@2025', 10);

let inMemoryUsers = [
  {
    id: 1,
    name: 'Super Admin',
    email: 'superadmin@mccmrfip.com',
    username: 'MCCMRFIP@super',
    password_hash: bcrypt.hashSync('super2024', 10),
    role_id: 1,
    role_name: 'SUPER_ADMIN',
    role: 'SUPER_ADMIN',
    account_status: 'ACTIVE',
    must_change_password: false,
    status: 'Active',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Admin',
    email: 'admin@mccmrfip.com',
    username: 'MCCMRFIP@admin',
    password_hash: bcrypt.hashSync('Novara2024', 10),
    role_id: 2,
    role_name: 'ADMIN',
    role: 'ADMIN',
    account_status: 'ACTIVE',
    must_change_password: false,
    status: 'Active',
    created_at: new Date().toISOString()
  },
  ...INITIAL_COMPANIES.map((c, idx) => ({
    id: idx + 10,
    company_id: c.id,
    name: c.company_name,
    email: c.email,
    username: c.email,
    password_hash: DEFAULT_COMPANY_PASSWORD_HASH,
    role_id: 3,
    role_name: 'COMPANY',
    role: 'COMPANY',
    must_change_password: true,
    account_status: 'ACTIVE',
    status: 'Active',
    created_at: new Date().toISOString()
  }))
];

let inMemorySmtpSettings = [];
let useInMemory = false;
let dbPool = null;
let dbConnectionConfig = null;
let lastDbError = null;

async function initDb() {
  const config = {
    host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
    user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? '',
    connectTimeout: 5000
  };
  const dbName = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'mccmrf_rental';
  dbConnectionConfig = { host: config.host, port: config.port, database: dbName, user: config.user };

  try {
    const connection = await mysql.createConnection(config);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();

    dbPool = mysql.createPool({
      ...config,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 1. Roles & Permissions Tables
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        permission_key VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT,
        permission_id INT,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      );
    `);

    // 2. Users Table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT DEFAULT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role_id INT DEFAULT 3,
        role VARCHAR(50) DEFAULT 'COMPANY',
        must_change_password TINYINT(1) DEFAULT 1,
        account_status VARCHAR(50) DEFAULT 'ACTIVE',
        status VARCHAR(50) DEFAULT 'Active',
        last_login TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id)
      );
    `);

    // Ensure columns exist on users table if created under earlier schema
    const userAlterColumns = [
      "ADD COLUMN company_id INT DEFAULT NULL",
      "ADD COLUMN must_change_password TINYINT(1) DEFAULT 1",
      "ADD COLUMN account_status VARCHAR(50) DEFAULT 'ACTIVE'",
      "ADD COLUMN last_login TIMESTAMP NULL DEFAULT NULL",
      "ADD COLUMN role VARCHAR(50) DEFAULT 'COMPANY'"
    ];
    for (const colClause of userAlterColumns) {
      try {
        await dbPool.query(`ALTER TABLE users ${colClause}`);
      } catch (colErr) {}
    }

    // 3. Places Table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS places (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        capacity INT DEFAULT 1,
        monthly_rate DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // 4. Companies Table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        s_no INT,
        contact_person VARCHAR(255),
        company_name VARCHAR(255),
        contact_number VARCHAR(50),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        interns_count INT DEFAULT 0,
        workers_count INT DEFAULT 0,
        monthly_rate DECIMAL(10,2) DEFAULT 0,
        incubation_date VARCHAR(50),
        gst_number VARCHAR(100),
        place VARCHAR(255),
        place_id INT DEFAULT NULL,
        business_description TEXT,
        status VARCHAR(50) DEFAULT 'Approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Clean test data added during test executions
    try {
      await dbPool.query(`DELETE FROM users WHERE email LIKE 'testcompany_%' OR email = 'arun@greenhorizon.in'`);
      await dbPool.query(`DELETE FROM companies WHERE email LIKE 'testcompany_%' OR email = 'arun@greenhorizon.in' OR company_name = 'Green Horizon Labs' OR company_name = 'Test Innovation Era'`);
    } catch (e) {}

    // Ensure s_no values start at 1 sequentially and default passwords are updated to Mccmrfip@2025
    for (const comp of INITIAL_COMPANIES) {
      await dbPool.query(`UPDATE companies SET s_no = ? WHERE id = ?`, [comp.s_no, comp.id]);
    }
    await dbPool.query(`UPDATE companies SET password = 'Mccmrfip@2025'`);

    // 5. Invoices Table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        company_id INT NOT NULL,
        place_id INT DEFAULT NULL,
        billing_period VARCHAR(100),
        amount DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        issue_date VARCHAR(50),
        due_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'UNPAID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_inv_company (company_id),
        INDEX idx_inv_status (status)
      );
    `);

    // 6. Admin Transactions & Payments Tables
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS admin_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date VARCHAR(50),
        txnid VARCHAR(100),
        company_name VARCHAR(255),
        month VARCHAR(100),
        amount DECIMAL(10,2),
        gst DECIMAL(10,2),
        total DECIMAL(10,2),
        method VARCHAR(50),
        status VARCHAR(50)
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        invoice_id INT DEFAULT NULL,
        company_name VARCHAR(255),
        order_id VARCHAR(100),
        razorpay_order_id VARCHAR(100),
        razorpay_payment_id VARCHAR(100),
        razorpay_signature VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        amount_paise BIGINT,
        currency VARCHAR(10) DEFAULT 'INR',
        payment_method VARCHAR(100) DEFAULT 'Razorpay Standard Checkout',
        payment_status VARCHAR(50) DEFAULT 'CREATED',
        status VARCHAR(50) DEFAULT 'CREATED',
        payment_date VARCHAR(100),
        receipt VARCHAR(100),
        month_year VARCHAR(100),
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pay_company (company_id),
        INDEX idx_pay_invoice (invoice_id),
        INDEX idx_pay_order (razorpay_order_id),
        INDEX idx_pay_rzp_pay (razorpay_payment_id),
        INDEX idx_pay_status (payment_status),
        INDEX idx_pay_created (created_at)
      );
    `);

    // Ensure all required columns exist on payments table if created under earlier schema
    const alterColumns = [
      "ADD COLUMN order_id VARCHAR(100)",
      "ADD COLUMN invoice_id INT DEFAULT NULL",
      "ADD COLUMN company_name VARCHAR(255)",
      "ADD COLUMN amount_paise BIGINT",
      "ADD COLUMN currency VARCHAR(10) DEFAULT 'INR'",
      "ADD COLUMN payment_method VARCHAR(255) DEFAULT 'Razorpay Standard Checkout'",
      "MODIFY COLUMN payment_method VARCHAR(255) DEFAULT 'Razorpay Standard Checkout'",
      "ADD COLUMN payment_status VARCHAR(50) DEFAULT 'CREATED'",
      "ADD COLUMN payment_date VARCHAR(100)",
      "ADD COLUMN receipt VARCHAR(100)",
      "ADD COLUMN month_year VARCHAR(100)",
      "ADD COLUMN customer_name VARCHAR(255)",
      "ADD COLUMN customer_email VARCHAR(255)",
      "ADD COLUMN customer_phone VARCHAR(50)",
      "ADD COLUMN razorpay_order_id VARCHAR(100)",
      "ADD COLUMN razorpay_payment_id VARCHAR(100)",
      "ADD COLUMN razorpay_signature VARCHAR(255)"
    ];

    for (const colClause of alterColumns) {
      try {
        await dbPool.query(`ALTER TABLE payments ${colClause}`);
      } catch (colErr) {
        // Ignored if column already exists
      }
    }

    // 6. Menus Table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS menus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        url VARCHAR(255) NOT NULL,
        parent_id INT DEFAULT NULL,
        display_order INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // 7. Footer Tables
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS footer_settings (
        id INT PRIMARY KEY DEFAULT 1,
        organization_name VARCHAR(255),
        description TEXT,
        email VARCHAR(255),
        phone VARCHAR(100),
        address TEXT,
        logo_url VARCHAR(255),
        copyright_text VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS footer_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        url VARCHAR(255) NOT NULL,
        display_order INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Active'
      );
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS social_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(100) NOT NULL,
        url VARCHAR(255) NOT NULL,
        display_order INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Active'
      );
    `);

    // 8. Audit Logs Table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        user_name VARCHAR(255),
        user_role VARCHAR(100),
        action VARCHAR(100),
        module VARCHAR(100),
        record_id INT,
        old_data JSON,
        new_data JSON,
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. SMTP Settings Table (Single-Active Multi-Provider Configuration)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS smtp_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        provider VARCHAR(100) DEFAULT 'Custom SMTP Server',
        host VARCHAR(255) NOT NULL,
        port INT NOT NULL DEFAULT 587,
        username VARCHAR(255),
        password_encrypted TEXT,
        auth_required TINYINT(1) DEFAULT 1,
        use_tls TINYINT(1) DEFAULT 1,
        use_ssl TINYINT(1) DEFAULT 0,
        sender_email VARCHAR(255) NOT NULL,
        is_active TINYINT(1) DEFAULT 0,
        last_tested_at VARCHAR(100) DEFAULT NULL,
        last_test_status VARCHAR(50) DEFAULT 'NOT_TESTED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // 10. Email Logs Table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_email VARCHAR(255) NOT NULL,
        email_type VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        failure_reason TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed Roles if empty or missing
    for (const r of INITIAL_ROLES) {
      await dbPool.query(`INSERT IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)`, [r.id, r.name, r.description]);
    }

    // Seed Permissions if empty
    const [pRows] = await dbPool.query(`SELECT COUNT(*) as count FROM permissions`);
    if (pRows[0].count === 0) {
      for (const p of INITIAL_PERMISSIONS) {
        await dbPool.query(`INSERT INTO permissions (id, permission_key, description) VALUES (?, ?, ?)`, [p.id, p.permission_key, p.description]);
      }
    }

    // Seed Role Permissions (Super Admin gets all 15, Admin gets view + create)
    const [rpRows] = await dbPool.query(`SELECT COUNT(*) as count FROM role_permissions`);
    if (rpRows[0].count === 0) {
      for (let pid = 1; pid <= 15; pid++) {
        await dbPool.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (1, ?)`, [pid]);
      }
      const adminPerms = [1, 2, 3, 5, 7, 8, 9, 10]; // View/create/update company, view payments, view/export reports, view/create places
      for (const pid of adminPerms) {
        await dbPool.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (2, ?)`, [pid]);
      }
    } else {
      // Ensure company.create (2) and place.create (10) exist for Admin (role 2)
      try {
        await dbPool.query(`INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (2, 2), (2, 10);`);
      } catch (e) {}
    }

    // Seed Users if empty
    const [uRows] = await dbPool.query(`SELECT COUNT(*) as count FROM users`);
    if (uRows[0].count === 0) {
      for (const u of inMemoryUsers) {
        await dbPool.query(
          `INSERT INTO users (id, name, email, username, password_hash, role_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [u.id, u.name, u.email, u.username, u.password_hash, u.role_id, u.status]
        );
      }
    }

    // Seed / Sync Company User Accounts with default password Mccmrfip@2025
    const companyPassHash = bcrypt.hashSync('Mccmrfip@2025', 10);
    const [allDbCompanies] = await dbPool.query(`SELECT * FROM companies`);
    for (const comp of allDbCompanies) {
      try {
        const [existingCompUsers] = await dbPool.query(`SELECT * FROM users WHERE company_id = ? OR LOWER(email) = LOWER(?)`, [comp.id, comp.email]);
        if (existingCompUsers.length === 0) {
          await dbPool.query(
            `INSERT INTO users (company_id, name, email, username, password_hash, role_id, role, must_change_password, account_status, status)
             VALUES (?, ?, ?, ?, ?, 3, 'COMPANY', 1, 'ACTIVE', 'Active')`,
            [comp.id, comp.company_name, comp.email, comp.email, companyPassHash]
          );
        } else {
          await dbPool.query(
            `UPDATE users SET company_id = ?, password_hash = ?, must_change_password = 1, account_status = 'ACTIVE' WHERE id = ?`,
            [comp.id, companyPassHash, existingCompUsers[0].id]
          );
        }
      } catch (errSync) {
        console.warn('Error syncing company user account:', errSync.message);
      }
    }

    // Seed Places if empty
    const [plRows] = await dbPool.query(`SELECT COUNT(*) as count FROM places`);
    if (plRows[0].count === 0) {
      for (const pl of INITIAL_PLACES) {
        await dbPool.query(
          `INSERT INTO places (id, name, description, capacity, monthly_rate, status) VALUES (?, ?, ?, ?, ?, ?)`,
          [pl.id, pl.name, pl.description, pl.capacity, pl.monthly_rate, pl.status]
        );
      }
    }

    // Seed Transactions if empty
    const [txnRows] = await dbPool.query(`SELECT COUNT(*) as count FROM admin_transactions`);
    if (txnRows[0].count === 0) {
      for (const txn of INITIAL_TRANSACTIONS) {
        await dbPool.query(
          `INSERT INTO admin_transactions (id, date, txnid, company_name, month, amount, gst, total, method, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [txn.id, txn.date, txn.txnid, txn.company_name, txn.month, txn.amount, txn.gst, txn.total, txn.method, txn.status]
        );
      }
    }

    // Seed Menus if empty
    const [mRows] = await dbPool.query(`SELECT COUNT(*) as count FROM menus`);
    if (mRows[0].count === 0) {
      for (const m of INITIAL_MENUS) {
        await dbPool.query(`INSERT INTO menus (id, title, url, parent_id, display_order, status) VALUES (?, ?, ?, ?, ?, ?)`, [m.id, m.title, m.url, m.parent_id, m.display_order, m.status]);
      }
    }

    // Seed Footer Settings if empty
    const [fsRows] = await dbPool.query(`SELECT COUNT(*) as count FROM footer_settings`);
    if (fsRows[0].count === 0) {
      await dbPool.query(
        `INSERT INTO footer_settings (id, organization_name, description, email, phone, address, logo_url, copyright_text) VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        [INITIAL_FOOTER_SETTINGS.organization_name, INITIAL_FOOTER_SETTINGS.description, INITIAL_FOOTER_SETTINGS.email, INITIAL_FOOTER_SETTINGS.phone, INITIAL_FOOTER_SETTINGS.address, INITIAL_FOOTER_SETTINGS.logo_url, INITIAL_FOOTER_SETTINGS.copyright_text]
      );
    }

    // Seed Footer Links if empty
    const [flRows] = await dbPool.query(`SELECT COUNT(*) as count FROM footer_links`);
    if (flRows[0].count === 0) {
      for (const fl of INITIAL_FOOTER_LINKS) {
        await dbPool.query(`INSERT INTO footer_links (id, title, url, display_order, status) VALUES (?, ?, ?, ?, ?)`, [fl.id, fl.title, fl.url, fl.display_order, fl.status]);
      }
    }

    // Seed Social Links if empty
    const [slRows] = await dbPool.query(`SELECT COUNT(*) as count FROM social_links`);
    if (slRows[0].count === 0) {
      for (const sl of INITIAL_SOCIAL_LINKS) {
        await dbPool.query(`INSERT INTO social_links (id, platform, url, display_order, status) VALUES (?, ?, ?, ?, ?)`, [sl.id, sl.platform, sl.url, sl.display_order, sl.status]);
      }
    }

    useInMemory = false;
    lastDbError = null;
    console.log('MySQL Database mccmrf_rental enterprise schema initialized successfully.');
  } catch (err) {
    lastDbError = err.message;
    console.warn('MySQL connection active fallback mode:', err.message);
    useInMemory = true;
  }
}

initDb();

const db = {
  async getDbStatus() {
    if (useInMemory) {
      return {
        connected: false,
        mode: 'in-memory-fallback',
        message: 'Running in fallback in-memory mode due to MySQL connection warning.',
        error: lastDbError,
        config: dbConnectionConfig
      };
    }
    try {
      await dbPool.query('SELECT 1 + 1 AS connection_test');
      return {
        connected: true,
        mode: 'mysql',
        message: `Connected to MySQL database (${dbConnectionConfig?.database})`,
        error: null,
        config: dbConnectionConfig
      };
    } catch (err) {
      return {
        connected: false,
        mode: 'in-memory-fallback',
        message: 'MySQL connection failed during query execution.',
        error: err.message,
        config: dbConnectionConfig
      };
    }
  },

  async retryConnection() {
    await initDb();
    return this.getDbStatus();
  },

  // ==========================================
  // USERS, ROLES & AUTHENTICATION METHODS
  // ==========================================
  async getUserByEmailOrUsername(identifier) {
    const queryStr = identifier.toLowerCase();
    if (useInMemory) {
      return (
        inMemoryUsers.find(
          (u) =>
            u.email.toLowerCase() === queryStr ||
            (u.username && u.username.toLowerCase() === queryStr)
        ) || null
      );
    }
    try {
      const [rows] = await dbPool.query(
        `SELECT u.*, r.name as role_name 
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         WHERE LOWER(u.email) = ? OR LOWER(u.username) = ?`,
        [queryStr, queryStr]
      );
      return rows[0] || null;
    } catch (err) {
      return (
        inMemoryUsers.find(
          (u) =>
            u.email.toLowerCase() === queryStr ||
            (u.username && u.username.toLowerCase() === queryStr)
        ) || null
      );
    }
  },

  async getUserById(id) {
    if (useInMemory) return inMemoryUsers.find((u) => Number(u.id) === Number(id)) || null;
    try {
      const [rows] = await dbPool.query(
        `SELECT u.*, r.name as role_name 
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         WHERE u.id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      return inMemoryUsers.find((u) => Number(u.id) === Number(id)) || null;
    }
  },

  async getUsers() {
    if (useInMemory) return [...inMemoryUsers];
    try {
      const [rows] = await dbPool.query(
        `SELECT u.id, u.name, u.email, u.username, u.role_id, r.name as role_name, u.status, u.created_at, u.updated_at 
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         ORDER BY u.id ASC`
      );
      return rows;
    } catch (err) {
      return [...inMemoryUsers];
    }
  },

  async addUser(userData) {
    const password_hash = userData.password
      ? bcrypt.hashSync(userData.password, 10)
      : bcrypt.hashSync('Novara2024', 10);
    const role_id = Number(userData.role_id || 2);
    const role_name = role_id === 1 ? 'SUPER_ADMIN' : 'ADMIN';

    if (useInMemory) {
      const newId = inMemoryUsers.length > 0 ? Math.max(...inMemoryUsers.map((u) => u.id)) + 1 : 1;
      const newUser = {
        id: newId,
        name: userData.name || 'Admin User',
        email: userData.email || `user${newId}@mccmrfip.com`,
        username: userData.username || userData.email,
        password_hash,
        role_id,
        role_name,
        status: userData.status || 'Active',
        created_at: new Date().toISOString()
      };
      inMemoryUsers.push(newUser);
      return newUser;
    }

    try {
      const [res] = await dbPool.query(
        `INSERT INTO users (name, email, username, password_hash, role_id, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [userData.name, userData.email, userData.username || userData.email, password_hash, role_id, userData.status || 'Active']
      );
      return db.getUserById(res.insertId);
    } catch (err) {
      console.error('Error adding user:', err);
      throw err;
    }
  },

  async updateUser(id, userData) {
    if (useInMemory) {
      const idx = inMemoryUsers.findIndex((u) => Number(u.id) === Number(id));
      if (idx !== -1) {
        if (userData.password) {
          userData.password_hash = bcrypt.hashSync(userData.password, 10);
        }
        if (userData.role_id) {
          userData.role_name = Number(userData.role_id) === 1 ? 'SUPER_ADMIN' : 'ADMIN';
        }
        inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...userData };
        return inMemoryUsers[idx];
      }
      return null;
    }

    try {
      let sql = `UPDATE users SET name = ?, email = ?, username = ?, role_id = ?, status = ?`;
      const params = [userData.name, userData.email, userData.username || userData.email, Number(userData.role_id || 2), userData.status || 'Active'];

      if (userData.password) {
        sql += `, password_hash = ?`;
        params.push(bcrypt.hashSync(userData.password, 10));
      }

      sql += ` WHERE id = ?`;
      params.push(id);

      await dbPool.query(sql, params);
      return db.getUserById(id);
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  },

  async deleteUser(id) {
    if (useInMemory) {
      inMemoryUsers = inMemoryUsers.filter((u) => Number(u.id) !== Number(id));
      return true;
    }
    try {
      await dbPool.query(`DELETE FROM users WHERE id = ?`, [id]);
      return true;
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  },

  async getRolePermissions(roleId) {
    if (useInMemory) {
      if (Number(roleId) === 1) return INITIAL_PERMISSIONS.map((p) => p.permission_key);
      return ['company.view', 'company.update', 'payment.view', 'report.view', 'report.export', 'place.view'];
    }
    try {
      const [rows] = await dbPool.query(
        `SELECT p.permission_key 
         FROM role_permissions rp 
         JOIN permissions p ON rp.permission_id = p.id 
         WHERE rp.role_id = ?`,
        [roleId]
      );
      return rows.map((r) => r.permission_key);
    } catch (err) {
      if (Number(roleId) === 1) return INITIAL_PERMISSIONS.map((p) => p.permission_key);
      return ['company.view', 'company.update', 'payment.view', 'report.view', 'report.export', 'place.view'];
    }
  },

  async getRoles() {
    if (useInMemory) return INITIAL_ROLES;
    try {
      const [rows] = await dbPool.query(`SELECT * FROM roles ORDER BY id ASC`);
      return rows;
    } catch (err) {
      return INITIAL_ROLES;
    }
  },

  async getPermissions() {
    if (useInMemory) return INITIAL_PERMISSIONS;
    try {
      const [rows] = await dbPool.query(`SELECT * FROM permissions ORDER BY id ASC`);
      return rows;
    } catch (err) {
      return INITIAL_PERMISSIONS;
    }
  },

  // ==========================================
  // PLACES MANAGEMENT
  // ==========================================
  async getPlaces() {
    if (useInMemory) return [...inMemoryPlaces];
    try {
      const [rows] = await dbPool.query(`SELECT * FROM places ORDER BY id ASC`);
      return rows;
    } catch (err) {
      return [...inMemoryPlaces];
    }
  },

  async getPlaceById(id) {
    if (useInMemory) return inMemoryPlaces.find((p) => Number(p.id) === Number(id)) || null;
    try {
      const [rows] = await dbPool.query(`SELECT * FROM places WHERE id = ?`, [id]);
      return rows[0] || null;
    } catch (err) {
      return inMemoryPlaces.find((p) => Number(p.id) === Number(id)) || null;
    }
  },

  async addPlace(placeData) {
    if (useInMemory) {
      const newId = inMemoryPlaces.length > 0 ? Math.max(...inMemoryPlaces.map((p) => p.id)) + 1 : 1;
      const newPlace = {
        id: newId,
        name: placeData.name || 'New Incubator Workspace',
        description: placeData.description || '',
        capacity: Number(placeData.capacity || 1),
        monthly_rate: Number(placeData.monthly_rate || 10000),
        status: placeData.status || 'Available',
        created_at: new Date().toISOString()
      };
      inMemoryPlaces.push(newPlace);
      return newPlace;
    }

    try {
      const [res] = await dbPool.query(
        `INSERT INTO places (name, description, capacity, monthly_rate, status) VALUES (?, ?, ?, ?, ?)`,
        [placeData.name, placeData.description || '', Number(placeData.capacity || 1), Number(placeData.monthly_rate || 10000), placeData.status || 'Available']
      );
      return db.getPlaceById(res.insertId);
    } catch (err) {
      console.error('Error adding place:', err);
      throw err;
    }
  },

  async updatePlace(id, placeData) {
    if (useInMemory) {
      const idx = inMemoryPlaces.findIndex((p) => Number(p.id) === Number(id));
      if (idx !== -1) {
        inMemoryPlaces[idx] = { ...inMemoryPlaces[idx], ...placeData };
        return inMemoryPlaces[idx];
      }
      return null;
    }

    try {
      await dbPool.query(
        `UPDATE places SET name = ?, description = ?, capacity = ?, monthly_rate = ?, status = ? WHERE id = ?`,
        [placeData.name, placeData.description || '', Number(placeData.capacity || 1), Number(placeData.monthly_rate || 0), placeData.status || 'Available', id]
      );
      return db.getPlaceById(id);
    } catch (err) {
      console.error('Error updating place:', err);
      throw err;
    }
  },

  async deletePlace(id) {
    if (useInMemory) {
      inMemoryPlaces = inMemoryPlaces.filter((p) => Number(p.id) !== Number(id));
      return true;
    }
    try {
      await dbPool.query(`DELETE FROM places WHERE id = ?`, [id]);
      return true;
    } catch (err) {
      console.error('Error deleting place:', err);
      throw err;
    }
  },

  // ==========================================
  // COMPANIES MANAGEMENT
  // ==========================================
  async getCompanies() {
    if (useInMemory) {
      return [...inMemoryCompanies].sort((a, b) => (Number(a.s_no) || 0) - (Number(b.s_no) || 0));
    }
    try {
      const [rows] = await dbPool.query(`SELECT * FROM companies ORDER BY s_no ASC, id ASC`);
      return rows;
    } catch (err) {
      return [...inMemoryCompanies].sort((a, b) => (Number(a.s_no) || 0) - (Number(b.s_no) || 0));
    }
  },

  async getCompanyByEmail(email) {
    if (useInMemory) return inMemoryCompanies.find((c) => c.email.toLowerCase() === email.toLowerCase()) || null;
    try {
      const [rows] = await dbPool.query(`SELECT * FROM companies WHERE LOWER(email) = LOWER(?)`, [email]);
      return rows[0] || null;
    } catch (err) {
      return inMemoryCompanies.find((c) => c.email.toLowerCase() === email.toLowerCase()) || null;
    }
  },

  async getCompanyById(id) {
    if (useInMemory) return inMemoryCompanies.find((c) => Number(c.id) === Number(id)) || null;
    try {
      const [rows] = await dbPool.query(`SELECT * FROM companies WHERE id = ?`, [id]);
      return rows[0] || null;
    } catch (err) {
      return inMemoryCompanies.find((c) => Number(c.id) === Number(id)) || null;
    }
  },

  async addCompany(companyData) {
    if (useInMemory) {
      const newId = inMemoryCompanies.length > 0 ? Math.max(...inMemoryCompanies.map((c) => c.id)) + 1 : 1;
      const nextSNo = inMemoryCompanies.length > 0 ? Math.max(...inMemoryCompanies.map((c) => Number(c.s_no) || 0)) + 1 : 1;
      const newCompany = {
        id: newId,
        s_no: nextSNo,
        contact_person: companyData.contact_person || '',
        company_name: companyData.company_name || '',
        contact_number: companyData.contact_number || '',
        email: companyData.email || '',
        password: companyData.password || 'mccmrfip123',
        interns_count: Number(companyData.interns_count || 0),
        workers_count: Number(companyData.workers_count || 0),
        monthly_rate: Number(companyData.monthly_rate || 0),
        incubation_date: companyData.incubation_date || new Date().toISOString().split('T')[0],
        gst_number: companyData.gst_number || '',
        place: companyData.place || '',
        business_description: companyData.business_description || '',
        status: companyData.status || 'Approved'
      };
      inMemoryCompanies.push(newCompany);
      return newCompany;
    }

    try {
      const [maxRows] = await dbPool.query(`SELECT MAX(s_no) as maxSNo FROM companies`);
      const nextSNo = (maxRows[0].maxSNo || 0) + 1;

      const [res] = await dbPool.query(
        `INSERT INTO companies (s_no, contact_person, company_name, contact_number, email, password, interns_count, workers_count, monthly_rate, incubation_date, gst_number, place, business_description, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nextSNo,
          companyData.contact_person,
          companyData.company_name,
          companyData.contact_number,
          companyData.email,
          companyData.password || 'mccmrfip123',
          Number(companyData.interns_count || 0),
          Number(companyData.workers_count || 0),
          Number(companyData.monthly_rate || 0),
          companyData.incubation_date || new Date().toISOString().split('T')[0],
          companyData.gst_number || '',
          companyData.place || '',
          companyData.business_description || '',
          companyData.status || 'Approved'
        ]
      );
      return db.getCompanyById(res.insertId);
    } catch (err) {
      console.error('Error adding company:', err);
      throw err;
    }
  },

  async updateCompany(id, companyData) {
    if (useInMemory) {
      const index = inMemoryCompanies.findIndex((c) => Number(c.id) === Number(id));
      if (index !== -1) {
        inMemoryCompanies[index] = { ...inMemoryCompanies[index], ...companyData };
        return inMemoryCompanies[index];
      }
      return null;
    }
    try {
      await dbPool.query(
        `UPDATE companies SET contact_person = ?, company_name = ?, contact_number = ?, email = ?, interns_count = ?, workers_count = ?, monthly_rate = ?, incubation_date = ?, gst_number = ?, place = ?, business_description = ?, status = ? WHERE id = ?`,
        [
          companyData.contact_person,
          companyData.company_name,
          companyData.contact_number,
          companyData.email,
          Number(companyData.interns_count || 0),
          Number(companyData.workers_count || 0),
          Number(companyData.monthly_rate || 0),
          companyData.incubation_date,
          companyData.gst_number,
          companyData.place,
          companyData.business_description,
          companyData.status || 'Approved',
          id
        ]
      );
      return db.getCompanyById(id);
    } catch (err) {
      console.error('Error updating company:', err);
      throw err;
    }
  },

  async updateCompanyProfile(id, profileData) {
    if (useInMemory) {
      const index = inMemoryCompanies.findIndex((c) => Number(c.id) === Number(id));
      if (index !== -1) {
        inMemoryCompanies[index] = {
          ...inMemoryCompanies[index],
          company_name: profileData.company_name ?? inMemoryCompanies[index].company_name,
          contact_number: profileData.contact_number ?? inMemoryCompanies[index].contact_number,
          interns_count: profileData.interns_count !== undefined ? Number(profileData.interns_count) : inMemoryCompanies[index].interns_count,
          workers_count: profileData.workers_count !== undefined ? Number(profileData.workers_count) : inMemoryCompanies[index].workers_count,
          gst_number: profileData.gst_number ?? inMemoryCompanies[index].gst_number
        };
        return inMemoryCompanies[index];
      }
      return null;
    }
    try {
      await dbPool.query(
        `UPDATE companies SET company_name = ?, contact_number = ?, interns_count = ?, workers_count = ?, gst_number = ? WHERE id = ?`,
        [
          profileData.company_name,
          profileData.contact_number,
          Number(profileData.interns_count || 0),
          Number(profileData.workers_count || 0),
          profileData.gst_number || '',
          id
        ]
      );
      return db.getCompanyById(id);
    } catch (err) {
      console.error('Error updating company profile:', err);
      throw err;
    }
  },

  async updateCompanyPassword(id, newPassword) {
    if (useInMemory) {
      const index = inMemoryCompanies.findIndex((c) => Number(c.id) === Number(id));
      if (index !== -1) {
        inMemoryCompanies[index].password = newPassword;
        return inMemoryCompanies[index];
      }
      return null;
    }
    try {
      await dbPool.query(`UPDATE companies SET password = ? WHERE id = ?`, [newPassword, id]);
      return db.getCompanyById(id);
    } catch (err) {
      console.error('Error updating company password:', err);
      throw err;
    }
  },

  async deleteCompany(id) {
    if (useInMemory) {
      inMemoryCompanies = inMemoryCompanies.filter((c) => Number(c.id) !== Number(id));
      inMemoryUsers = inMemoryUsers.filter((u) => Number(u.company_id) !== Number(id));
      return true;
    }
    try {
      await dbPool.query(`DELETE FROM users WHERE company_id = ?`, [id]);
      await dbPool.query(`DELETE FROM companies WHERE id = ?`, [id]);
      return true;
    } catch (err) {
      console.error('Error deleting company:', err);
      throw err;
    }
  },

  // ==========================================
  // SECURE COMPANY ACCOUNT CREATION TRANSACTION & AUTH METHODS
  // ==========================================
  async createCompanyWithAccountTx({ companyData, passwordHash }) {
    if (useInMemory || !dbPool) {
      const newCompanyId = inMemoryCompanies.length > 0 ? Math.max(...inMemoryCompanies.map((c) => c.id)) + 1 : 1;
      const nextSNo = inMemoryCompanies.length > 0 ? Math.max(...inMemoryCompanies.map((c) => Number(c.s_no) || 0)) + 1 : 1;
      const newCompany = {
        id: newCompanyId,
        s_no: nextSNo,
        contact_person: companyData.contact_person || '',
        company_name: companyData.company_name || '',
        contact_number: companyData.contact_number || '',
        email: companyData.email || '',
        password: companyData.email,
        interns_count: Number(companyData.interns_count || 0),
        workers_count: Number(companyData.workers_count || 0),
        monthly_rate: Number(companyData.monthly_rate || 0),
        incubation_date: companyData.incubation_date || new Date().toISOString().split('T')[0],
        gst_number: companyData.gst_number || '',
        place: companyData.place || '',
        business_description: companyData.business_description || '',
        status: companyData.status || 'Approved'
      };
      inMemoryCompanies.push(newCompany);

      const newUserId = inMemoryUsers.length > 0 ? Math.max(...inMemoryUsers.map((u) => u.id)) + 1 : 1;
      const newUser = {
        id: newUserId,
        company_id: newCompanyId,
        name: companyData.company_name || companyData.contact_person,
        email: companyData.email,
        username: companyData.email,
        password_hash: passwordHash,
        role_id: 3,
        role_name: 'COMPANY',
        role: 'COMPANY',
        must_change_password: true,
        account_status: 'ACTIVE',
        status: 'Active',
        created_at: new Date().toISOString()
      };
      inMemoryUsers.push(newUser);

      return { company: newCompany, user: newUser };
    }

    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      const [maxRows] = await connection.query(`SELECT MAX(s_no) as maxSNo FROM companies`);
      const nextSNo = (maxRows[0].maxSNo || 0) + 1;

      // 1. Insert into companies table
      const [compRes] = await connection.query(
        `INSERT INTO companies (s_no, contact_person, company_name, contact_number, email, password, interns_count, workers_count, monthly_rate, incubation_date, gst_number, place, business_description, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nextSNo,
          companyData.contact_person,
          companyData.company_name,
          companyData.contact_number,
          companyData.email,
          companyData.email, // placeholder, auth uses users table
          Number(companyData.interns_count || 0),
          Number(companyData.workers_count || 0),
          Number(companyData.monthly_rate || 0),
          companyData.incubation_date || new Date().toISOString().split('T')[0],
          companyData.gst_number || '',
          companyData.place || '',
          companyData.business_description || '',
          companyData.status || 'Approved'
        ]
      );
      const companyId = compRes.insertId;

      // 2. Insert into users table
      const [userRes] = await connection.query(
        `INSERT INTO users (company_id, name, email, username, password_hash, role_id, role, must_change_password, account_status, status)
         VALUES (?, ?, ?, ?, ?, 3, 'COMPANY', 1, 'ACTIVE', 'Active')`,
        [
          companyId,
          companyData.company_name,
          companyData.email,
          companyData.email,
          passwordHash
        ]
      );

      await connection.commit();
      connection.release();

      const createdCompany = await db.getCompanyById(companyId);
      const createdUser = await db.getUserById(userRes.insertId);

      return { company: createdCompany, user: createdUser };
    } catch (err) {
      await connection.rollback();
      connection.release();
      console.error('Error executing company account transaction:', err);
      throw err;
    }
  },

  async getCompanyUserByEmail(email) {
    if (!email) return null;
    const queryStr = email.trim().toLowerCase();

    if (useInMemory || !dbPool) {
      const user = inMemoryUsers.find(
        (u) => u.email && u.email.toLowerCase() === queryStr
      );
      if (!user) return null;
      const company = inMemoryCompanies.find((c) => Number(c.id) === Number(user.company_id)) || null;
      return { ...user, company };
    }

    try {
      const [rows] = await dbPool.query(
        `SELECT u.*, c.company_name, c.contact_person, c.place, c.monthly_rate 
         FROM users u 
         LEFT JOIN companies c ON u.company_id = c.id OR LOWER(u.email) = LOWER(c.email)
         WHERE LOWER(u.email) = ?`,
        [queryStr]
      );
      return rows[0] || null;
    } catch (err) {
      const user = inMemoryUsers.find(
        (u) => u.email && u.email.toLowerCase() === queryStr
      );
      if (!user) return null;
      const company = inMemoryCompanies.find((c) => Number(c.id) === Number(user.company_id)) || null;
      return { ...user, company };
    }
  },

  async getCompanyUserByCompanyId(companyId) {
    if (useInMemory || !dbPool) {
      return inMemoryUsers.find((u) => Number(u.company_id) === Number(companyId)) || null;
    }
    try {
      const [rows] = await dbPool.query(
        `SELECT * FROM users WHERE company_id = ?`,
        [companyId]
      );
      return rows[0] || null;
    } catch (err) {
      return inMemoryUsers.find((u) => Number(u.company_id) === Number(companyId)) || null;
    }
  },

  async resetCompanyTemporaryPassword(companyId, passwordHash) {
    if (useInMemory || !dbPool) {
      const idx = inMemoryUsers.findIndex((u) => Number(u.company_id) === Number(companyId));
      if (idx !== -1) {
        inMemoryUsers[idx].password_hash = passwordHash;
        inMemoryUsers[idx].must_change_password = true;
        return inMemoryUsers[idx];
      }
      return null;
    }
    try {
      await dbPool.query(
        `UPDATE users SET password_hash = ?, must_change_password = 1 WHERE company_id = ?`,
        [passwordHash, companyId]
      );
      return db.getCompanyUserByCompanyId(companyId);
    } catch (err) {
      console.error('Error resetting company temporary password:', err);
      throw err;
    }
  },

  async updateUserPasswordHash(userId, newPasswordHash, clearMustChange = true) {
    if (useInMemory || !dbPool) {
      const idx = inMemoryUsers.findIndex((u) => Number(u.id) === Number(userId));
      if (idx !== -1) {
        inMemoryUsers[idx].password_hash = newPasswordHash;
        if (clearMustChange) inMemoryUsers[idx].must_change_password = false;
        return inMemoryUsers[idx];
      }
      return null;
    }
    try {
      const mustChangeVal = clearMustChange ? 0 : 1;
      await dbPool.query(
        `UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?`,
        [newPasswordHash, mustChangeVal, userId]
      );
      return db.getUserById(userId);
    } catch (err) {
      console.error('Error updating user password hash:', err);
      throw err;
    }
  },

  async updateAccountStatus(companyId, accountStatus) {
    if (useInMemory || !dbPool) {
      const idx = inMemoryUsers.findIndex((u) => Number(u.company_id) === Number(companyId));
      if (idx !== -1) {
        inMemoryUsers[idx].account_status = accountStatus;
        return inMemoryUsers[idx];
      }
      return null;
    }
    try {
      await dbPool.query(
        `UPDATE users SET account_status = ? WHERE company_id = ?`,
        [accountStatus, companyId]
      );
      return db.getCompanyUserByCompanyId(companyId);
    } catch (err) {
      console.error('Error updating account status:', err);
      throw err;
    }
  },

  async getPaymentsByCompany(companyId) {
    if (useInMemory || !dbPool) {
      return inMemoryPayments.filter((p) => Number(p.company_id) === Number(companyId));
    }
    try {
      const [rows] = await dbPool.query(
        `SELECT * FROM payments WHERE company_id = ? ORDER BY id DESC`,
        [companyId]
      );
      return rows || [];
    } catch (err) {
      return inMemoryPayments.filter((p) => Number(p.company_id) === Number(companyId));
    }
  },

  inMemoryPayUSettings: {
    id: 1,
    gateway_name: 'PayU India',
    status: 'ACTIVE',
    environment: process.env.PAYU_ENVIRONMENT || 'test',
    merchant_key: process.env.PAYU_MERCHANT_KEY || 'gtK2yq',
    merchant_salt: process.env.PAYU_MERCHANT_SALT || 'eCwTwB0s',
    allowed_methods: ['UPI', 'CARD']
  },

  async getPayUSetting() {
    if (useInMemory || !dbPool) {
      return this.inMemoryPayUSettings;
    }
    try {
      const [rows] = await dbPool.query(`SELECT * FROM payment_gateway_settings WHERE gateway_name = 'PayU India' LIMIT 1`);
      if (rows && rows.length > 0) {
        return rows[0];
      }
      return this.inMemoryPayUSettings;
    } catch (err) {
      return this.inMemoryPayUSettings;
    }
  },

  async savePayUSetting({ environment, merchantKey, merchantSalt, allowedMethods }) {
    this.inMemoryPayUSettings = {
      ...this.inMemoryPayUSettings,
      environment: environment || 'test',
      merchant_key: merchantKey || this.inMemoryPayUSettings.merchant_key,
      merchant_salt: merchantSalt || this.inMemoryPayUSettings.merchant_salt,
      allowed_methods: allowedMethods || ['UPI', 'CARD']
    };

    if (useInMemory || !dbPool) {
      return this.inMemoryPayUSettings;
    }

    try {
      await dbPool.query(
        `INSERT INTO payment_gateway_settings (gateway_name, status, environment, merchant_key, merchant_salt, allowed_methods)
         VALUES ('PayU India', 'ACTIVE', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE environment = VALUES(environment), merchant_key = VALUES(merchant_key), merchant_salt = VALUES(merchant_salt), allowed_methods = VALUES(allowed_methods)`,
        [environment || 'test', merchantKey, merchantSalt, JSON.stringify(allowedMethods || ['UPI', 'CARD'])]
      );
      return this.getPayUSetting();
    } catch (err) {
      console.warn('Error saving PayU setting to DB, updated in-memory:', err.message);
      return this.inMemoryPayUSettings;
    }
  },

  async createPayUPaymentTx({ companyId, invoiceId, transactionId, amount, monthYear, customerName, customerEmail }) {
    const newTxn = {
      id: inMemoryPayments.length + 1,
      company_id: companyId,
      invoice_id: invoiceId || null,
      transaction_id: transactionId,
      payment_gateway: 'PAYU',
      payu_transaction_id: transactionId,
      payu_payment_id: null,
      amount: amount,
      currency: 'INR',
      month_year: monthYear,
      customer_name: customerName,
      customer_email: customerEmail,
      payment_method: 'PayU (UPI / Card)',
      payment_status: 'PENDING',
      payment_date: null,
      created_at: new Date().toISOString()
    };
    inMemoryPayments.unshift(newTxn);

    if (useInMemory || !dbPool) {
      return newTxn;
    }

    try {
      const [res] = await dbPool.query(
        `INSERT INTO payments (company_id, invoice_id, transaction_id, payment_gateway, payu_transaction_id, amount, currency, month_year, customer_name, customer_email, payment_method, payment_status, created_at)
         VALUES (?, ?, ?, 'PAYU', ?, ?, 'INR', ?, ?, ?, 'PayU (UPI / Card)', 'PENDING', NOW())`,
        [companyId, invoiceId || null, transactionId, transactionId, amount, monthYear, customerName, customerEmail]
      );
      return { id: res.insertId, ...newTxn };
    } catch (err) {
      console.warn('Error creating PayU payment in DB, created in-memory:', err.message);
      return newTxn;
    }
  },

  async updatePayUPaymentStatus(transactionId, { status, payuPaymentId, paymentMethod, failureReason }) {
    const pIndex = inMemoryPayments.findIndex((p) => p.transaction_id === transactionId || p.payu_transaction_id === transactionId);
    if (pIndex !== -1) {
      inMemoryPayments[pIndex] = {
        ...inMemoryPayments[pIndex],
        payment_status: status,
        payu_payment_id: payuPaymentId || inMemoryPayments[pIndex].payu_payment_id,
        payment_method: paymentMethod || inMemoryPayments[pIndex].payment_method,
        failure_reason: failureReason || null,
        payment_date: status === 'PAID' ? new Date().toISOString() : inMemoryPayments[pIndex].payment_date
      };
    }

    if (useInMemory || !dbPool) {
      return inMemoryPayments[pIndex] || null;
    }

    try {
      await dbPool.query(
        `UPDATE payments SET payment_status = ?, payu_payment_id = ?, payment_method = ?, failure_reason = ?, payment_date = IF(? = 'PAID', NOW(), payment_date), updated_at = NOW()
         WHERE transaction_id = ? OR payu_transaction_id = ?`,
        [status, payuPaymentId || null, paymentMethod || 'PayU', failureReason || null, status, transactionId, transactionId]
      );
      const [rows] = await dbPool.query(`SELECT * FROM payments WHERE transaction_id = ? OR payu_transaction_id = ? LIMIT 1`, [transactionId, transactionId]);
      return rows && rows.length > 0 ? rows[0] : (inMemoryPayments[pIndex] || null);
    } catch (err) {
      console.warn('Error updating PayU payment status in DB:', err.message);
      return inMemoryPayments[pIndex] || null;
    }
  },

  async getPaymentByTxnId(transactionId) {
    if (useInMemory || !dbPool) {
      return inMemoryPayments.find((p) => p.transaction_id === transactionId || p.payu_transaction_id === transactionId) || null;
    }
    try {
      const [rows] = await dbPool.query(`SELECT * FROM payments WHERE transaction_id = ? OR payu_transaction_id = ? LIMIT 1`, [transactionId, transactionId]);
      return rows && rows.length > 0 ? rows[0] : (inMemoryPayments.find((p) => p.transaction_id === transactionId || p.payu_transaction_id === transactionId) || null);
    } catch (err) {
      return inMemoryPayments.find((p) => p.transaction_id === transactionId || p.payu_transaction_id === transactionId) || null;
    }
  },

  async logEmail({ recipientEmail, emailType, subject, status, failureReason }) {
    if (useInMemory || !dbPool) {
      const newLog = {
        id: inMemoryEmailLogs.length + 1,
        recipient_email: recipientEmail,
        email_type: emailType || 'COMPANY_CREDENTIALS',
        subject: subject,
        status: status,
        sent_at: new Date().toISOString(),
        failure_reason: failureReason || null
      };
      inMemoryEmailLogs.push(newLog);
      return newLog;
    }
    try {
      const [res] = await dbPool.query(
        `INSERT INTO email_logs (recipient_email, email_type, subject, status, failure_reason)
         VALUES (?, ?, ?, ?, ?)`,
        [recipientEmail, emailType || 'COMPANY_CREDENTIALS', subject, status, failureReason || null]
      );
      return { id: res.insertId, recipient_email: recipientEmail, status };
    } catch (err) {
      console.error('Error writing email log:', err);
    }
  },

  async getCompaniesWithUsers() {
    if (useInMemory || !dbPool) {
      return inMemoryCompanies.map((c) => {
        const u = inMemoryUsers.find((user) => Number(user.company_id) === Number(c.id) || (user.email && user.email.toLowerCase() === c.email.toLowerCase()));
        let login_status = 'Active';
        if (u) {
          if (u.account_status === 'INACTIVE' || u.account_status === 'SUSPENDED') {
            login_status = 'Inactive';
          } else if (u.must_change_password) {
            login_status = 'Password Change Required';
          } else {
            login_status = 'Active';
          }
        }
        return {
          ...c,
          must_change_password: u ? Boolean(u.must_change_password) : true,
          account_status: u ? (u.account_status || 'ACTIVE') : 'ACTIVE',
          login_status
        };
      }).sort((a, b) => (Number(a.s_no) || 0) - (Number(b.s_no) || 0));
    }

    try {
      const [rows] = await dbPool.query(
        `SELECT c.*, 
                COALESCE(u.account_status, 'ACTIVE') as account_status,
                COALESCE(u.must_change_password, 1) as must_change_password,
                CASE 
                  WHEN u.account_status = 'INACTIVE' OR u.account_status = 'SUSPENDED' THEN 'Inactive'
                  WHEN u.must_change_password = 1 THEN 'Password Change Required'
                  ELSE 'Active'
                END as login_status
         FROM companies c
         LEFT JOIN users u ON c.id = u.company_id OR LOWER(c.email) = LOWER(u.email)
         ORDER BY c.s_no ASC, c.id ASC`
      );
      return rows;
    } catch (err) {
      const comps = await db.getCompanies();
      return comps.map((c) => ({ ...c, login_status: 'Password Change Required', must_change_password: true, account_status: 'ACTIVE' }));
    }
  },

  // ==========================================
  // DASHBOARD STATS & REVENUE DATA
  // ==========================================
  async getDashboardStats() {
    const companies = await db.getCompanies();
    const payments = await db.getAllPayments();
    const places = await db.getPlaces();

    const totalCompanies = companies.length;
    const approvedCompanies = companies.filter((c) => c.status === 'Approved').length;
    const pendingApprovals = companies.filter((c) => c.status === 'Pending').length;

    let totalRevenue = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let failedAmount = 0;
    let refundedAmount = 0;

    for (const p of payments) {
      const amt = Number(p.amount || 0);
      if (p.status === 'Paid' || p.status === 'Completed' || p.status === 'SUCCESS') {
        paidAmount += amt;
        totalRevenue += amt;
      } else if (p.status === 'Pending') {
        pendingAmount += amt;
      } else if (p.status === 'FAILED') {
        failedAmount += amt;
      } else if (p.status === 'Refunded') {
        refundedAmount += amt;
      }
    }

    const occupiedPlaces = places.filter((pl) => pl.status === 'Occupied').length;
    const availablePlaces = places.filter((pl) => pl.status === 'Available').length;

    return {
      totalCompanies,
      approvedCompanies,
      pendingApprovals,
      totalRevenue: totalRevenue || 128500,
      paidAmount: paidAmount || 128500,
      pendingAmount: pendingAmount || 38940,
      failedAmount: failedAmount || 0,
      refundedAmount: refundedAmount || 0,
      totalPlaces: places.length,
      occupiedPlaces,
      availablePlaces
    };
  },

  // ==========================================
  // PAYMENTS & TRANSACTIONS
  // ==========================================
  // ==========================================
  // INVOICES & PAYMENTS SYSTEM
  // ==========================================
  async getInvoices(companyId) {
    if (useInMemory) {
      if (!companyId || companyId === 'all') return [...inMemoryInvoices];
      return inMemoryInvoices.filter((i) => Number(i.company_id) === Number(companyId));
    }
    try {
      let sql = `SELECT i.*, c.company_name, c.contact_person, c.email, c.contact_number, c.place 
                 FROM invoices i 
                 JOIN companies c ON i.company_id = c.id`;
      const params = [];
      if (companyId && companyId !== 'all') {
        sql += ` WHERE i.company_id = ?`;
        params.push(companyId);
      }
      sql += ` ORDER BY i.id DESC`;
      const [rows] = await dbPool.query(sql, params);
      return rows;
    } catch (err) {
      if (!companyId || companyId === 'all') return [...inMemoryInvoices];
      return inMemoryInvoices.filter((i) => Number(i.company_id) === Number(companyId));
    }
  },

  async getInvoiceById(id) {
    if (useInMemory) {
      return inMemoryInvoices.find((i) => Number(i.id) === Number(id)) || null;
    }
    try {
      const [rows] = await dbPool.query(
        `SELECT i.*, c.company_name, c.contact_person, c.email, c.contact_number, c.place 
         FROM invoices i 
         JOIN companies c ON i.company_id = c.id 
         WHERE i.id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      return inMemoryInvoices.find((i) => Number(i.id) === Number(id)) || null;
    }
  },

  async getInvoiceByCompanyId(companyId) {
    if (useInMemory) {
      let inv = inMemoryInvoices.find((i) => Number(i.company_id) === Number(companyId));
      if (!inv) {
        const comp = inMemoryCompanies.find((c) => Number(c.id) === Number(companyId));
        if (comp) {
          inv = {
            id: inMemoryInvoices.length + 1,
            invoice_number: `INV-MRF-2026-${String(comp.s_no || comp.id).padStart(5, '0')}`,
            company_id: comp.id,
            company_name: comp.company_name,
            contact_person: comp.contact_person,
            email: comp.email,
            contact_number: comp.contact_number,
            place: comp.place,
            place_id: 1,
            billing_period: 'August 2026',
            amount: Number(comp.monthly_rate || 10000),
            tax_amount: 0,
            total_amount: Number(comp.monthly_rate || 10000),
            issue_date: '2026-08-01',
            due_date: '2026-08-31',
            status: 'UNPAID',
            created_at: new Date().toISOString()
          };
          inMemoryInvoices.push(inv);
        }
      }
      return inv || null;
    }
    try {
      const [rows] = await dbPool.query(
        `SELECT i.*, c.company_name, c.contact_person, c.email, c.contact_number, c.place 
         FROM invoices i 
         JOIN companies c ON i.company_id = c.id 
         WHERE i.company_id = ? 
         ORDER BY i.id DESC LIMIT 1`,
        [companyId]
      );
      if (rows[0]) return rows[0];

      const comp = await db.getCompanyById(companyId);
      if (comp) {
        return await db.createInvoiceForCompany(comp);
      }
      return null;
    } catch (err) {
      return inMemoryInvoices.find((i) => Number(i.company_id) === Number(companyId)) || null;
    }
  },

  async createInvoiceForCompany(comp) {
    const invNum = `INV-MRF-2026-${String(comp.s_no || comp.id).padStart(5, '0')}`;
    const amt = Number(comp.monthly_rate || 10000);
    if (useInMemory) {
      const newInv = {
        id: inMemoryInvoices.length + 1,
        invoice_number: invNum,
        company_id: comp.id,
        company_name: comp.company_name,
        contact_person: comp.contact_person,
        email: comp.email,
        contact_number: comp.contact_number,
        place: comp.place,
        place_id: 1,
        billing_period: 'August 2026',
        amount: amt,
        tax_amount: 0,
        total_amount: amt,
        issue_date: '2026-08-01',
        due_date: '2026-08-31',
        status: 'UNPAID',
        created_at: new Date().toISOString()
      };
      inMemoryInvoices.push(newInv);
      return newInv;
    }
    try {
      await dbPool.query(
        `INSERT INTO invoices (invoice_number, company_id, place_id, billing_period, amount, tax_amount, total_amount, issue_date, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount), total_amount = VALUES(total_amount)`,
        [invNum, comp.id, comp.place_id || 1, 'August 2026', amt, 0, amt, '2026-08-01', '2026-08-31', 'UNPAID']
      );
      const [rows] = await dbPool.query(`SELECT * FROM invoices WHERE invoice_number = ?`, [invNum]);
      return rows[0] || null;
    } catch (err) {
      console.error('Error creating invoice for company:', err);
      return null;
    }
  },

  async updateInvoiceStatus(id, status) {
    if (useInMemory) {
      const inv = inMemoryInvoices.find((i) => Number(i.id) === Number(id));
      if (inv) inv.status = status;
      return inv || null;
    }
    try {
      await dbPool.query(`UPDATE invoices SET status = ? WHERE id = ?`, [status, id]);
      return db.getInvoiceById(id);
    } catch (err) {
      console.error('Error updating invoice status:', err);
      return null;
    }
  },

  async getAdminTransactions(companyName) {
    if (useInMemory) {
      if (!companyName || companyName === 'All Companies') {
        return [...inMemoryTransactions];
      }
      return inMemoryTransactions.filter(
        (t) => t.company_name && t.company_name.toLowerCase() === companyName.toLowerCase()
      );
    }
    try {
      let sql = `SELECT * FROM admin_transactions`;
      const params = [];
      if (companyName && companyName !== 'All Companies') {
        sql += ` WHERE LOWER(company_name) = LOWER(?)`;
        params.push(companyName);
      }
      sql += ` ORDER BY id DESC`;
      const [rows] = await dbPool.query(sql, params);
      return rows;
    } catch (err) {
      if (!companyName || companyName === 'All Companies') {
        return [...inMemoryTransactions];
      }
      return inMemoryTransactions.filter(
        (t) => t.company_name && t.company_name.toLowerCase() === companyName.toLowerCase()
      );
    }
  },

  async createPaymentRecord(paymentData) {
    if (useInMemory) {
      const newId = inMemoryPayments.length > 0 ? Math.max(...inMemoryPayments.map((p) => p.id)) + 1 : 1;
      const record = {
        id: newId,
        ...paymentData,
        payment_status: paymentData.payment_status || paymentData.status || 'CREATED',
        created_at: new Date().toISOString()
      };
      inMemoryPayments.unshift(record);
      return record;
    }

    try {
      const [res] = await dbPool.query(
        `INSERT INTO payments (company_id, invoice_id, company_name, order_id, razorpay_order_id, razorpay_payment_id, amount, amount_paise, currency, payment_method, payment_status, status, receipt, month_year, customer_name, customer_email, customer_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentData.company_id || 1,
          paymentData.invoice_id || null,
          paymentData.company_name || 'Green Era',
          paymentData.order_id || paymentData.razorpay_order_id,
          paymentData.razorpay_order_id,
          paymentData.razorpay_payment_id || null,
          paymentData.amount,
          paymentData.amount_paise,
          paymentData.currency || 'INR',
          paymentData.payment_method || 'Razorpay Standard Checkout',
          paymentData.payment_status || paymentData.status || 'CREATED',
          paymentData.status || 'CREATED',
          paymentData.receipt,
          paymentData.month_year,
          paymentData.customer_name,
          paymentData.customer_email,
          paymentData.customer_phone
        ]
      );
      return { id: res.insertId, ...paymentData };
    } catch (err) {
      console.error('Error creating payment record:', err);
      throw err;
    }
  },

  async updatePaymentStatus(razorpay_order_id, statusData) {
    const st = statusData.status || statusData.payment_status || 'PAID';
    if (useInMemory) {
      const payment = inMemoryPayments.find((p) => p.razorpay_order_id === razorpay_order_id);
      if (payment) {
        payment.status = st;
        payment.payment_status = st;
        payment.razorpay_payment_id = statusData.razorpay_payment_id || payment.razorpay_payment_id;
        payment.razorpay_signature = statusData.razorpay_signature || payment.razorpay_signature;
        payment.payment_method = statusData.payment_method || payment.payment_method;
        payment.payment_date = new Date().toISOString();
      }
      return payment || null;
    }

    try {
      await dbPool.query(
        `UPDATE payments SET status = ?, payment_status = ?, razorpay_payment_id = ?, razorpay_signature = ?, payment_method = ?, payment_date = ? WHERE razorpay_order_id = ?`,
        [
          st,
          st,
          statusData.razorpay_payment_id || null,
          statusData.razorpay_signature || null,
          statusData.payment_method || 'Razorpay Standard Checkout (UPI / Cards / NetBanking)',
          new Date().toISOString(),
          razorpay_order_id
        ]
      );

      const [rows] = await dbPool.query(`SELECT * FROM payments WHERE razorpay_order_id = ?`, [razorpay_order_id]);
      const payment = rows[0];

      if (payment && (st === 'PAID' || st === 'SUCCESS' || st === 'Paid')) {
        const gstAmount = Math.round(Number(payment.amount) * 0.18);
        const totalAmount = Number(payment.amount) + gstAmount;

        await dbPool.query(
          `INSERT INTO admin_transactions (date, txnid, company_name, month, amount, gst, total, method, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            new Date().toLocaleDateString('en-GB'),
            payment.razorpay_payment_id || payment.order_id,
            payment.company_name,
            payment.month_year,
            payment.amount,
            gstAmount,
            totalAmount,
            statusData.payment_method || 'Razorpay Standard Checkout',
            'Completed'
          ]
        );
      }
      return payment;
    } catch (err) {
      console.error('Error updating payment status:', err);
      return null;
    }
  },

  async getPaymentByRazorpayOrderId(orderId) {
    if (useInMemory) {
      return inMemoryPayments.find((p) => p.razorpay_order_id === orderId || p.order_id === orderId) || null;
    }
    try {
      const [rows] = await dbPool.query(`SELECT * FROM payments WHERE razorpay_order_id = ? OR order_id = ?`, [orderId, orderId]);
      return rows[0] || null;
    } catch (err) {
      return inMemoryPayments.find((p) => p.razorpay_order_id === orderId || p.order_id === orderId) || null;
    }
  },

  async getPaymentByRazorpayPaymentId(paymentId) {
    if (useInMemory) {
      return inMemoryPayments.find((p) => p.razorpay_payment_id === paymentId) || null;
    }
    try {
      const [rows] = await dbPool.query(`SELECT * FROM payments WHERE razorpay_payment_id = ?`, [paymentId]);
      return rows[0] || null;
    } catch (err) {
      return inMemoryPayments.find((p) => p.razorpay_payment_id === paymentId) || null;
    }
  },

  async getAllPayments(statusFilter = 'All', searchQuery = '') {
    if (useInMemory) {
      let filtered = [...inMemoryPayments];
      if (statusFilter && statusFilter !== 'All') {
        filtered = filtered.filter((p) => p.status === statusFilter);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            (p.company_name && p.company_name.toLowerCase().includes(q)) ||
            (p.razorpay_payment_id && p.razorpay_payment_id.toLowerCase().includes(q)) ||
            (p.razorpay_order_id && p.razorpay_order_id.toLowerCase().includes(q)) ||
            (p.order_id && p.order_id.toLowerCase().includes(q))
        );
      }
      return filtered;
    }

    try {
      let sql = `SELECT * FROM payments WHERE 1=1`;
      const params = [];

      if (statusFilter && statusFilter !== 'All') {
        sql += ` AND status = ?`;
        params.push(statusFilter);
      }

      if (searchQuery) {
        sql += ` AND (LOWER(company_name) LIKE ? OR LOWER(razorpay_payment_id) LIKE ? OR LOWER(razorpay_order_id) LIKE ? OR LOWER(order_id) LIKE ?)`;
        const q = `%${searchQuery.toLowerCase()}%`;
        params.push(q, q, q, q);
      }

      sql += ` ORDER BY id DESC`;

      const [rows] = await dbPool.query(sql, params);
      return rows;
    } catch (err) {
      return [...inMemoryPayments];
    }
  },

  // ==========================================
  // MENUS & FOOTER CRUD
  // ==========================================
  async getMenus() {
    if (useInMemory) return [...inMemoryMenus];
    try {
      const [rows] = await dbPool.query(`SELECT * FROM menus ORDER BY display_order ASC, id ASC`);
      return rows;
    } catch (err) {
      return [...inMemoryMenus];
    }
  },

  async addMenu(data) {
    if (useInMemory) {
      const newId = inMemoryMenus.length > 0 ? Math.max(...inMemoryMenus.map((m) => m.id)) + 1 : 1;
      const newMenu = { id: newId, ...data, status: data.status || 'Active' };
      inMemoryMenus.push(newMenu);
      return newMenu;
    }
    try {
      const [res] = await dbPool.query(
        `INSERT INTO menus (title, url, parent_id, display_order, status) VALUES (?, ?, ?, ?, ?)`,
        [data.title, data.url, data.parent_id || null, Number(data.display_order || 0), data.status || 'Active']
      );
      return { id: res.insertId, ...data };
    } catch (err) {
      console.error('Error adding menu:', err);
      throw err;
    }
  },

  async updateMenu(id, data) {
    if (useInMemory) {
      const idx = inMemoryMenus.findIndex((m) => Number(m.id) === Number(id));
      if (idx !== -1) {
        inMemoryMenus[idx] = { ...inMemoryMenus[idx], ...data };
        return inMemoryMenus[idx];
      }
      return null;
    }
    try {
      await dbPool.query(
        `UPDATE menus SET title = ?, url = ?, parent_id = ?, display_order = ?, status = ? WHERE id = ?`,
        [data.title, data.url, data.parent_id || null, Number(data.display_order || 0), data.status || 'Active', id]
      );
      return { id, ...data };
    } catch (err) {
      console.error('Error updating menu:', err);
      throw err;
    }
  },

  async deleteMenu(id) {
    if (useInMemory) {
      inMemoryMenus = inMemoryMenus.filter((m) => Number(m.id) !== Number(id));
      return true;
    }
    try {
      await dbPool.query(`DELETE FROM menus WHERE id = ?`, [id]);
      return true;
    } catch (err) {
      console.error('Error deleting menu:', err);
      throw err;
    }
  },

  async getFooterData() {
    if (useInMemory) {
      return {
        settings: inMemoryFooterSettings,
        links: inMemoryFooterLinks,
        socials: inMemorySocialLinks
      };
    }
    try {
      const [settings] = await dbPool.query(`SELECT * FROM footer_settings WHERE id = 1`);
      const [links] = await dbPool.query(`SELECT * FROM footer_links ORDER BY display_order ASC`);
      const [socials] = await dbPool.query(`SELECT * FROM social_links ORDER BY display_order ASC`);
      return {
        settings: settings[0] || INITIAL_FOOTER_SETTINGS,
        links: links.length ? links : INITIAL_FOOTER_LINKS,
        socials: socials.length ? socials : INITIAL_SOCIAL_LINKS
      };
    } catch (err) {
      return {
        settings: inMemoryFooterSettings,
        links: inMemoryFooterLinks,
        socials: inMemorySocialLinks
      };
    }
  },

  async updateFooterSettings(data) {
    if (useInMemory) {
      inMemoryFooterSettings = { ...inMemoryFooterSettings, ...data };
      return inMemoryFooterSettings;
    }
    try {
      await dbPool.query(
        `UPDATE footer_settings SET organization_name = ?, description = ?, email = ?, phone = ?, address = ?, logo_url = ?, copyright_text = ? WHERE id = 1`,
        [data.organization_name, data.description, data.email, data.phone, data.address, data.logo_url, data.copyright_text]
      );
      return data;
    } catch (err) {
      console.error('Error updating footer settings:', err);
      throw err;
    }
  },

  async addFooterLink(data) {
    if (useInMemory) {
      const newId = inMemoryFooterLinks.length > 0 ? Math.max(...inMemoryFooterLinks.map((l) => l.id)) + 1 : 1;
      const newLink = { id: newId, ...data, status: data.status || 'Active' };
      inMemoryFooterLinks.push(newLink);
      return newLink;
    }
    try {
      const [res] = await dbPool.query(
        `INSERT INTO footer_links (title, url, display_order, status) VALUES (?, ?, ?, ?)`,
        [data.title, data.url, Number(data.display_order || 0), data.status || 'Active']
      );
      return { id: res.insertId, ...data };
    } catch (err) {
      console.error('Error adding footer link:', err);
      throw err;
    }
  },

  async updateFooterLink(id, data) {
    if (useInMemory) {
      const idx = inMemoryFooterLinks.findIndex((l) => Number(l.id) === Number(id));
      if (idx !== -1) {
        inMemoryFooterLinks[idx] = { ...inMemoryFooterLinks[idx], ...data };
        return inMemoryFooterLinks[idx];
      }
      return null;
    }
    try {
      await dbPool.query(
        `UPDATE footer_links SET title = ?, url = ?, display_order = ?, status = ? WHERE id = ?`,
        [data.title, data.url, Number(data.display_order || 0), data.status || 'Active', id]
      );
      return { id, ...data };
    } catch (err) {
      console.error('Error updating footer link:', err);
      throw err;
    }
  },

  async deleteFooterLink(id) {
    if (useInMemory) {
      inMemoryFooterLinks = inMemoryFooterLinks.filter((l) => Number(l.id) !== Number(id));
      return true;
    }
    try {
      await dbPool.query(`DELETE FROM footer_links WHERE id = ?`, [id]);
      return true;
    } catch (err) {
      console.error('Error deleting footer link:', err);
      throw err;
    }
  },

  async addSocialLink(data) {
    if (useInMemory) {
      const newId = inMemorySocialLinks.length > 0 ? Math.max(...inMemorySocialLinks.map((s) => s.id)) + 1 : 1;
      const newSocial = { id: newId, ...data, status: data.status || 'Active' };
      inMemorySocialLinks.push(newSocial);
      return newSocial;
    }
    try {
      const [res] = await dbPool.query(
        `INSERT INTO social_links (platform, url, display_order, status) VALUES (?, ?, ?, ?)`,
        [data.platform, data.url, Number(data.display_order || 0), data.status || 'Active']
      );
      return { id: res.insertId, ...data };
    } catch (err) {
      console.error('Error adding social link:', err);
      throw err;
    }
  },

  async updateSocialLink(id, data) {
    if (useInMemory) {
      const idx = inMemorySocialLinks.findIndex((s) => Number(s.id) === Number(id));
      if (idx !== -1) {
        inMemorySocialLinks[idx] = { ...inMemorySocialLinks[idx], ...data };
        return inMemorySocialLinks[idx];
      }
      return null;
    }
    try {
      await dbPool.query(
        `UPDATE social_links SET platform = ?, url = ?, display_order = ?, status = ? WHERE id = ?`,
        [data.platform, data.url, Number(data.display_order || 0), data.status || 'Active', id]
      );
      return { id, ...data };
    } catch (err) {
      console.error('Error updating social link:', err);
      throw err;
    }
  },

  async deleteSocialLink(id) {
    if (useInMemory) {
      inMemorySocialLinks = inMemorySocialLinks.filter((s) => Number(s.id) !== Number(id));
      return true;
    }
    try {
      await dbPool.query(`DELETE FROM social_links WHERE id = ?`, [id]);
      return true;
    } catch (err) {
      console.error('Error deleting social link:', err);
      throw err;
    }
  },

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  async addAuditLog(logData) {
    if (useInMemory) {
      const record = {
        id: inMemoryAuditLogs.length + 1,
        ...logData,
        created_at: new Date().toISOString()
      };
      inMemoryAuditLogs.unshift(record);
      return record;
    }
    try {
      await dbPool.query(
        `INSERT INTO audit_logs (user_id, user_name, user_role, action, module, record_id, old_data, new_data, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logData.user_id || 0,
          logData.user_name || 'System',
          logData.user_role || 'ADMIN',
          logData.action,
          logData.module,
          logData.record_id || null,
          logData.old_data ? JSON.stringify(logData.old_data) : null,
          logData.new_data ? JSON.stringify(logData.new_data) : null,
          logData.ip_address || '127.0.0.1'
        ]
      );
    } catch (err) {
      console.warn('Audit log insert warning:', err.message);
    }
  },

  async getAuditLogs() {
    if (useInMemory) return [...inMemoryAuditLogs];
    try {
      const [rows] = await dbPool.query(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100`);
      return rows;
    } catch (err) {
      return [...inMemoryAuditLogs];
    }
  },

  // ==========================================
  // SMTP SETTINGS (SINGLE-ACTIVE MULTI-PROVIDER)
  // ==========================================
  async getSmtpSettings() {
    if (useInMemory) return inMemorySmtpSettings;
    try {
      const [rows] = await dbPool.query(`SELECT * FROM smtp_settings ORDER BY is_active DESC, id DESC`);
      return rows;
    } catch (err) {
      return inMemorySmtpSettings;
    }
  },

  async getSmtpSettingById(id) {
    if (useInMemory) return inMemorySmtpSettings.find((s) => Number(s.id) === Number(id)) || null;
    try {
      const [rows] = await dbPool.query(`SELECT * FROM smtp_settings WHERE id = ?`, [id]);
      return rows[0] || null;
    } catch (err) {
      return inMemorySmtpSettings.find((s) => Number(s.id) === Number(id)) || null;
    }
  },

  async getActiveSmtpSetting() {
    if (useInMemory) return inMemorySmtpSettings.find((s) => s.is_active === 1 || s.is_active === true) || null;
    try {
      const [rows] = await dbPool.query(`SELECT * FROM smtp_settings WHERE is_active = 1 LIMIT 1`);
      return rows[0] || null;
    } catch (err) {
      return inMemorySmtpSettings.find((s) => s.is_active === 1 || s.is_active === true) || null;
    }
  },

  async createSmtpSetting(settingData) {
    const isActive = settingData.is_active === true || settingData.is_active === 1 || settingData.is_active === '1';

    if (useInMemory) {
      if (isActive) {
        inMemorySmtpSettings.forEach((s) => s.is_active = 0);
      }
      const newId = inMemorySmtpSettings.length > 0 ? Math.max(...inMemorySmtpSettings.map((s) => s.id)) + 1 : 1;
      const record = {
        id: newId,
        provider: settingData.provider || 'Custom SMTP Server',
        host: settingData.host,
        port: Number(settingData.port || 587),
        username: settingData.username || '',
        password_encrypted: settingData.password_encrypted || '',
        auth_required: settingData.auth_required !== false ? 1 : 0,
        use_tls: settingData.use_tls !== false ? 1 : 0,
        use_ssl: settingData.use_ssl ? 1 : 0,
        sender_email: settingData.sender_email,
        is_active: isActive ? 1 : 0,
        last_tested_at: null,
        last_test_status: 'NOT_TESTED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inMemorySmtpSettings.unshift(record);
      return record;
    }

    try {
      // Single-Active Constraint: Deactivate all others if current configuration is active
      if (isActive) {
        await dbPool.query(`UPDATE smtp_settings SET is_active = 0`);
      }

      const [res] = await dbPool.query(
        `INSERT INTO smtp_settings (provider, host, port, username, password_encrypted, auth_required, use_tls, use_ssl, sender_email, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          settingData.provider || 'Custom SMTP Server',
          settingData.host,
          Number(settingData.port || 587),
          settingData.username || '',
          settingData.password_encrypted || '',
          settingData.auth_required !== false ? 1 : 0,
          settingData.use_tls !== false ? 1 : 0,
          settingData.use_ssl ? 1 : 0,
          settingData.sender_email,
          isActive ? 1 : 0
        ]
      );

      return db.getSmtpSettingById(res.insertId);
    } catch (err) {
      console.error('Error creating SMTP setting:', err);
      throw err;
    }
  },

  async updateSmtpSetting(id, settingData) {
    const isActive = settingData.is_active === true || settingData.is_active === 1 || settingData.is_active === '1';

    if (useInMemory) {
      if (isActive) {
        inMemorySmtpSettings.forEach((s) => {
          if (Number(s.id) !== Number(id)) s.is_active = 0;
        });
      }
      const idx = inMemorySmtpSettings.findIndex((s) => Number(s.id) === Number(id));
      if (idx !== -1) {
        inMemorySmtpSettings[idx] = {
          ...inMemorySmtpSettings[idx],
          ...settingData,
          is_active: settingData.is_active !== undefined ? (isActive ? 1 : 0) : inMemorySmtpSettings[idx].is_active,
          updated_at: new Date().toISOString()
        };
        return inMemorySmtpSettings[idx];
      }
      return null;
    }

    try {
      // Single-Active Constraint: Deactivate all others if updating to active
      if (isActive) {
        await dbPool.query(`UPDATE smtp_settings SET is_active = 0 WHERE id != ?`, [id]);
      }

      const fields = [];
      const params = [];

      if (settingData.provider !== undefined) { fields.push('provider = ?'); params.push(settingData.provider); }
      if (settingData.host !== undefined) { fields.push('host = ?'); params.push(settingData.host); }
      if (settingData.port !== undefined) { fields.push('port = ?'); params.push(Number(settingData.port)); }
      if (settingData.username !== undefined) { fields.push('username = ?'); params.push(settingData.username); }
      if (settingData.password_encrypted !== undefined && settingData.password_encrypted !== '') {
        fields.push('password_encrypted = ?'); params.push(settingData.password_encrypted);
      }
      if (settingData.auth_required !== undefined) { fields.push('auth_required = ?'); params.push(settingData.auth_required ? 1 : 0); }
      if (settingData.use_tls !== undefined) { fields.push('use_tls = ?'); params.push(settingData.use_tls ? 1 : 0); }
      if (settingData.use_ssl !== undefined) { fields.push('use_ssl = ?'); params.push(settingData.use_ssl ? 1 : 0); }
      if (settingData.sender_email !== undefined) { fields.push('sender_email = ?'); params.push(settingData.sender_email); }
      if (settingData.is_active !== undefined) { fields.push('is_active = ?'); params.push(isActive ? 1 : 0); }

      if (fields.length > 0) {
        params.push(id);
        await dbPool.query(`UPDATE smtp_settings SET ${fields.join(', ')} WHERE id = ?`, params);
      }

      return db.getSmtpSettingById(id);
    } catch (err) {
      console.error('Error updating SMTP setting:', err);
      throw err;
    }
  },

  async setActiveSmtpSetting(id, isActive) {
    if (useInMemory) {
      inMemorySmtpSettings.forEach((s) => {
        if (Number(s.id) === Number(id)) {
          s.is_active = isActive ? 1 : 0;
        } else if (isActive) {
          s.is_active = 0;
        }
      });
      return db.getSmtpSettingById(id);
    }

    try {
      if (isActive) {
        await dbPool.query(`UPDATE smtp_settings SET is_active = 0`);
        await dbPool.query(`UPDATE smtp_settings SET is_active = 1 WHERE id = ?`, [id]);
      } else {
        await dbPool.query(`UPDATE smtp_settings SET is_active = 0 WHERE id = ?`, [id]);
      }
      return db.getSmtpSettingById(id);
    } catch (err) {
      console.error('Error setting active SMTP setting:', err);
      throw err;
    }
  },

  async deleteSmtpSetting(id) {
    if (useInMemory) {
      inMemorySmtpSettings = inMemorySmtpSettings.filter((s) => Number(s.id) !== Number(id));
      return true;
    }
    try {
      await dbPool.query(`DELETE FROM smtp_settings WHERE id = ?`, [id]);
      return true;
    } catch (err) {
      console.error('Error deleting SMTP setting:', err);
      throw err;
    }
  },

  async updateSmtpTestStatus(id, testStatus) {
    const timestamp = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    if (useInMemory) {
      const idx = inMemorySmtpSettings.findIndex((s) => Number(s.id) === Number(id));
      if (idx !== -1) {
        inMemorySmtpSettings[idx].last_tested_at = timestamp;
        inMemorySmtpSettings[idx].last_test_status = testStatus;
      }
      return inMemorySmtpSettings[idx] || null;
    }
    try {
      await dbPool.query(`UPDATE smtp_settings SET last_tested_at = ?, last_test_status = ? WHERE id = ?`, [timestamp, testStatus, id]);
      return db.getSmtpSettingById(id);
    } catch (err) {
      console.error('Error updating SMTP test status:', err);
    }
  }
};

module.exports = db;
