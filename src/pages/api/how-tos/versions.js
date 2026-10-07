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

// GET: Fetch version history for a specific how_to
export async function GET({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const url = new URL(request.url);
    const how_toId = url.searchParams.get('how_to_id');

    if (!how_toId) {
      return json({ error: 'how_to_id is required' }, 400);
    }

    const versions = await query.all(`
      SELECT v.id, v.how_to_id, v.title, v.created_at, u.username as editor
      FROM how_to_versions v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.how_to_id = ?
      ORDER BY v.created_at DESC
    `, [how_toId]);

    // To prevent sending massive payloads, we don't send `content` for all versions by default.
    // If the client wants the full content of a specific version, they pass `version_id`.
    const versionId = url.searchParams.get('version_id');
    if (versionId) {
       const specificVersion = await query.get('SELECT * FROM how_to_versions WHERE id = ? AND how_to_id = ?', [versionId, how_toId]);
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
    const { how_to_id, version_id } = body;

    if (!how_to_id || !version_id) {
       return json({ error: 'how_to_id and version_id are required' }, 400);
    }

    const targetVersion = await query.get('SELECT * FROM how_to_versions WHERE id = ? AND how_to_id = ?', [version_id, how_to_id]);
    if (!targetVersion) {
       return json({ error: 'Version not found' }, 404);
    }

    const currentHowTo = await query.get('SELECT * FROM how_tos WHERE id = ?', [how_to_id]);
    if (!currentHowTo) {
       return json({ error: 'HowTo not found' }, 404);
    }

    // 1. Snapshot the CURRENT state before overwriting it (so we don't lose the bad edit)
    await query.run(
       'INSERT INTO how_to_versions (how_to_id, user_id, title, content, seo_metadata) VALUES (?, ?, ?, ?, ?)',
       [currentHowTo.id, user.id, currentHowTo.title, currentHowTo.content, currentHowTo.seo_metadata]
    );

    // 2. Overwrite the main how_to with the historical version
    await query.run(
       'UPDATE how_tos SET title = ?, content = ?, seo_metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
       [targetVersion.title, targetVersion.content, targetVersion.seo_metadata, how_to_id]
    );

    await logActivity(
      user.id, 
      'restore_how_to_version', 
      `Restored how_to '${currentHowTo.title}' to version created at ${targetVersion.created_at}`, 
      getClientIp(request)
    );

    return json({ success: true, message: 'HowTo restored successfully' });
  } catch (error) {
    console.error('Versions POST error:', error);
    return json({ error: 'Failed to restore version' }, 500);
  }
}
