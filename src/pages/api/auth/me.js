import { getSessionUser, ROLE_LABELS, normalizeRole } from '../../../db/auth.js';
import { query } from '../../../db/sqlite.js';

export const prerender = false;

export async function GET({ request }) {
  try {
    const sessionUser = getSessionUser(request);
    
    if (!sessionUser) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await query.get('SELECT id, username, email, role, created_at FROM users WHERE username = ?', [sessionUser.username]);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const role = normalizeRole(user.role);

    return new Response(JSON.stringify({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: role,
        roleLabel: ROLE_LABELS[role] || role,
        created_at: user.created_at
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred fetching profile.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
