// utils/email.js
// Sends password reset emails via nodemailer
// Uses Gmail with App Password (secure)

const nodemailer = require('nodemailer');
const logger     = require('./logger');

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    const info = await transporter.sendMail({
      from:    process.env.EMAIL_FROM || 'GreenWallet <noreply@greenwallet.app>',
      to,
      subject,
      html,
    });

    logger.info(`Email sent: ${info.messageId} → ${to}`);
    return true;
  } catch (error) {
    logger.error(`Email failed: ${error.message}`);
    return false;
  }
};

// Password reset email template
const passwordResetEmail = (name, resetUrl) => `
  <div style="font-family:Poppins,sans-serif;max-width:520px;margin:0 auto;background:#f9fbfa;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#2a9d8f,#1a5f57);padding:32px;text-align:center">
      <h1 style="color:white;font-size:1.6rem;margin:0">🌿 GreenWallet</h1>
    </div>
    <div style="padding:32px">
      <h2 style="color:#1a5f57;margin-bottom:12px">Hi ${name},</h2>
      <p style="color:#555;line-height:1.7;margin-bottom:24px">
        We received a request to reset your GreenWallet password.
        Click the button below — this link expires in <strong>10 minutes</strong>.
      </p>
      <div style="text-align:center;margin-bottom:28px">
        <a href="${resetUrl}"
           style="background:linear-gradient(135deg,#2a9d8f,#1a5f57);color:white;
                  padding:14px 32px;border-radius:50px;text-decoration:none;
                  font-weight:700;font-size:1rem;display:inline-block">
          Reset My Password
        </a>
      </div>
      <p style="color:#888;font-size:0.82rem;line-height:1.6">
        If you didn't request this, ignore this email — your password won't change.<br>
        For security, never share this link with anyone.
      </p>
      <hr style="border:none;border-top:1px solid #e8e8e8;margin:24px 0">
      <p style="color:#aaa;font-size:0.75rem;text-align:center">
        © 2025 GreenWallet · Lahore, Pakistan
      </p>
    </div>
  </div>
`;

module.exports = { sendEmail, passwordResetEmail };
