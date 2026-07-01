import { query } from '../../db/sqlite.js';
import { getSessionUser } from '../../db/auth.js';

export const prerender = false;

function checkAuth(request) {
  return !!getSessionUser(request);
}

// GET: Retrieve list of pages or a single page
export async function GET({ url }) {
  try {
    const id = url.searchParams.get('id');
    if (id) {
      const page = await query.get("SELECT * FROM pages WHERE id = ?", [id]);
      if (!page) return new Response(JSON.stringify({ error: 'Page not found' }), { status: 404 });
      return new Response(JSON.stringify(page), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const pages = await query.all("SELECT id, title, slug, status, created_at FROM pages ORDER BY created_at DESC");
    return new Response(JSON.stringify(pages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// POST: Create a new page
export async function POST({ request }) {
  try {
    if (!checkAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const title = body.title || 'Untitled Page';
    // Sanitize slug (lowercase, dashes, alpha-numeric)
    const rawSlug = body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = rawSlug;

    // Check uniqueness
    const existing = await query.get("SELECT id FROM pages WHERE slug = ?", [slug]);
    if (existing) {
      return new Response(JSON.stringify({ error: `Slug '${slug}' is already taken.` }), { status: 400 });
    }

    // Default template content blocks
    const defaultBlocks = JSON.stringify([
      {
        type: 'hero',
        data: {
          badge: 'Announcement',
          headline: `Welcome to ${title}`,
          subtitle: 'This page was created dynamically through the Sky States CMS.',
          cta_label: 'Explore Tracks',
          cta_url: '/'
        }
      }
    ]);

    const result = await query.run(
      `INSERT INTO pages (title, slug, meta_title, meta_description, content_blocks, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, slug, title, `Description for ${title}`, defaultBlocks, 'draft']
    );

    return new Response(JSON.stringify({ success: true, id: result.id, slug }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT: Update page configuration
export async function PUT({ request }) {
  try {
    if (!checkAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const { id, title, slug, meta_title, meta_description, canonical_url, content_blocks, status } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Page ID required' }), { status: 400 });
    }

    // Check slug uniqueness
    const existing = await query.get("SELECT id FROM pages WHERE slug = ? AND id != ?", [slug, id]);
    if (existing) {
      return new Response(JSON.stringify({ error: `Slug '${slug}' is already taken.` }), { status: 400 });
    }

    await query.run(
      `UPDATE pages 
       SET title = ?, slug = ?, meta_title = ?, meta_description = ?, canonical_url = ?, content_blocks = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, slug, meta_title, meta_description, canonical_url, JSON.stringify(content_blocks), status, id]
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE: Delete dynamic page
export async function DELETE({ request }) {
  try {
    if (!checkAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Page ID required' }), { status: 400 });
    }

    await query.run("DELETE FROM pages WHERE id = ?", [id]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
