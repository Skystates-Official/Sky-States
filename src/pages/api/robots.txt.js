import { query } from '../../db/sqlite.js';

export const prerender = false;

export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const domain = url.origin;

    const setting = await query.get('SELECT value FROM settings WHERE key = ?', ['robots_txt']);
    
    let robotsTxt = setting ? setting.value : `User-agent: *
Allow: /

Sitemap: ${domain}/api/sitemap.xml`;

    return new Response(robotsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Robots.txt GET error:', error);
    return new Response('User-agent: *\nAllow: /', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
