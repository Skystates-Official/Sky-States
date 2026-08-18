import { query } from '../../db/sqlite.js';
import { requireAuth, hasRole, ROLES } from '../../db/auth.js';
import { logActivity } from '../../db/audit.js';

export const prerender = false;

function getClientIp(request) {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  if (!hasRole(user, ROLES.ADMIN, ROLES.SEO)) {
     return json({ error: 'Insufficient permissions' }, 403);
  }

  try {
    const rules = await query.all('SELECT * FROM redirect_rules ORDER BY created_at DESC');
    return json(rules);
  } catch (error) {
    console.error('Redirects GET error:', error);
    return json({ error: 'Failed to fetch redirect rules' }, 500);
  }
}

export async function POST({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  if (!hasRole(user, ROLES.ADMIN, ROLES.SEO)) {
     return json({ error: 'Insufficient permissions' }, 403);
  }

  try {
    const body = await request.json();
    const { from_url, to_url, status_code } = body;

    if (!from_url || !to_url) {
       return json({ error: 'from_url and to_url are required' }, 400);
    }

    const code = parseInt(status_code) || 301;

    // Check for existing rule to prevent UNIQUE constraint failure
    const existing = await query.get('SELECT id FROM redirect_rules WHERE from_url = ?', [from_url]);
    if (existing) {
       return json({ error: 'A redirect rule for this from_url already exists.' }, 409);
    }

    const result = await query.run(
       'INSERT INTO redirect_rules (from_url, to_url, status_code) VALUES (?, ?, ?)',
       [from_url, to_url, code]
    );

    await logActivity(user.id, 'create_redirect', `Created redirect from ${from_url} to ${to_url}`, getClientIp(request));

    const newRule = await query.get('SELECT * FROM redirect_rules WHERE id = ?', [result.id]);
    return json(newRule, 201);
  } catch (error) {
    console.error('Redirects POST error:', error);
    return json({ error: 'Failed to create redirect rule' }, 500);
  }
}

export async function DELETE({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  if (!hasRole(user, ROLES.ADMIN, ROLES.SEO)) {
     return json({ error: 'Insufficient permissions' }, 403);
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) return json({ error: 'Rule ID is required' }, 400);

    const rule = await query.get('SELECT * FROM redirect_rules WHERE id = ?', [id]);
    if (!rule) return json({ error: 'Redirect rule not found' }, 404);

    await query.run('DELETE FROM redirect_rules WHERE id = ?', [id]);
    await logActivity(user.id, 'delete_redirect', `Deleted redirect from ${rule.from_url}`, getClientIp(request));

    return json({ success: true });
  } catch (error) {
    console.error('Redirects DELETE error:', error);
    return json({ error: 'Failed to delete redirect rule' }, 500);
  }
}
