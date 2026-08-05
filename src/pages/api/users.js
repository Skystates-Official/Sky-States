import { query } from '../../db/sqlite.js';
import {
  requireFullAdmin,
  hashPassword,
  ROLES,
  ROLE_LABELS,
  normalizeRole,
} from '../../db/auth.js';
import { logActivity } from '../../db/audit.js';

export const prerender = false;

const ALLOWED_ROLES = [ROLES.ADMIN, ROLES.EDITOR, ROLES.WRITER, ROLES.SEO];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getClientIp(request) {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
}

function sanitizeUser(row) {
  const role = normalizeRole(row.role);
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role,
    roleLabel: ROLE_LABELS[role] || role,
    created_at: row.created_at,
  };
}

export async function GET({ request }) {
  const actor = requireFullAdmin(request);
  if (!actor) {
    return json({ error: 'Administrator access required.' }, 403);
  }

  try {
    const users = await query.all(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at ASC'
    );
    return json(users.map(sanitizeUser));
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function POST({ request }) {
  const actor = requireFullAdmin(request);
  if (!actor) {
    return json({ error: 'Administrator access required.' }, 403);
  }

  try {
    const body = await request.json();
    const username = (body.username || '').trim().toLowerCase();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const role = normalizeRole(body.role || ROLES.EDITOR);

    if (!username || !password) {
      return json({ error: 'Username and password are required.' }, 400);
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return json({ error: 'Invalid role selected.' }, 400);
    }

    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, 400);
    }

    const existing = await query.get('SELECT id FROM users WHERE username = ? OR (email = ? AND email != "")', [username, email]);
    if (existing) {
      return json({ error: 'Username or email already exists.' }, 409);
    }

    const passwordHash = await hashPassword(password);
    const result = await query.run(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email || null, passwordHash, role]
    );

    const created = await query.get(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [result.id]
    );

    await logActivity(actor.id, 'create_user', `Admin created user: ${username} (${role})`, getClientIp(request));

    return json(sanitizeUser(created), 201);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function PUT({ request }) {
  const actor = requireFullAdmin(request);
  if (!actor) {
    return json({ error: 'Administrator access required.' }, 403);
  }

  try {
    const body = await request.json();
    const userId = Number(body.id);

    if (!userId) {
      return json({ error: 'User id is required.' }, 400);
    }

    const existing = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!existing) {
      return json({ error: 'User not found.' }, 404);
    }

    const username = body.username ? body.username.trim().toLowerCase() : existing.username;
    const email = body.email !== undefined ? body.email.trim().toLowerCase() : existing.email;
    const role = body.role ? normalizeRole(body.role) : normalizeRole(existing.role);

    if (!ALLOWED_ROLES.includes(role)) {
      return json({ error: 'Invalid role selected.' }, 400);
    }

    if (username !== existing.username || (email && email !== existing.email)) {
      const duplicate = await query.get(
        'SELECT id FROM users WHERE (username = ? OR (email = ? AND email != "")) AND id != ?',
        [username, email, userId]
      );
      if (duplicate) {
        return json({ error: 'Username or email already exists.' }, 409);
      }
    }

    if (body.password) {
      if (body.password.length < 8) {
        return json({ error: 'Password must be at least 8 characters.' }, 400);
      }
      const passwordHash = await hashPassword(body.password);
      await query.run(
        'UPDATE users SET username = ?, email = ?, password_hash = ?, role = ? WHERE id = ?',
        [username, email || null, passwordHash, role, userId]
      );
    } else {
      await query.run(
        'UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?',
        [username, email || null, role, userId]
      );
    }

    const updated = await query.get(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    await logActivity(actor.id, 'update_user', `Admin updated user: ${username}`, getClientIp(request));

    return json(sanitizeUser(updated));
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function DELETE({ request }) {
  const actor = requireFullAdmin(request);
  if (!actor) {
    return json({ error: 'Administrator access required.' }, 403);
  }

  try {
    const body = await request.json();
    const userId = Number(body.id);

    if (!userId) {
      return json({ error: 'User id is required.' }, 400);
    }

    const existing = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!existing) {
      return json({ error: 'User not found.' }, 404);
    }

    if (existing.username === actor.username) {
      return json({ error: 'You cannot delete your own account.' }, 400);
    }

    const adminCount = await query.get(
      "SELECT COUNT(*) AS count FROM users WHERE role IN ('admin', 'super_admin')"
    );
    if (normalizeRole(existing.role) === ROLES.ADMIN && adminCount.count <= 1) {
      return json({ error: 'Cannot delete the only administrator account.' }, 400);
    }

    await query.run('DELETE FROM users WHERE id = ?', [userId]);
    
    await logActivity(actor.id, 'delete_user', `Admin deleted user: ${existing.username}`, getClientIp(request));

    return json({ success: true });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
