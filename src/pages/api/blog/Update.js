import { query as sqlQuery } from '../../../db/sqlite.js';
import { saveBlogUpload } from '../../../lib/blog-uploads.js';

export const prerender = false;

export async function PUT({ request }) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let data;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries());
      const image = formData.get('image');
      if (image && image.size > 0) {
        data.image = await saveBlogUpload(image);
      }
    } else {
      data = await request.json();
    }

    if (!data.id) {
      return new Response(JSON.stringify({ success: false, error: 'Blog id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = await sqlQuery.get('SELECT * FROM blogs WHERE id = ?', [data.id]);
    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: 'Blog not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await sqlQuery.run(
      `
      UPDATE blogs
      SET
        title = ?,
        slug = ?,
        category = ?,
        short_description = ?,
        content = ?,
        author = ?,
        keywords = ?,
        canonical = ?,
        image = ?,
        seo_title = ?,
        seo_description = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        data.title ?? existing.title,
        data.slug ?? existing.slug,
        data.category ?? existing.category,
        data.short_description ?? existing.short_description,
        data.content ?? existing.content,
        data.author ?? existing.author,
        data.keywords ?? existing.keywords ?? '',
        data.canonical ?? existing.canonical ?? '',
        data.image ?? existing.image ?? '',
        data.seo_title ?? existing.seo_title,
        data.seo_description ?? existing.seo_description,
        data.status ?? existing.status,
        data.id,
      ]
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Blog update failed:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
