import { query } from '../../../db/sqlite.js';
import { requireAuth } from '../../../db/auth.js';

export const prerender = false;

export async function GET({ request }) {
  const user = requireAuth(request);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    
    let sql = 'SELECT * FROM media ORDER BY created_at DESC';
    let params = [];

    if (search) {
      sql = 'SELECT * FROM media WHERE title LIKE ? OR filename LIKE ? ORDER BY created_at DESC';
      params = [`%${search}%`, `%${search}%`];
    }

    const media = await query.all(sql, params);

    return new Response(JSON.stringify(media), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
