import { query } from '../../../db/sqlite.js';
import { requireAuth } from '../../../db/auth.js';

export const prerender = false;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET: Fetch comments for a specific blog
export async function GET({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const url = new URL(request.url);
    const blogId = url.searchParams.get('blog_id');

    if (!blogId) {
      return json({ error: 'blog_id is required' }, 400);
    }

    const comments = await query.all(`
      SELECT c.*, u.username, u.role
      FROM blog_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.blog_id = ?
      ORDER BY c.created_at ASC
    `, [blogId]);

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
    const { blog_id, content } = body;

    if (!blog_id || !content) {
      return json({ error: 'blog_id and content are required' }, 400);
    }

    const blog = await query.get('SELECT title FROM blogs WHERE id = ?', [blog_id]);
    if (!blog) return json({ error: 'Blog not found' }, 404);

    const dbUser = await query.get('SELECT id FROM users WHERE username = ?', [user.username]);
    if (!dbUser) return json({ error: 'User not found in DB' }, 404);

    const result = await query.run(
      'INSERT INTO blog_comments (blog_id, user_id, content) VALUES (?, ?, ?)',
      [blog_id, dbUser.id, content]
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
          const message = `${user.username} mentioned you in a comment on "${blog.title}".`;
          const link = `/admin/blogs/edit/${blog_id}`; // Assuming admin editing route
          await query.run(
             'INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)',
             [mentionedUser.id, message, link]
          );
       }
    }

    const newComment = await query.get(`
      SELECT c.*, u.username, u.role
      FROM blog_comments c
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

    await query.run('UPDATE blog_comments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);

    return json({ success: true, message: `Comment marked as ${status}` });
  } catch (error) {
    console.error('Comments PUT error:', error);
    return json({ error: 'Failed to update comment' }, 500);
  }
}
