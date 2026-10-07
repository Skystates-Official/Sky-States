import { query } from '../../../db/sqlite.js';
import { requireAuth } from '../../../db/auth.js';

export const prerender = false;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET: Fetch comments for a specific how_to
export async function GET({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const url = new URL(request.url);
    const how_toId = url.searchParams.get('how_to_id');

    if (!how_toId) {
      return json({ error: 'how_to_id is required' }, 400);
    }

    const comments = await query.all(`
      SELECT c.*, u.username, u.role
      FROM how_to_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.how_to_id = ?
      ORDER BY c.created_at ASC
    `, [how_toId]);

    return json(comments);
  } catch (error) {
    console.error('Comments GET error:', error);
    return json({ error: 'Failed to fetch comments' }, 500);
  }
}

// POST: Add a new comment and parse @mentions
export async function POST({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await request.json();
    const { how_to_id, content } = body;

    if (!how_to_id || !content) {
      return json({ error: 'how_to_id and content are required' }, 400);
    }

    const how_to = await query.get('SELECT title FROM how_tos WHERE id = ?', [how_to_id]);
    if (!how_to) return json({ error: 'HowTo not found' }, 404);

    const dbUser = await query.get('SELECT id FROM users WHERE username = ?', [user.username]);
    if (!dbUser) return json({ error: 'User not found in DB' }, 404);

    const result = await query.run(
      'INSERT INTO how_to_comments (how_to_id, user_id, content) VALUES (?, ?, ?)',
      [how_to_id, dbUser.id, content]
    );

    // Parse @mentions
    const mentionRegex = /@(\w+)/g;
    let match;
    const mentionedUsernames = [];
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionedUsernames.push(match[1]);
    }

    // Process Mentions
    for (const username of mentionedUsernames) {
       if (username.toLowerCase() === user.username.toLowerCase()) continue; // Don't notify self

       const mentionedUser = await query.get('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [username]);
       if (mentionedUser) {
          const message = `${user.username} mentioned you in a comment on "${how_to.title}".`;
          const link = `/admin/how-tos/edit/${how_to_id}`; // Assuming admin editing route
          await query.run(
             'INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)',
             [mentionedUser.id, message, link]
          );
       }
    }

    const newComment = await query.get(`
      SELECT c.*, u.username, u.role
      FROM how_to_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.id]);

    return json(newComment, 201);
  } catch (error) {
    console.error('Comments POST error:', error);
    return json({ error: 'Failed to create comment' }, 500);
  }
}

// PUT: Resolve a comment thread
export async function PUT({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await request.json();
    const { id, status } = body; // e.g. status: 'resolved'

    if (!id || !status) {
       return json({ error: 'Comment id and status required' }, 400);
    }

    await query.run('UPDATE how_to_comments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);

    return json({ success: true, message: `Comment marked as ${status}` });
  } catch (error) {
    console.error('Comments PUT error:', error);
    return json({ error: 'Failed to update comment' }, 500);
  }
}
