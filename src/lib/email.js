import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.NEXT_PUBLIC_SMTP_HOST;
  const port = process.env.NEXT_PUBLIC_SMTP_PORT || 587;
  const user = process.env.NEXT_PUBLIC_SMTP_USER;
  const pass = process.env.NEXT_PUBLIC_SMTP_PASSWORD;
  if (!host || !user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: port === '465',
    auth: { user, pass },
  });
}

/**
 * Send OTP email for verification
 * @param {string} to - Email address
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<boolean>} - true if sent, false otherwise
 */
export async function sendOtpEmail(to, otp) {
  const transporter = getTransporter();
  const from = process.env.NEXT_PUBLIC_FROM_EMAIL || process.env.NEXT_PUBLIC_SMTP_USER || 'codeshorts007@gmail.com';
  const subject = 'Your ConsentFlow verification code';
  const html = `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Verify your email</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">${otp}</p>
      <p style="color: #6b7280;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
  if (!transporter) {
    console.log('[Email] SMTP not configured. OTP for', to, ':', otp);
    return true;
  }
  try {
    await transporter.sendMail({ from, to, subject, html });
    return true;
  } catch (err) {
    console.error('[Email] Failed to send OTP:', err);
    return false;
  }
}

/**
 * Send password reset email with link
 * @param {string} to - Email address
 * @param {string} resetLink - Full URL to reset password page with token
 * @returns {Promise<boolean>}
 */
export async function sendResetPasswordEmail(to, resetLink) {
  const transporter = getTransporter();
  const from = process.env.NEXT_PUBLIC_FROM_EMAIL || process.env.NEXT_PUBLIC_SMTP_USER || 'codeshorts007@gmail.com';
  const subject = 'Reset your ConsentFlow password';
  const html = `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Reset your password</h2>
      <p>Click the link below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${resetLink}" style="color: #4f46e5;">Reset password</a></p>
      <p style="color: #6b7280;">If you didn't request this, you can ignore this email.</p>
    </div>
  `;
  if (!transporter) {
    console.log('[Email] SMTP not configured. Reset link for', to, ':', resetLink);
    return true;
  }
  try {
    await transporter.sendMail({ from, to, subject, html });
    return true;
  } catch (err) {
    console.error('[Email] Failed to send reset email:', err);
    return false;
  }
}
