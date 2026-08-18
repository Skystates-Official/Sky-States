import { query } from '../../db/sqlite.js';

export const prerender = false;

export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const domain = url.origin;

    // Fetch all published blogs
    const blogs = await query.all(`
      SELECT slug, updated_at 
      FROM blogs 
      WHERE status = 'published'
      ORDER BY updated_at DESC
    `);

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${domain}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

    // Add blogs
    blogs.forEach(blog => {
      sitemap += `  <url>
    <loc>${domain}/blog/${blog.slug}</loc>
    <lastmod>${new Date(blog.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    });

    sitemap += `</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Sitemap GET error:', error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}
