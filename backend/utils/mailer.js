// utils/mailer.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure .env is loaded even if this module is imported before index.js config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Support both SMTP_* and GMAIL_* env names (project currently uses GMAIL_*)
const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
export const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
export const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
const appName = process.env.APP_NAME || 'GreenHarvest';
const fromEmail = process.env.EMAIL_FROM || smtpUser;

if (!smtpUser || !smtpPass) {
  console.warn('SMTP credentials not set. Emails will be logged instead of sent.');
}

let transporter = null;
if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    console.log('[DEV] Email (not sent):', { to, subject });
    console.log(html || text);
    return { mocked: true };
  }
  const info = await transporter.sendMail({
    from: `${appName} <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  });
  return info;
}

export function buildVerificationEmail({ name, email, token, type }) {
  // The email link should hit the backend verify endpoint, which will then redirect to frontend success page
  const verifyUrl = `${backendUrl}/api/users/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const displayName = name || email;
  const roleCopy = type === 'farmer' ? 'as a farmer' : 'as a customer';
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
      <h2>Verify your email</h2>
      <p>Hi ${displayName},</p>
      <p>Thanks for signing up ${roleCopy} at ${appName}. Please verify your email address by clicking the button below.</p>
      <p style="margin:24px 0">
        <a href="${verifyUrl}" style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Verify Email</a>
      </p>
      <p>Or copy and paste this link into your browser:<br/>
        <a href="${verifyUrl}">${verifyUrl}</a>
      </p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn’t create this account, you can ignore this email.</p>
      <hr/>
      <p style="color:#666">${appName}</p>
    </div>
  `;
  const subject = 'Verify your email address';
  const text = `Hi ${displayName}, Verify your email by visiting: ${verifyUrl}`;
  return { subject, html, text };
}

export function buildPasswordOtpEmail({ name, email, otp }) {
  const displayName = name || email;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
      <h2>Password Reset Code</h2>
      <p>Hi ${displayName},</p>
      <p>Use the following one-time code to reset your ${appName} password:</p>
      <div style="font-size:28px;letter-spacing:4px;margin:16px 0;padding:12px 16px;border:1px dashed #999;border-radius:8px;display:inline-block;background:#f8fafc">${otp}</div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn’t request a password reset, you can safely ignore this email.</p>
      <hr/>
      <p style="color:#666">${appName}</p>
    </div>
  `;
  const subject = 'Your password reset code';
  const text = `Your ${appName} password reset code is: ${otp}. It expires in 10 minutes.`;
  return { subject, html, text };
}
