import { query } from '../../../db/sqlite.js';
import { requireAuth, hasRole, ROLES } from '../../../db/auth.js';
import { logActivity } from '../../../db/audit.js';

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

// GET: Fetch version history for a specific blog
export async function GET({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const url = new URL(request.url);
    const blogId = url.searchParams.get('blog_id');

    if (!blogId) {
      return json({ error: 'blog_id is required' }, 400);
    }

    const versions = await query.all(`
      SELECT v.id, v.blog_id, v.title, v.created_at, u.username as editor
      FROM blog_versions v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.blog_id = ?
      ORDER BY v.created_at DESC
    `, [blogId]);

    // To prevent sending massive payloads, we don't send `content` for all versions by default.
    // If the client wants the full content of a specific version, they pass `version_id`.
    const versionId = url.searchParams.get('version_id');
    if (versionId) {
       const specificVersion = await query.get('SELECT * FROM blog_versions WHERE id = ? AND blog_id = ?', [versionId, blogId]);
       return json(specificVersion || { error: 'Version not found' });
    }

    return json(versions);
  } catch (error) {
    console.error('Versions GET error:', error);
    return json({ error: 'Failed to fetch version history' }, 500);
  }
}

// POST: Restore a previous version
export async function POST({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  // Restoring a version is a major destructive change. Require Admin or SEO/Editor.
  if (!hasRole(user, ROLES.ADMIN, ROLES.EDITOR)) {
     return json({ error: 'Insufficient permissions to restore versions' }, 403);
  }

  try {
    const body = await request.json();
    const { blog_id, version_id } = body;

    if (!blog_id || !version_id) {
       return json({ error: 'blog_id and version_id are required' }, 400);
    }

    const targetVersion = await query.get('SELECT * FROM blog_versions WHERE id = ? AND blog_id = ?', [version_id, blog_id]);
    if (!targetVersion) {
       return json({ error: 'Version not found' }, 404);
    }

    const currentBlog = await query.get('SELECT * FROM blogs WHERE id = ?', [blog_id]);
    if (!currentBlog) {
       return json({ error: 'Blog not found' }, 404);
    }

    // 1. Snapshot the CURRENT state before overwriting it (so we don't lose the bad edit)
    await query.run(
       'INSERT INTO blog_versions (blog_id, user_id, title, content, seo_metadata) VALUES (?, ?, ?, ?, ?)',
       [currentBlog.id, user.id, currentBlog.title, currentBlog.content, currentBlog.seo_metadata]
    );

    // 2. Overwrite the main blog with the historical version
    await query.run(
       'UPDATE blogs SET title = ?, content = ?, seo_metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
       [targetVersion.title, targetVersion.content, targetVersion.seo_metadata, blog_id]
    );

    await logActivity(
      user.id, 
      'restore_blog_version', 
      `Restored blog '${currentBlog.title}' to version created at ${targetVersion.created_at}`, 
      getClientIp(request)
    );

    return json({ success: true, message: 'Blog restored successfully' });
  } catch (error) {
    console.error('Versions POST error:', error);
    return json({ error: 'Failed to restore version' }, 500);
  }
}
