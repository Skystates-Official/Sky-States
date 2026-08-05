import { query } from '../../../db/sqlite.js';
import { sendPasswordResetEmail } from '../../../lib/email.js';
import { logActivity } from '../../../db/audit.js';
import crypto from 'crypto';

export const prerender = false;

function getClientIp(request) {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await query.get('SELECT id, username, email FROM users WHERE email = ?', [email]);
    
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      // Token expires in 1 hour
      const expiry = new Date(Date.now() + 3600000).toISOString();

      await query.run('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?', [token, expiry, user.id]);
      
      const sent = await sendPasswordResetEmail(user.email, token);
      
      if (sent) {
        await logActivity(user.id, 'forgot_password', `Password reset requested for email: ${email}`, getClientIp(request));
      } else {
        console.error('Failed to send reset email for', email);
      }
    } else {
       // Do not reveal that the email doesn't exist for security reasons, just log it.
       await logActivity(null, 'forgot_password_invalid', `Password reset requested for unknown email: ${email}`, getClientIp(request));
    }

    return new Response(JSON.stringify({ success: true, message: 'If that email is in our system, we have sent a reset link to it.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred processing your request.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
