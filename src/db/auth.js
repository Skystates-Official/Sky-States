import crypto from 'crypto';
import { query } from './sqlite.js';

const SESSION_SECRET = process.env.SESSION_SECRET || 'sky_states_default_secret_key_change_me';
const COOKIE_NAME = 'admin_session';

/**
 * Signs a session payload (username and role)
 */
export function createSessionToken(username, role) {
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = Buffer.from(JSON.stringify({ username, role, expiry })).toString('base64');
  
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('base64url');
  
  return `${payload}.${signature}`;
}

/**
 * Verifies a session token string
 */
export function verifySessionToken(token) {
  if (!token) return null;
  
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  
  const [payload, signature] = parts;
  
  // Verify Signature
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('base64url');
  
  if (signature !== expectedSignature) {
    return null;
  }
  
  // Decode & Check Expiry
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (Date.now() > data.expiry) {
      return null; // Expired
    }
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Checks request cookies and validates session
 */
export function getSessionUser(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const parts = cookie.trim().split('=');
    if (parts[0] === COOKIE_NAME) {
      const token = decodeURIComponent(parts.slice(1).join('='));
      return verifySessionToken(token);
    }
  }
  return null;
}

/**
 * Validates credentials against SQLite database
 */
export async function authenticateUser(username, password) {
  const user = await query.get("SELECT * FROM users WHERE username = ?", [username]);
  if (!user) return null;
  
  // Dynamic import of bcryptjs since it was installed as a runtime dependency
  const bcrypt = await import('bcryptjs');
  const valid = bcrypt.default.compareSync(password, user.password_hash);
  
  if (!valid) return null;
  return { username: user.username, role: user.role };
}
