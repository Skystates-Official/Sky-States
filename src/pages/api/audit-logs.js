import { query } from '../../db/sqlite.js';
import { requireFullAdmin } from '../../db/auth.js';

export const prerender = false;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET({ request }) {
  const actor = requireFullAdmin(request);
  if (!actor) {
    return json({ error: 'Administrator access required.' }, 403);
  }

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;

    const logs = await query.all(
      `SELECT a.id, a.user_id, u.username as user_name, a.action, a.details, a.ip_address, a.created_at 
       FROM audit_logs a 
       LEFT JOIN users u ON a.user_id = u.id 
       ORDER BY a.created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const totalRes = await query.get('SELECT COUNT(*) as count FROM audit_logs');
    const total = totalRes ? totalRes.count : 0;

    return json({
      logs,
      pagination: {
        total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    return json({ error: 'Failed to fetch audit logs.' }, 500);
  }
}
