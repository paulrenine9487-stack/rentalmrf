const nodemailer = require('nodemailer');
const db = require('../db');
const { decryptSmtpPassword } = require('../utils/cryptoUtil');

/**
 * Dynamically resolves SMTP Transporter & From Email (DB Active Setting vs .env Fallback)
 * @param {Object} [settingOverride] - Optional setting object override
 * @param {string} [overridePassword] - Optional unencrypted password override for testing
 * @returns {Promise<{ transporter: Object, fromHeader: string, source: string, settingId: number|null }>}
 */
async function resolveTransporter(settingOverride = null, overridePassword = null) {
  let setting = settingOverride;

  if (!setting) {
    setting = await db.getActiveSmtpSetting();
  }

  // 1. DYNAMIC MYSQL ACTIVE CONFIGURATION
  if (setting && setting.host) {
    const port = Number(setting.port || 587);
    const useSsl = Boolean(setting.use_ssl || port === 465);
    const useTls = Boolean(setting.use_tls || port === 587);

    const password = overridePassword !== null && overridePassword !== undefined
      ? overridePassword
      : decryptSmtpPassword(setting.password_encrypted);

    const authReq = setting.auth_required !== 0 && setting.auth_required !== false;

    const transportOptions = {
      host: setting.host,
      port: port,
      secure: useSsl,
      requireTLS: useTls,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      }
    };

    if (authReq && setting.username) {
      transportOptions.auth = {
        user: setting.username,
        pass: password || ''
      };
    }

    const senderEmail = setting.sender_email || process.env.DEFAULT_FROM_EMAIL || 'notifications@mccmrfip.com';
    const fromHeader = `MCC MRF Innovation Park <${senderEmail}>`;

    return {
      transporter: nodemailer.createTransport(transportOptions),
      fromHeader: fromHeader,
      source: 'DATABASE_ACTIVE',
      settingId: setting.id || null,
      setting: setting
    };
  }

  // 2. ENVIRONMENT VARIABLES FALLBACK
  console.log('[EMAIL SERVICE] No active database SMTP config found. Falling back to environment defaults.');
  const fallbackHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const fallbackPort = Number(process.env.SMTP_PORT || 587);
  const fallbackFrom = process.env.DEFAULT_FROM_EMAIL || 'notifications@mccmrfip.com';

  const fallbackTransportOptions = {
    host: fallbackHost,
    port: fallbackPort,
    secure: fallbackPort === 465,
    requireTLS: fallbackPort === 587,
    connectionTimeout: 10000,
    tls: { rejectUnauthorized: false }
  };

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    fallbackTransportOptions.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    };
  }

  return {
    transporter: nodemailer.createTransport(fallbackTransportOptions),
    fromHeader: `MCC MRF Innovation Park <${fallbackFrom}>`,
    source: 'ENVIRONMENT_FALLBACK',
    settingId: null,
    setting: null
  };
}

/**
 * Diagnostic Test Connection Function with Structured Diagnostics
 * Returns: { diagnosticCode: 'Success'|'Auth Failure'|'Network Timeout', message: string, details?: string }
 */
async function testSmtpConnection(setting, testEmail, overridePassword = null) {
  if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    return {
      success: false,
      diagnosticCode: 'Invalid Input',
      message: 'Please provide a valid test email address.'
    };
  }

  try {
    const { transporter, fromHeader } = await resolveTransporter(setting, overridePassword);

    // 1. Verify Connection (10-second timeout)
    await transporter.verify();

    // 2. Send Test HTML Email
    const mailOptions = {
      from: fromHeader,
      to: testEmail,
      subject: 'MCC MRF Innovation Park - SMTP Connection Diagnostics Test',
      text: 'SMTP configuration connection test completed successfully.\n\nThis is an automated test email sent from MCC MRF Innovation Park Super Admin Portal.',
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #8B0000; padding: 18px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">MCC MRF Innovation Park</h2>
          </div>
          <div style="padding: 24px; color: #1F2937;">
            <h3 style="color: #16A34A; margin-top: 0; display: flex; align-items: center; gap: 8px;">
              ✓ Diagnostic Connection Test Passed
            </h3>
            <p>Your SMTP mail configuration is reachable and authenticated successfully.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #F8FAFC; border-radius: 8px;">
              <tr>
                <td style="padding: 10px 14px; font-weight: bold; color: #64748B; font-size: 13px;">Host:</td>
                <td style="padding: 10px 14px; font-weight: 600; font-size: 13px;">${setting?.host || process.env.SMTP_HOST}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: bold; color: #64748B; font-size: 13px;">Port:</td>
                <td style="padding: 10px 14px; font-weight: 600; font-size: 13px;">${setting?.port || 587}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: bold; color: #64748B; font-size: 13px;">Sender Email:</td>
                <td style="padding: 10px 14px; font-weight: 600; font-size: 13px;">${fromHeader}</td>
              </tr>
            </table>
            <p style="font-size: 12px; color: #64748B; margin-top: 20px;">Test timestamp: ${new Date().toLocaleString('en-GB')}</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP DIAGNOSTIC TEST SUCCESS] Delivered to ${testEmail} | ID: ${info.messageId}`);

    return {
      success: true,
      diagnosticCode: 'Success',
      message: 'Test email sent successfully.',
      messageId: info.messageId
    };
  } catch (err) {
    console.error('[SMTP DIAGNOSTIC TEST FAILURE]', err.code, err.message);

    const msgLower = (err.message || '').toLowerCase();
    const codeLower = (err.code || '').toLowerCase();

    if (codeLower.includes('auth') || msgLower.includes('535') || msgLower.includes('authentication') || msgLower.includes('invalid login')) {
      return {
        success: false,
        diagnosticCode: 'Auth Failure',
        message: 'Username/Password incorrect or App Password required.'
      };
    }

    if (codeLower.includes('timeout') || codeLower.includes('econnrefused') || codeLower.includes('enotfound') || msgLower.includes('connect')) {
      return {
        success: false,
        diagnosticCode: 'Network Timeout',
        message: 'Connection refused/unreachable on host/port.'
      };
    }

    return {
      success: false,
      diagnosticCode: 'Auth Failure',
      message: 'SMTP connection or authentication failed. Please verify credentials and security settings.'
    };
  }
}

/**
 * 1. Send Invitation Email
 */
async function sendInvitationEmail(recipientEmail, inviteUrl, expiresAt) {
  try {
    const { transporter, fromHeader } = await resolveTransporter();

    const mailOptions = {
      from: fromHeader,
      to: recipientEmail,
      subject: 'Invitation to Join MCC MRF Innovation Park Portal',
      text: `You have been invited to join the MCC MRF Innovation Park portal.\n\nPlease complete your registration here: ${inviteUrl}\n\nThis invitation link expires on ${expiresAt}.`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #8B0000; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #ffffff; margin: 0;">MCC MRF Innovation Park</h2>
          </div>
          <div style="padding: 24px; color: #1F2937;">
            <h3 style="color: #8B0000; margin-top: 0;">Incubation Portal Invitation</h3>
            <p>You have been invited to register your company workspace in the MCC MRF Innovation Park portal.</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${inviteUrl}" style="background-color: #8B0000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept Invitation & Setup Account</a>
            </div>
            <p style="font-size: 13px; color: #64748B;">This invitation link will expire on <strong>${expiresAt}</strong>.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL SERVICE] Invitation email failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 2. Send Password Reset OTP
 */
async function sendPasswordResetOtp(recipientEmail, otpCode) {
  try {
    const { transporter, fromHeader } = await resolveTransporter();

    const mailOptions = {
      from: fromHeader,
      to: recipientEmail,
      subject: 'Password Reset Verification Code - MCC MRF Innovation Park',
      text: `Your password reset OTP verification code is: ${otpCode}. It is valid for 15 minutes.`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #8B0000; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #ffffff; margin: 0;">MCC MRF Innovation Park</h2>
          </div>
          <div style="padding: 24px; color: #1F2937;">
            <h3 style="color: #8B0000; margin-top: 0;">Password Reset Request</h3>
            <p>Use the OTP code below to reset your account password:</p>
            <div style="background-color: #F8FAFC; border: 1px dashed #8B0000; text-align: center; padding: 16px; margin: 20px 0; border-radius: 8px;">
              <span style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #8B0000;">${otpCode}</span>
            </div>
            <p style="font-size: 13px; color: #64748B;">This code is valid for 15 minutes. Do not share this OTP with anyone.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL SERVICE] Password reset OTP failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Send Email with Attachments
 */
async function sendEmailWithAttachments(recipientEmail, subject, body, attachments = []) {
  try {
    const { transporter, fromHeader } = await resolveTransporter();

    const mailOptions = {
      from: fromHeader,
      to: recipientEmail,
      subject: subject,
      text: body.replace(/<[^>]*>?/gm, ''),
      html: `<div style="font-family: Inter, Arial, sans-serif; padding: 20px;">${body}</div>`,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL SERVICE] Email with attachments failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Send Company Credential Email (Strictly Login Credentials ONLY)
 * @param {Object} params
 * @param {string} params.recipientEmail
 * @param {string} params.temporaryPassword
 * @param {string} [params.loginUrl]
 */
async function sendCompanyCredentialsEmail({ recipientEmail, temporaryPassword, loginUrl }) {
  const targetLoginUrl = loginUrl || process.env.COMPANY_LOGIN_URL || process.env.FRONTEND_URL || 'http://localhost:5173/login';
  const subject = 'Your Company Portal Login Credentials';

  try {
    const { transporter, fromHeader } = await resolveTransporter();

    const mailOptions = {
      from: fromHeader,
      to: recipientEmail,
      subject: subject,
      text: `MCC MRF Innovation Park\n\nYour Company Portal Login Credentials\n\nYour company portal account has been created successfully.\n\nLogin Email:\n${recipientEmail}\n\nTemporary Password:\n${temporaryPassword}\n\nLogin Portal:\n${targetLoginUrl}\n\nIMPORTANT:\nYou will be required to change your temporary password after your first login.\n\nFor security reasons, please do not share these credentials with anyone.\n\nRegards,\nMCC MRF Innovation Park`,
      html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF; color: #1E293B;">
          <div style="background-color: #8B0000; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">MCC MRF Innovation Park</h1>
          </div>
          <div style="padding: 28px 20px; background-color: #FFFFFF;">
            <h2 style="color: #8B0000; margin-top: 0; font-size: 18px; font-weight: 600;">Your Company Portal Login Credentials</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">Your company portal account has been created successfully.</p>
            
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #8B0000; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <div style="margin-bottom: 14px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px;">Login Email</div>
                <div style="font-size: 16px; font-weight: 600; color: #0F172A; margin-top: 2px;">${recipientEmail}</div>
              </div>
              <div>
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px;">Temporary Password</div>
                <div style="font-size: 18px; font-weight: 700; font-family: monospace; color: #8B0000; letter-spacing: 1px; margin-top: 2px;">${temporaryPassword}</div>
              </div>
            </div>

            <div style="text-align: center; margin: 32px 0 24px 0;">
              <a href="${targetLoginUrl}" style="background-color: #8B0000; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(139, 0, 0, 0.2);">Login to Company Portal</a>
            </div>

            <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 14px; margin-top: 24px;">
              <p style="margin: 0; font-size: 13px; color: #991B1B; font-weight: 600;">
                IMPORTANT: You will be required to change your temporary password after your first login.
              </p>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #B91C1C;">
                For security reasons, please do not share these credentials with anyone.
              </p>
            </div>
          </div>
          <div style="border-top: 1px solid #E2E8F0; padding-top: 18px; font-size: 13px; color: #64748B; text-align: center;">
            Regards,<br />
            <strong>MCC MRF Innovation Park</strong>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    await db.logEmail({
      recipientEmail,
      emailType: 'COMPANY_CREDENTIALS',
      subject,
      status: 'SENT'
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL SERVICE] Credential email delivery failed:', err.message);
    await db.logEmail({
      recipientEmail,
      emailType: 'COMPANY_CREDENTIALS',
      subject,
      status: 'FAILED',
      failureReason: err.message
    });
    return { success: false, error: err.message };
  }
}

/**
 * Sends an urgent Rent Overdue Payment Alert email to a company
 */
async function sendRentOverdueAlertEmail({ recipientEmail, companyName, overdueMonths, totalOverdueAmount, dueDate }) {
  try {
    const { transporter, fromHeader } = await resolveTransporter();
    const monthsText = overdueMonths || 'Incubation Workspace Monthly Rent';
    
    // Calculate GST (18%) breakdown if total amount provided
    const totalNum = Number(totalOverdueAmount || 10000);
    const baseRentAmount = Math.round(totalNum / 1.18);
    const gstAmount = totalNum - baseRentAmount;
    const amountText = `₹${totalNum.toLocaleString()}`;
    
    const subject = `Official Notice: Workspace Incubation Rent Payment Reminder - ${companyName || 'MCC MRF Innovation Park'}`;

    const mailOptions = {
      from: fromHeader,
      to: recipientEmail,
      subject: subject,
      text: `MCC MRF INNOVATION PARK\nINCUBATION WORKSPACE MANAGEMENT\n\nOFFICIAL RENT PAYMENT NOTICE\n\nDear Management Team of ${companyName || 'Valued Incubate'},\n\nThis is an official administrative notice regarding your monthly workspace incubation rent payment at MCC MRF Innovation Park.\n\nIncubate Company: ${companyName || 'Incubated Venture'}\nBilling Period: ${monthsText}\nMonthly Rent: ₹${baseRentAmount.toLocaleString()}\nGST (18%): ₹${gstAmount.toLocaleString()}\nTotal Amount Payable: ${amountText}\n\nPlease clear your workspace rent payment by logging into your portal:\nhttp://localhost:5173/login\n\nRegards,\nMCC MRF Innovation Park - Finance & Accounts Team\nMadras Christian College Campus, East Tambaram, Chennai - 600059`,
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 0; background-color: #F8FAFC; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <!-- Top Brand Header -->
          <div style="background: linear-gradient(135deg, #8B0000 0%, #5A0000 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #D97706;">
            <h1 style="color: #FFFFFF; margin: 0; font-family: Georgia, serif; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">MCC MRF INNOVATION PARK</h1>
            <div style="color: #FDE68A; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px;">INCUBATION WORKSPACE MANAGEMENT</div>
          </div>

          <!-- Email Body Content -->
          <div style="padding: 32px 28px; background-color: #FFFFFF;">
            <div style="display: inline-block; background-color: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
              OFFICIAL RENT PAYMENT NOTICE
            </div>

            <h2 style="color: #1E293B; margin-top: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Incubation Rent Payment Reminder</h2>
            
            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
              Dear Management Team of <strong>${companyName || 'Valued Incubate'}</strong>,
            </p>

            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
              This is an official administrative notice regarding your monthly workspace incubation rent payment at <strong>MCC MRF Innovation Park</strong>. Below are your current account and rent payment details:
            </p>

            <!-- Payment Details Box -->
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #8B0000; border-radius: 8px; padding: 22px; margin-bottom: 28px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 45%;">Incubate Company:</td>
                  <td style="padding: 6px 0; color: #0F172A; font-weight: 700; text-align: right;">${companyName || 'Incubated Venture'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Billing Period / Month(s):</td>
                  <td style="padding: 6px 0; color: #8B0000; font-weight: 700; text-align: right;">${monthsText}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Monthly Rent Rate:</td>
                  <td style="padding: 6px 0; color: #0F172A; font-weight: 700; text-align: right;">₹${baseRentAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748B; font-weight: 600;">GST (18%):</td>
                  <td style="padding: 6px 0; color: #0F172A; font-weight: 700; text-align: right;">₹${gstAmount.toLocaleString()}</td>
                </tr>
                <tr style="border-top: 1px solid #CBD5E1;">
                  <td style="padding: 12px 0 6px 0; color: #0F172A; font-weight: 800; font-size: 15px;">Total Rent Payable:</td>
                  <td style="padding: 12px 0 6px 0; color: #8B0000; font-weight: 900; font-size: 20px; text-align: right;">${amountText}</td>
                </tr>
              </table>
            </div>

            <!-- Direct Payment CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="http://localhost:5173/login" style="background: linear-gradient(135deg, #8B0000 0%, #5A0000 100%); color: #FFFFFF; padding: 15px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(139, 0, 0, 0.3); text-transform: uppercase; letter-spacing: 0.5px;">Proceed to Pay Workspace Rent</a>
            </div>

            <!-- Notice Footer Note -->
            <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 16px; margin-top: 24px;">
              <p style="margin: 0; font-size: 12.5px; color: #92400E; font-weight: 600; line-height: 1.5;">
                📌 Note: Please settle your workspace rent payment promptly to avoid account suspension. If you have already completed this payment, please disregard this notice.
              </p>
            </div>
          </div>

          <!-- Professional Footer -->
          <div style="background-color: #0F172A; color: #94A3B8; padding: 24px 28px; font-size: 12px; text-align: center; line-height: 1.6;">
            <strong style="color: #FFFFFF; font-size: 13px;">MCC MRF Innovation Park - Finance & Accounts Department</strong><br />
            Madras Christian College Campus, East Tambaram, Chennai - 600059<br />
            Contact: accounts@mccmrfip.com | Web: <a href="http://localhost:5173" style="color: #38BDF8; text-decoration: none;">mccmrfip.com</a>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    await db.logEmail({
      recipientEmail,
      emailType: 'RENT_OVERDUE_ALERT',
      subject,
      status: 'SENT'
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL SERVICE] Rent overdue alert email delivery failed:', err.message);
    await db.logEmail({
      recipientEmail,
      emailType: 'RENT_OVERDUE_ALERT',
      subject: `Official Notice: Workspace Incubation Rent Payment Reminder - ${companyName}`,
      status: 'FAILED',
      failureReason: err.message
    });
    return { success: false, error: err.message };
  }
}

module.exports = {
  resolveTransporter,
  testSmtpConnection,
  sendInvitationEmail,
  sendPasswordResetOtp,
  sendEmailWithAttachments,
  sendCompanyCredentialsEmail,
  sendRentOverdueAlertEmail
};

