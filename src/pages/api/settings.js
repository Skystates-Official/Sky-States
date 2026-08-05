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

// GET: Fetch all settings or a specific setting
export async function GET({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  // Read access can be allowed to editors/seo for things like categories, but full settings should be admin
  const isAdmin = hasRole(user, ROLES.ADMIN);
  const isEditor = hasRole(user, ROLES.EDITOR);
  const isSeo = hasRole(user, ROLES.SEO);

  if (!isAdmin && !isEditor && !isSeo) {
     return json({ error: 'Insufficient permissions' }, 403);
  }

  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (key) {
      const setting = await query.get('SELECT * FROM settings WHERE key = ?', [key]);
      return json(setting || { key, value: null });
    }

    const allSettings = await query.all('SELECT * FROM settings');
    return json(allSettings);
  } catch (error) {
    console.error('Settings GET error:', error);
    return json({ error: 'Failed to fetch settings' }, 500);
  }
}

// POST: Save or update settings
export async function POST({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  // Only Admins can modify global system settings
  if (!hasRole(user, ROLES.ADMIN)) {
     return json({ error: 'Only administrators can modify settings' }, 403);
  }

  try {
    // Expects an array of { key, value } or an object of key: value pairs
    const body = await request.json();
    
    let updates = [];
    if (Array.isArray(body)) {
       updates = body;
    } else if (typeof body === 'object') {
       updates = Object.keys(body).map(k => ({ key: k, value: body[k] }));
    } else {
       return json({ error: 'Invalid payload format' }, 400);
    }

    for (const item of updates) {
       let { key, value } = item;
       
       if (!key) continue;
       
       if (typeof value !== 'string') {
          value = JSON.stringify(value);
       }

       // Upsert logic (SQLite standard for settings table without unique constraint is DELETE then INSERT, or UPDATE if exists)
       const existing = await query.get('SELECT key FROM settings WHERE key = ?', [key]);
       if (existing) {
          await query.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
       } else {
          await query.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
       }
    }

    await logActivity(user.id, 'update_settings', `Updated ${updates.length} system settings`, getClientIp(request));

    const updatedSettings = await query.all('SELECT * FROM settings');
    return json({ success: true, settings: updatedSettings });
  } catch (error) {
    console.error('Settings POST error:', error);
    return json({ error: 'Failed to update settings' }, 500);
  }
}
