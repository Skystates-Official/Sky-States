import { query } from '../../db/sqlite.js';
import { requireAuth } from '../../db/auth.js';

export const prerender = false;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET: Fetch user's notifications
export async function GET({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const unreadOnly = new URL(request.url).searchParams.get('unread') === 'true';
    
    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    if (unreadOnly) {
      sql += ' AND is_read = 0';
    }
    sql += ' ORDER BY created_at DESC LIMIT 50';

    const notifications = await query.all(sql, [user.id]);
    return json(notifications);
  } catch (error) {
    console.error('Notifications GET error:', error);
    return json({ error: 'Failed to fetch notifications' }, 500);
  }
}

// PUT: Mark notification(s) as read
export async function PUT({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await request.json();
    
    if (body.markAllRead) {
      await query.run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [user.id]);
      return json({ success: true, message: 'All notifications marked as read' });
    }

    if (!body.id) {
      return json({ error: 'Notification ID required' }, 400);
    }

    // Ensure the notification belongs to the user
    const existing = await query.get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [body.id, user.id]);
    if (!existing) {
       return json({ error: 'Notification not found' }, 404);
    }

    await query.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [body.id]);
    
    return json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Notifications PUT error:', error);
    return json({ error: 'Failed to update notification' }, 500);
  }
}
