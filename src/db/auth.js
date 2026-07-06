import crypto from 'crypto';
import { query } from './sqlite.js';

const SESSION_SECRET = import.meta.env.SESSION_SECRET || process.env.SESSION_SECRET || 'sky_states_default_secret_key_change_me';
const COOKIE_NAME = 'admin_session';

export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  editor: 'Editor',
  super_admin: 'Administrator',
};

export function normalizeRole(role) {
  if (role === 'super_admin') return ROLES.ADMIN;
  return role;
}

export function isFullAdminRole(role) {
  const normalized = normalizeRole(role);
  return normalized === ROLES.ADMIN;
}

export function createSessionToken(username, role) {
  const expiry = Date.now() + 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({
    username,
    role: normalizeRole(role),
    expiry,
  })).toString('base64');

  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('base64url');

  return `${payload}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;

  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (Date.now() > data.expiry) {
      return null;
    }
    data.role = normalizeRole(data.role);
    return data;
  } catch {
    return null;
  }
}

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

export function hasRole(user, ...roles) {
  if (!user) return false;
  const normalized = normalizeRole(user.role);
  return roles.some((role) => normalizeRole(role) === normalized);
}

export function requireAuth(request) {
  const user = getSessionUser(request);
  if (!user) return null;
  return user;
}

export function requireFullAdmin(request) {
  const user = requireAuth(request);
  if (!isFullAdminRole(user?.role)) return null;
  return user;
}

export function requireAdminAccess(request) {
  const user = requireAuth(request);
  if (!hasRole(user, ROLES.ADMIN, ROLES.EDITOR)) return null;
  return user;
}

export async function authenticateUser(username, password) {
  const user = await query.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return null;

  const bcrypt = await import('bcryptjs');
  const valid = bcrypt.default.compareSync(password, user.password_hash);

  if (!valid) return null;
  return {
    username: user.username,
    role: normalizeRole(user.role),
    id: user.id,
  };
}

export async function hashPassword(password) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.hashSync(password, 10);
}
