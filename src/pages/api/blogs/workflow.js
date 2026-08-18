import { query } from '../../../db/sqlite.js';
import { requireAuth, hasRole, ROLES } from '../../../db/auth.js';
import { logActivity } from '../../../db/audit.js';

export const prerender = false;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getClientIp(request) {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
}

const VALID_STATUSES = [
  'draft', 
  'in_progress', 
  'seo_review', 
  'editorial_review', 
  'approved', 
  'scheduled', 
  'published', 
  'archived', 
  'rejected'
];

export async function PUT({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Authentication required.' }, 401);

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return json({ error: 'Blog ID and new status are required.' }, 400);
    }

    const formattedStatus = status.toLowerCase().replace(/\s+/g, '_');

    if (!VALID_STATUSES.includes(formattedStatus)) {
      return json({ error: `Invalid status: ${status}` }, 400);
    }

    const existing = await query.get('SELECT id, title, author, status FROM blogs WHERE id = ?', [id]);
    if (!existing) return json({ error: 'Blog not found.' }, 404);

    const isFullAccess = hasRole(user, ROLES.ADMIN, ROLES.EDITOR);
    const isWriter = hasRole(user, ROLES.WRITER);
    const isWriterOwn = isWriter && existing.author === user.username;
    const isSeo = hasRole(user, ROLES.SEO);

    // Enforce RBAC Workflow Rules
    let allowed = false;

    if (isFullAccess) {
      // Admins and Editors can do anything
      allowed = true;
    } else if (isSeo) {
      // SEO can only move to editorial_review or reject it (from seo_review)
      if (existing.status === 'seo_review' && ['editorial_review', 'rejected'].includes(formattedStatus)) {
        allowed = true;
      }
    } else if (isWriterOwn) {
      // Writer can only move their own drafts to in_progress or seo_review
      if (['draft', 'in_progress', 'rejected'].includes(existing.status)) {
        if (['draft', 'in_progress', 'seo_review'].includes(formattedStatus)) {
          allowed = true;
        }
      }
    }

    if (!allowed) {
      return json({ 
        error: `Permission denied. You cannot change a blog from '${existing.status}' to '${formattedStatus}'.` 
      }, 403);
    }

    const updatedAt = new Date().toISOString();
    
    // If it's being published, set published_at if not set
    let publishedAtUpdate = '';
    const params = [formattedStatus, updatedAt];
    
    if (formattedStatus === 'published' && existing.status !== 'published') {
      publishedAtUpdate = ', published_at = ?';
      params.push(updatedAt);
    }
    
    params.push(id);

    await query.run(
      `UPDATE blogs SET status = ?, updated_at = ? ${publishedAtUpdate} WHERE id = ?`,
      params
    );

    await logActivity(
      user.id, 
      `status_changed_to_${formattedStatus}`, 
      `Changed status of '${existing.title}' to '${formattedStatus}'`, 
      getClientIp(request)
    );

    const updatedBlog = await query.get('SELECT * FROM blogs WHERE id = ?', [id]);
    return json(updatedBlog);
  } catch (error) {
    console.error('Workflow PUT error:', error);
    return json({ error: 'Failed to update workflow status.' }, 500);
  }
}
