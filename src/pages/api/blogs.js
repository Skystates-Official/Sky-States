import { query } from '../../db/sqlite.js';
import { requireAuth, hasRole, ROLES } from '../../db/auth.js';
import { logActivity } from '../../db/audit.js';

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

export async function GET({ request }) {
  const user = requireAuth(request);
  if (!user) {
    return json({ error: 'Authentication required.' }, 401);
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const slug = url.searchParams.get('slug');

    if (id || slug) {
      // Get single blog
      const sql = id 
        ? 'SELECT * FROM blogs WHERE id = ?' 
        : 'SELECT * FROM blogs WHERE slug = ?';
      const param = id || slug;
      
      const blog = await query.get(sql, [param]);
      if (!blog) return json({ error: 'Blog not found.' }, 404);
      return json(blog);
    }

    // Get list of blogs
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const status = url.searchParams.get('status');
    const author = url.searchParams.get('author');

    let sql = 'SELECT id, title, slug, category, subcategory, status, author, published_at, updated_at FROM blogs WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    // If the user is a WRITER, they should ideally only see their own drafts or all published. 
    // But for a CMS portal, we might allow them to see the list. 
    // The user didn't specify strict read restrictions, so we allow filtering by author.
    if (author) {
      sql += ' AND author = ?';
      params.push(author);
    }

    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const blogs = await query.all(sql, params);
    
    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as count FROM blogs WHERE 1=1';
    const countParams = [];
    if (status) { countSql += ' AND status = ?'; countParams.push(status); }
    if (author) { countSql += ' AND author = ?'; countParams.push(author); }
    
    const countRes = await query.get(countSql, countParams);

    return json({
      blogs,
      pagination: {
        total: countRes ? countRes.count : 0,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Blogs GET error:', error);
    return json({ error: 'Failed to fetch blogs.' }, 500);
  }
}

export async function POST({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Authentication required.' }, 401);

  // Writers can create. SEOs probably shouldn't create new blogs, but they can edit. 
  // Let's assume everyone with portal access can create, but we'll restrict SEO just in case.
  if (hasRole(user, ROLES.SEO) && !hasRole(user, ROLES.ADMIN, ROLES.EDITOR, ROLES.WRITER)) {
      return json({ error: 'SEO Specialists cannot create new blogs.' }, 403);
  }

  try {
    const body = await request.json();
    
    const { 
      title, slug, category, subcategory, short_description, content, 
      image, author, tags, seo_title, seo_description, status, 
      seo_score, published_at, seo_metadata 
    } = body;

    if (!title || !slug || !category || !author || !status || !image || !tags) {
      return json({ error: 'Missing required fields (title, slug, category, author, status, image, tags).' }, 400);
    }

    const existing = await query.get('SELECT id FROM blogs WHERE slug = ?', [slug]);
    if (existing) {
      return json({ error: 'A blog with this slug already exists.' }, 409);
    }

    const finalSeoMetadata = seo_metadata ? (typeof seo_metadata === 'string' ? seo_metadata : JSON.stringify(seo_metadata)) : null;

    const result = await query.run(
      `INSERT INTO blogs (
        title, slug, category, subcategory, short_description, content, 
        image, author, tags, seo_title, seo_description, status, seo_score, published_at, seo_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, slug, category, subcategory || null, short_description || null, content || '', 
        image, author, tags, seo_title || null, seo_description || null, status, 
        seo_score || 0, published_at || null, finalSeoMetadata
      ]
    );

    await logActivity(user.id, 'create_blog', `Created blog: ${title}`, getClientIp(request));

    const newBlog = await query.get('SELECT * FROM blogs WHERE id = ?', [result.id]);
    return json(newBlog, 201);
  } catch (error) {
    console.error('Blog POST error:', error);
    return json({ error: 'Failed to create blog.' }, 500);
  }
}

export async function PUT({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Authentication required.' }, 401);

  try {
    const body = await request.json();
    const id = body.id;

    if (!id) return json({ error: 'Blog ID is required.' }, 400);

    const existing = await query.get('SELECT * FROM blogs WHERE id = ?', [id]);
    if (!existing) return json({ error: 'Blog not found.' }, 404);

    // Permission check
    // - ADMIN and EDITOR can update anything.
    // - WRITER can only update if they are the author.
    // - SEO can only update SEO fields.
    const isFullAccess = hasRole(user, ROLES.ADMIN, ROLES.EDITOR);
    const isWriterOwn = hasRole(user, ROLES.WRITER) && existing.author === user.username;
    const isSeo = hasRole(user, ROLES.SEO);

    if (!isFullAccess && !isWriterOwn && !isSeo) {
      return json({ error: 'You do not have permission to edit this blog.' }, 403);
    }

    const updatedData = { ...existing, ...body };
    updatedData.updated_at = new Date().toISOString();

    // If SEO, only allow updating seo fields
    if (isSeo && !isFullAccess && !isWriterOwn) {
       const finalSeoMetadata = body.seo_metadata !== undefined 
         ? (typeof body.seo_metadata === 'string' ? body.seo_metadata : JSON.stringify(body.seo_metadata)) 
         : existing.seo_metadata;
         
       await query.run(
         'UPDATE blogs SET seo_title = ?, seo_description = ?, seo_score = ?, seo_metadata = ?, updated_at = ? WHERE id = ?',
         [body.seo_title !== undefined ? body.seo_title : existing.seo_title, 
          body.seo_description !== undefined ? body.seo_description : existing.seo_description, 
          body.seo_score !== undefined ? body.seo_score : existing.seo_score, 
          finalSeoMetadata,
          updatedData.updated_at, id]
       );
       await logActivity(user.id, 'update_blog_seo', `Updated SEO for blog: ${existing.title}`, getClientIp(request));
    } else {
       // Full update
       if (body.slug && body.slug !== existing.slug) {
         const duplicate = await query.get('SELECT id FROM blogs WHERE slug = ? AND id != ?', [body.slug, id]);
         if (duplicate) return json({ error: 'Slug is already in use.' }, 409);
       }

       const finalSeoMetadata = updatedData.seo_metadata !== undefined 
         ? (typeof updatedData.seo_metadata === 'string' ? updatedData.seo_metadata : JSON.stringify(updatedData.seo_metadata)) 
         : null;

       await query.run(
         `UPDATE blogs SET 
            title = ?, slug = ?, category = ?, subcategory = ?, short_description = ?, 
            content = ?, image = ?, author = ?, tags = ?, seo_title = ?, seo_description = ?, 
            status = ?, seo_score = ?, published_at = ?, seo_metadata = ?, updated_at = ?
          WHERE id = ?`,
         [
           updatedData.title, updatedData.slug, updatedData.category, updatedData.subcategory, updatedData.short_description,
           updatedData.content, updatedData.image, updatedData.author, updatedData.tags, updatedData.seo_title, updatedData.seo_description,
           updatedData.status, updatedData.seo_score, updatedData.published_at, finalSeoMetadata, updatedData.updated_at, id
         ]
       );
       await logActivity(user.id, 'update_blog', `Updated blog: ${updatedData.title}`, getClientIp(request));
    }

    const finalBlog = await query.get('SELECT * FROM blogs WHERE id = ?', [id]);
    return json(finalBlog);
  } catch (error) {
    console.error('Blog PUT error:', error);
    return json({ error: 'Failed to update blog.' }, 500);
  }
}

export async function DELETE({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Authentication required.' }, 401);

  try {
    const body = await request.json();
    const id = body.id;

    if (!id) return json({ error: 'Blog ID is required.' }, 400);

    const existing = await query.get('SELECT * FROM blogs WHERE id = ?', [id]);
    if (!existing) return json({ error: 'Blog not found.' }, 404);

    // Only Admin, Editor, or the original Writer can delete.
    const isFullAccess = hasRole(user, ROLES.ADMIN, ROLES.EDITOR);
    const isWriterOwn = hasRole(user, ROLES.WRITER) && existing.author === user.username;

    if (!isFullAccess && !isWriterOwn) {
      return json({ error: 'You do not have permission to delete this blog.' }, 403);
    }

    await query.run('DELETE FROM blogs WHERE id = ?', [id]);
    await logActivity(user.id, 'delete_blog', `Deleted blog: ${existing.title}`, getClientIp(request));

    return json({ success: true });
  } catch (error) {
    console.error('Blog DELETE error:', error);
    return json({ error: 'Failed to delete blog.' }, 500);
  }
}
