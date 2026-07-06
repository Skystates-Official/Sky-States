import nodemailer from 'nodemailer';
import { query } from '../db/sqlite.js';

const SITE_URL = process.env.SITE_URL || 'https://skystates.us';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getFromAddress() {
  return process.env.SMTP_FROM || 'Sky States <support@skystates.us>';
}

async function wasEmailSent(referenceId, emailType) {
  const row = await query.get(
    'SELECT id FROM email_log WHERE reference_id = ? AND email_type = ?',
    [referenceId, emailType]
  );
  return !!row;
}

async function markEmailSent(referenceId, emailType, recipient) {
  await query.run(
    'INSERT OR IGNORE INTO email_log (reference_id, email_type, recipient) VALUES (?, ?, ?)',
    [referenceId, emailType, recipient]
  );
}

export async function sendPaymentConfirmationEmail({
  to,
  customerName,
  courseName,
  amountPaid,
  totalDue,
  orderRef,
}) {
  const referenceId = `payment:${orderRef}:${amountPaid}`;
  if (await wasEmailSent(referenceId, 'payment_confirmation')) {
    return { sent: false, skipped: true, reason: 'already_sent' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn('SMTP not configured — payment confirmation email skipped.');
    return { sent: false, skipped: true, reason: 'smtp_not_configured' };
  }

  const subject = `Sky States — Payment confirmation (${orderRef})`;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 560px;">
      <h2 style="color: #0369a1; margin-bottom: 8px;">Thank you for your payment</h2>
      <p>Hi ${customerName || 'there'},</p>
      <p>We received your payment for <strong>${courseName}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px 0; color: #64748b;">Order reference</td><td style="padding: 8px 0; font-weight: 600;">${orderRef}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Amount paid</td><td style="padding: 8px 0; font-weight: 600;">$${Number(amountPaid).toFixed(2)} USD</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Program total</td><td style="padding: 8px 0;">$${Number(totalDue).toFixed(2)} USD</td></tr>
      </table>
      <p>Your enrollment is being processed. Our team will follow up with next steps shortly.</p>
      <p style="margin-top: 24px;">Questions? Reply to this email or contact us at <a href="mailto:support@skystates.us">support@skystates.us</a>.</p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">Sky States · skystates.us</p>
    </div>
  `;

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    replyTo: process.env.SMTP_REPLY_TO || 'support@skystates.us',
    subject,
    html,
  });

  await markEmailSent(referenceId, 'payment_confirmation', to);
  return { sent: true };
}

export async function sendFreeEnrollmentEmail({ to, customerName, courseName, orderRef }) {
  const referenceId = `free:${orderRef}`;
  if (await wasEmailSent(referenceId, 'payment_confirmation')) {
    return { sent: false, skipped: true };
  }

  const transporter = getTransporter();
  if (!transporter) return { sent: false, skipped: true, reason: 'smtp_not_configured' };

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    replyTo: process.env.SMTP_REPLY_TO || 'support@skystates.us',
    subject: `Sky States — Enrollment confirmed (${orderRef})`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="color:#0369a1;">Enrollment confirmed</h2>
        <p>Hi ${customerName || 'there'},</p>
        <p>Your enrollment for <strong>${courseName}</strong> is confirmed (reference ${orderRef}).</p>
        <p>Our team will contact you with next steps shortly.</p>
        <p>Support: <a href="mailto:support@skystates.us">support@skystates.us</a></p>
      </div>
    `,
  });

  await markEmailSent(referenceId, 'payment_confirmation', to);
  return { sent: true };
}
