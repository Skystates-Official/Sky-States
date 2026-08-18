import { query } from '../../db/sqlite.js';
import { requireAuth } from '../../db/auth.js';

export const prerender = false;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET({ request }) {
  // Ensure the user is authenticated (any portal user can view dashboard)
  const user = requireAuth(request);
  if (!user) {
    return json({ error: 'Authentication required.' }, 401);
  }

  try {
    // We could run multiple queries or one single aggregate query for stats. 
    // For SQLite, doing multiple small queries is fine and easy to read.

    const statsRes = await query.get(`
      SELECT 
        COUNT(*) as total_blogs,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_review,
        AVG(seo_score) as average_seo_score
      FROM blogs
    `);

    // Ensure we return 0 instead of null if there are no blogs
    const stats = {
      total_blogs: statsRes.total_blogs || 0,
      published: statsRes.published || 0,
      draft: statsRes.draft || 0,
      scheduled: statsRes.scheduled || 0,
      pending_review: statsRes.pending_review || 0,
      average_seo_score: statsRes.average_seo_score ? Math.round(statsRes.average_seo_score) : 0,
    };

    // Top 5 recently edited blogs
    const recentlyEdited = await query.all(
      `SELECT id, title, slug, status, updated_at 
       FROM blogs 
       ORDER BY updated_at DESC 
       LIMIT 5`
    );

    // Top 5 recent activities from audit logs
    const recentActivity = await query.all(
      `SELECT a.id, a.action, a.details, a.created_at, u.username as user_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 5`
    );

    return json({
      stats,
      recently_edited: recentlyEdited,
      recent_activity: recentActivity
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return json({ error: 'Failed to fetch dashboard statistics.' }, 500);
  }
}
