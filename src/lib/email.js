import nodemailer from 'nodemailer';
import { query } from '../db/sqlite.js';

const SITE_URL = import.meta.env.SITE_URL || process.env.SITE_URL || 'https://skystates.us';

function getTransporter() {
  const host = import.meta.env.SMTP_HOST || process.env.SMTP_HOST;
  const port = Number(import.meta.env.SMTP_PORT || process.env.SMTP_PORT || 587);
  const user = import.meta.env.SMTP_USER || process.env.SMTP_USER;
  const pass = import.meta.env.SMTP_PASS || process.env.SMTP_PASS;


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
  return import.meta.env.SMTP_FROM || process.env.SMTP_FROM || 'Sky States <support@skystates.us>';

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
    replyTo: import.meta.env.SMTP_REPLY_TO || process.env.SMTP_REPLY_TO || 'support@skystates.us',

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
    replyTo: import.meta.env.SMTP_REPLY_TO || process.env.SMTP_REPLY_TO || 'support@skystates.us',

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

export async function sendConsultationFormEmail({ name, phone, program, query: queryText }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('SMTP not configured — consultation email skipped.');
    return { sent: false, skipped: true, reason: 'smtp_not_configured' };
  }

  const adminEmail = import.meta.env.SMTP_USER || process.env.SMTP_USER || 'support@skystates.us';
  const subject = `New Career Consultation Request: ${name} (${program})`;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 560px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #0369a1; margin-bottom: 16px; border-bottom: 2px solid #f0f2f5; padding-bottom: 8px; font-size: 18px;">New Consultation Request</h2>
      <p style="margin-bottom: 16px; font-size: 13px; color: #475569;">A new free career consultation request has been submitted. Details below:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600; width: 120px;">Name</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0f172a;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Mobile Number</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;"><a href="tel:${phone}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${phone}</a></td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Program</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;"><span style="background-color: #f0f9ff; color: #0369a1; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid #e0f2fe;">${program}</span></td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-weight: 600; vertical-align: top;">Message</td>
          <td style="padding: 10px 0; color: #334155; white-space: pre-wrap; line-height: 1.5;">${queryText || '<em>No message provided</em>'}</td>
        </tr>
      </table>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 12px; text-align: center;">
        Sky States Lead Capture System · skystates.us
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: getFromAddress(),
    to: adminEmail,
    replyTo: adminEmail,
    subject,
    html,
  });

  return { sent: true };
}

export async function sendReviewAdminEmail({ name, email, subject: reviewSubject, message }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('SMTP not configured — review admin email skipped.');
    return { sent: false, skipped: true, reason: 'smtp_not_configured' };
  }

  const adminEmail = import.meta.env.SMTP_USER || process.env.SMTP_USER || 'support@skystates.us';
  const subject = `New Learner Review Submitted: ${name}`;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 560px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-bottom: 16px; border-bottom: 2px solid #f0f2f5; padding-bottom: 8px; font-size: 18px;">New Learner Review</h2>
      <p style="margin-bottom: 16px; font-size: 13px; color: #475569;">A new learner has submitted feedback on the reviews page. Details below:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600; width: 120px;">Name</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0f172a;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Email ID</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;"><a href="mailto:${email}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${email}</a></td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Subject</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600;">${reviewSubject}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-weight: 600; vertical-align: top;">Review</td>
          <td style="padding: 10px 0; color: #334155; white-space: pre-wrap; line-height: 1.5;">${message}</td>
        </tr>
      </table>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 12px; text-align: center;">
        Sky States Lead Capture System · skystates.us
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: getFromAddress(),
    to: adminEmail,
    replyTo: email,
    subject,
    html,
  });

  return { sent: true };
}

export async function sendReviewUserAutoReplyEmail({ name, email }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('SMTP not configured — review auto-reply skipped.');
    return { sent: false, skipped: true, reason: 'smtp_not_configured' };
  }

  const subject = `Thank You for Your Review - Sky States`;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 560px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; background-color: #ffffff;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h2 style="color: #0369a1; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">SKY STATES</h2>
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; font-weight: bold;">Real Learning. Real Career Growth.</span>
      </div>

      <p style="font-size: 14px; color: #334155;">Hi ${name},</p>
      
      <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">
        Thank you for taking the time to share your experience with Sky States.
      </p>

      <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">
        We have successfully received your review, and we truly appreciate your feedback. Every review helps us improve our programs and gives future learners valuable insights from those who have experienced our training firsthand.
      </p>

      <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">
        Your support motivates us to continue delivering quality education, practical learning, and career guidance to aspiring IT professionals.
      </p>

      <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">
        If you ever have questions, need assistance, or would like to share additional feedback, simply reply to this email. Our team is always happy to help.
      </p>

      <p style="font-size: 14px; color: #334155; margin-bottom: 24px;">
        Thank you once again for being a part of the Sky States community.
      </p>

      <p style="font-size: 14px; color: #334155; margin-top: 24px; margin-bottom: 4px; font-weight: 600;">Warm regards,</p>
      <p style="font-size: 14px; color: #0369a1; font-weight: 700; margin: 0;">The Sky States Team</p>
      
      <div style="font-size: 11px; color: #94a3b8; margin-top: 36px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
        Sky States · <a href="https://skystates.us" style="color: #94a3b8; text-decoration: none;">skystates.us</a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    replyTo: import.meta.env.SMTP_REPLY_TO || process.env.SMTP_REPLY_TO || 'support@skystates.us',
    subject,
    html,
  });

  return { sent: true };
}



