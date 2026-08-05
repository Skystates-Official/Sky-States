import { query } from '../../../db/sqlite.js';
import { hashPassword } from '../../../db/auth.js';
import { logActivity } from '../../../db/audit.js';

export const prerender = false;

function getClientIp(request) {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return new Response(JSON.stringify({ error: 'Token and new password are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters long.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await query.get('SELECT id, username, reset_token_expiry FROM users WHERE reset_token = ?', [token]);
    const now = new Date();

    if (!user || !user.reset_token_expiry || new Date(user.reset_token_expiry) < now) {
      return new Response(JSON.stringify({ error: 'Invalid or expired password reset token.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const passwordHash = await hashPassword(password);
    
    await query.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?', [passwordHash, user.id]);
    
    await logActivity(user.id, 'reset_password', 'User successfully reset their password', getClientIp(request));

    return new Response(JSON.stringify({ success: true, message: 'Password has been reset successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred during password reset.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
