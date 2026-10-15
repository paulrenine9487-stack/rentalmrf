# MCC MRF Innovation Park — End-to-End Portal Workflow Architecture

This document outlines the complete operational, security, and data flow of the **MCC MRF Innovation Park Incubation & Rental Management Portal**.

---

## 📑 Table of Contents
1. [High-Level Architecture Overview](#1-high-level-architecture-overview)
2. [User Personas & Role Matrix](#2-user-personas--role-matrix)
3. [Workflow 1: Incubated Company Onboarding & First-Time Login](#workflow-1-incubated-company-onboarding--first-time-login)
4. [Workflow 2: Monthly Billing & PayU Payment Processing](#workflow-2-monthly-billing--payu-payment-processing)
5. [Workflow 3: Forgot Password & Gmail OTP Recovery](#workflow-3-forgot-password--gmail-otp-recovery)
6. [Workflow 4: Enterprise Admin & Operational Management](#workflow-4-enterprise-admin--operational-management)
7. [Workflow 5: Production Security & Compliance Verification](#workflow-5-production-security--compliance-verification)
8. [Database State Machine & Payment Lifecycle](#8-database-state-machine--payment-lifecycle)

---

## 1. High-Level Architecture Overview

```mermaid
graph TD
    Client["🌐 Frontend Application<br/>(React 19 + Vite SPA)"]
    Gateway["🛡️ Security & Reverse Proxy<br/>(Helmet + CSP + Rate Limiter + Compression)"]
    Server["⚡ Express.js REST API Backend<br/>(Node.js v22)"]
    DB[("🗄️ MySQL Database<br/>(Companies, Invoices, Payments, Users, Audit)")]
    PayU["💳 PayU India Payment Gateway<br/>(Hosted Checkout + S2S API)"]
    SMTP["📧 Nodemailer SMTP Delivery<br/>(Gmail, Office365, Zoho, SendGrid)"]
    HIBP["🔒 Have I Been Pwned API<br/>(k-Anonymity Breach Verification)"]
    Sentry["🚨 Sentry Crash Reporting<br/>(PII-Scrubbed Telemetry)"]

    Client -->|HTTPS / API Requests| Gateway
    Gateway --> Server
    Server --> DB
    Server -->|Create Order & Verify Hash| PayU
    Server -->|Dispatch OTP & Rent Alerts| SMTP
    Server -->|Validate Password Breaches| HIBP
    Server -.->|Report Exceptions| Sentry
    Client -.->|Report Exceptions| Sentry
```

---

## 2. User Personas & Role Matrix

| Role | Access URL | Permissions & Capabilities |
| :--- | :--- | :--- |
| **Incubated Company** | `/login`, `/dashboard` | View incubator space, invoice breakdown, rent payment via PayU, download official GST tax receipts, update account profile. |
| **Enterprise Admin** | `/Novara_admin`, `/admin/dashboard` | Manage incubated companies, oversee payments, manage places/workstations, dispatch email rent alerts, generate reports, configure system settings. |
| **Super Admin** | `/Novara_admin`, `/admin/*` | Full system control, role permissions management, SMTP credential configuration, access control audit logs. |

---

## Workflow 1: Incubated Company Onboarding & First-Time Login

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Enterprise Admin
    participant Server as Backend API
    participant DB as MySQL Database
    participant SMTP as Nodemailer SMTP
    actor Tenant as Incubated Company
    participant Portal as Client Portal

    Admin->>Server: POST /api/companies (Name, Email, Place, Monthly Rate)
    Server->>Server: Generate cryptographically random temporary password
    Server->>DB: INSERT INTO companies & users (must_change_password = 1)
    Server->>SMTP: Dispatch Welcome Email with Temporary Password
    SMTP-->>Tenant: Welcome Email in Gmail Inbox
    
    Tenant->>Portal: Navigate to /login
    Tenant->>Server: POST /api/auth/login (Email + Temporary Password)
    Server->>DB: Verify bcrypt password hash
    Server-->>Portal: JWT Token + { must_change_password: true }
    Portal->>Tenant: Force Redirect to /change-password
    
    Tenant->>Portal: Enters New Password
    Portal->>Server: POST /api/security/check-pwned-password (k-Anonymity SHA-1 prefix)
    Server-->>Portal: Verified: 0 Breaches (HIBP)
    Tenant->>Server: POST /api/auth/change-password
    Server->>DB: Update password_hash & SET must_change_password = 0
    Server-->>Portal: Success Response
    Portal->>Tenant: Redirect to /dashboard (Incubation Workspace)
```

### Steps:
1. **Onboarding**: Admin creates company profile in **Admin > Companies**.
2. **Credential Generation**: Cryptographically secure temporary password (e.g. `Mrf@2026#X7pL`) is generated.
3. **Dispatch**: Notification dispatched to company's registered email.
4. **First Login Guard**: Login response flags `must_change_password: true`.
5. **Breach Check**: Tenant chooses a new password. The portal verifies in real-time that it complies with 5 security rules and does not exist in the 800M+ **Have I Been Pwned** breach database.
6. **Access Granted**: Password hash updated in database, user enters Company Dashboard.

---

## Workflow 2: Monthly Billing & PayU Payment Processing

```mermaid
sequenceDiagram
    autonumber
    actor Tenant as Incubated Company
    participant Portal as Client Portal
    participant Server as Backend API
    participant DB as MySQL Database
    participant PayU as PayU Hosted Gateway

    Tenant->>Portal: Opens /dashboard or /payment
    Portal->>Server: GET /api/invoices?company_id={id}
    Server-->>Portal: Active Invoice (Rent: ₹10,000 + GST 18%: ₹1,800 = ₹11,800)
    Tenant->>Portal: Clicks "Proceed to Pay ₹11,800"
    
    Portal->>Server: POST /api/payments/create-payu-payment
    Server->>Server: Compute SHA-512 Request Hash (key|txnid|amount|productinfo|firstname|email|udf1...|salt)
    Server->>DB: INSERT INTO payments (status = 'PENDING', txnid = 'MRF261015...')
    Server-->>Portal: Return PayU endpoint + parameters + hash
    
    Portal->>PayU: Auto-submit hidden POST form to https://test.payu.in/_payment
    Tenant->>PayU: Selects UPI (GPay/PhonePe) or Credit/Debit Card
    PayU->>Tenant: Completes 3D-Secure Bank Authentication
    
    PayU->>Server: POST /api/payments/payu/success (Webhook callback)
    Server->>Server: Verify Reverse SHA-512 Hash with Merchant Salt
    Server->>DB: UPDATE payments SET status = 'PAID', payu_payment_id = mihpayid
    Server->>DB: UPDATE invoices SET status = 'PAID'
    Server-->>PayU: 302 Redirect to /payment/success?txnid={id}
    PayU->>Portal: Browser navigates to /payment/success
    Portal->>Tenant: Displays Verified Payment Receipt with Print / Download Tax Invoice
```

### Steps:
1. **Invoice Due**: The portal loads the company's active monthly invoice.
2. **Order Initiation**: Server creates a pending transaction record with a unique transaction ID (`txnid`) and calculates the official PayU SHA-512 hash.
3. **Hosted Gateway**: User seamlessly transitions to PayU's hosted checkout to complete payment using UPI or Cards.
4. **Reverse Hash Verification**: PayU returns transaction parameters to `/api/payments/payu/success`. The backend verifies the cryptographic reverse hash using the private merchant salt.
5. **State Finalization**: Both payment record and invoice are marked as `PAID`.
6. **Receipt**: Tenant views and prints their official GST invoice receipt.

---

## Workflow 3: Forgot Password & Gmail OTP Recovery

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Admin
    participant Modal as Forgot Password Modal
    participant Server as Backend API
    participant SMTP as Nodemailer SMTP
    participant DB as MySQL Database

    User->>Modal: Clicks "Forgot Password?" & enters Gmail
    Modal->>Server: POST /api/auth/forgot-password/send-otp
    Server->>Server: Generate cryptographically secure 6-digit OTP (TTL: 15 mins)
    Server->>SMTP: Send OTP verification email
    SMTP-->>User: Verification code delivered to Gmail inbox
    Server-->>Modal: { success: true, email: targetEmail }

    User->>Modal: Enters 6-digit OTP & new password
    Modal->>Server: POST /api/security/check-pwned-password (Check breaches)
    Server-->>Modal: { isPwned: false }
    Modal->>Server: POST /api/auth/forgot-password/verify-otp
    Server->>Server: Validate OTP match & check TTL expiration
    Server->>DB: Hash new password & update user record
    Server-->>Modal: { success: true, message: "Password updated successfully" }
    Modal->>User: Success confirmation & redirects to Login
```

---

## Workflow 4: Enterprise Admin & Operational Management

```mermaid
graph LR
    subgraph AdminActions["Enterprise Admin Actions"]
        A1["🏢 Company Management<br/>(Add, Edit, View, Status Toggle)"]
        A2["💳 Payments Management<br/>(Live Monitor, Manual Approval, Receipt Export)"]
        A3["📍 Places & Cabins<br/>(Seat Allocation, Occupancy Status)"]
        A4["📊 Reports & Analytics<br/>(Monthly Revenue, Collection Trends, CSV/PDF)"]
        A5["⚙️ System Settings<br/>(SMTP Config, PayU Gateway, Security Suite)"]
        A6["📜 Audit Logs<br/>(Immutable Administrative Activity Records)"]
    end

    subgraph BackendServices["Backend Integration"]
        B1["MySQL Relational DB"]
        B2["Nodemailer Email Service"]
        B3["PayU India Gateway"]
        B4["Security & Audit Engine"]
    end

    A1 --> B1
    A1 --> B2
    A2 --> B1
    A2 --> B3
    A3 --> B1
    A4 --> B1
    A5 --> B2
    A5 --> B3
    A6 --> B1
```

---

## Workflow 5: Production Security & Compliance Verification

```mermaid
flowchart TD
    Req["Incoming Client Request"] --> RL{"Rate Limiter<br/>(600 req/15min)"}
    RL -- Exceeded --> 429["HTTP 429 Too Many Requests"]
    RL -- Allowed --> SecH["Security Headers Middleware<br/>(Helmet + CSP + HSTS + COOP + nosniff)"]
    SecH --> Comp["Compression Middleware<br/>(Gzip & Brotli)"]
    Comp --> Auth{"Is Route Protected?"}
    Auth -- Public (Health/Login) --> Handler["Execute Route Handler"]
    Auth -- Protected --> JWT{"Valid Bearer JWT?"}
    JWT -- No / Invalid --> 401["HTTP 401 Unauthorized"]
    JWT -- Valid --> RBAC{"User has Required Permission?"}
    RBAC -- Denied --> 403["HTTP 403 Forbidden"]
    RBAC -- Permitted --> Handler
    Handler --> DBQuery["Execute Database Query"]
    DBQuery --> Response["Dispatch JSON / Static Asset"]
    Handler -. Error .-> Sentry["Sentry Error Capture<br/>(Scrub Passwords, Tokens, Cards)"]
```

---

## 8. Database State Machine & Payment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> INVOICE_GENERATED : Monthly Billing Cron
    INVOICE_GENERATED --> UNPAID : Invoice Issued
    UNPAID --> PAYMENT_INITIATED : Tenant clicks "Proceed to Pay"
    
    PAYMENT_INITIATED --> PENDING : PayU Txn Record Created
    PENDING --> SUCCESS : PayU Callback & Reverse Hash Match
    PENDING --> FAILED : Payment Cancelled / Tampered Hash / Bank Failure
    
    SUCCESS --> INVOICE_PAID : Update Invoice Status to PAID
    INVOICE_PAID --> RECEIPT_ISSUED : Generate Official Tax Invoice
    
    FAILED --> UNPAID : Allow Tenant to Retry Payment
    RECEIPT_ISSUED --> [*]
```

---

## 🛠️ Summary of Key Endpoints & Route Handlers

| Endpoint | Method | Role Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public (Rate Limited) | User and Company authentication gateway. |
| `/api/auth/forgot-password/send-otp` | `POST` | Public (Rate Limited) | Sends 6-digit verification code to registered email. |
| `/api/auth/forgot-password/verify-otp` | `POST` | Public (Rate Limited) | Verifies OTP and resets password with HIBP check. |
| `/api/auth/change-password` | `POST` | Authenticated | Updates temporary password to permanent password. |
| `/api/payments/create-payu-payment` | `POST` | Authenticated | Generates SHA-512 PayU checkout session. |
| `/api/payments/payu/success` | `POST` | Public (PayU Callback)| Validates reverse hash and marks invoice as PAID. |
| `/api/payments/payu/failure` | `POST` | Public (PayU Callback)| Handles bank cancellation and failed payments. |
| `/api/security/headers-audit` | `GET` | Public / Admin | Returns live SSL Labs and Security Headers audit. |
| `/api/security/check-pwned-password` | `POST` | Public (Rate Limited) | Checks password against 800M+ Have I Been Pwned breaches. |
| `/api/security/virustotal/scan-url` | `POST` | Admin | Real-time threat scanning of URLs across 70+ engines. |
| `/api/analytics/web-vitals` | `POST` | Public (Beacon) | Real-user Core Web Vitals telemetry collector. |
| `/api/health` | `GET` | Public (Unthrottled) | Pingdom 24/7 server and database health probe. |
