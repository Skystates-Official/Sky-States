import { query as sqlQuery } from '../../../db/sqlite.js';
import { deleteBlogUpload } from '../../../lib/blog-uploads.js';

export const prerender = false;

export async function DELETE({ request }) {
  try {
    const { id } = await request.json();

    const blog = await sqlQuery.get('SELECT image FROM blogs WHERE id = ?', [id]);
    if (blog?.image) {
      await deleteBlogUpload(blog.image);
    }

    await sqlQuery.run('DELETE FROM blogs WHERE id = ?', [id]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Blog delete failed:', err);
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
