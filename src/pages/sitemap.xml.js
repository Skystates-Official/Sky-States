export async function GET(context) {
  const siteUrl = context.site ? new URL(context.site).origin : context.url.origin;

  // Use Vite's import.meta.glob to dynamically find all Astro pages in the project
  const pages = import.meta.glob('/src/pages/**/*.astro');
  const urls = [];

  for (const path of Object.keys(pages)) {
    // Skip dynamic parameters [...slug], api, admin, and 404 pages
    if (
      path.includes('[') || 
      path.includes(']') || 
      path.includes('/api/') || 
      path.includes('/admin') || 
      path.includes('404')
    ) {
      continue;
    }

    // Convert file path to URL route
    let route = path.replace('/src/pages', '').replace('.astro', '');
    
    // Handle index files
    route = route.replace(/\/index$/, '/');
    if (route === '/index') route = '/';

    // Remove trailing slash if not root
    if (route !== '/' && route.endsWith('/')) {
      route = route.slice(0, -1);
    }

    urls.push(`
  <url>
    <loc>${siteUrl}${route}</loc>
    <changefreq>daily</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600"
    },
  });
}