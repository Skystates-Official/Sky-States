import { query as sqlQuery } from '../../../db/sqlite.js';
import { saveBlogUpload } from '../../../lib/blog-uploads.js';

export const prerender = false;

export async function POST({ request }) {
  try {
    const formData = await request.formData();

    const title = String(formData.get('title') || '').trim();
    if (!title) {
      return new Response(JSON.stringify({ success: false, error: 'Title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const slugFromForm = String(formData.get('slug') || '').trim();
    const slug =
      slugFromForm ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const category = String(formData.get('category') || 'General');
    const short_description = String(formData.get('short_description') || '');
    const content = String(formData.get('content') || '');
    const author = String(formData.get('author') || 'Admin');
    const keywords = String(formData.get('keywords') || '');
    const canonical = String(formData.get('canonical') || '');
    const seo_title = String(formData.get('seo_title') || '');
    const seo_description = String(formData.get('seo_description') || '');
    const status = String(formData.get('status') || 'draft');
    const image = formData.get('image');
    const imagePath = await saveBlogUpload(image);

    await sqlQuery.run(
      `
      INSERT INTO blogs
      (
        title,
        slug,
        category,
        author,
        keywords,
        canonical,
        short_description,
        content,
        image,
        seo_title,
        seo_description,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        slug,
        category,
        author,
        keywords,
        canonical,
        short_description,
        content,
        imagePath,
        seo_title,
        seo_description,
        status,
      ]
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Blog created successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Blog create failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
