import fs from 'fs';
import path from 'path';

export const prerender = false;

function getJsonPath(page) {
  const allowedPages = ['homepage', 'about', 'faq', 'programs', 'coupon-config'];
  if (!allowedPages.includes(page)) {
    throw new Error('Invalid page identifier');
  }
  return path.resolve(`src/data/${page}.json`);
}

function readData(page) {
  try {
    const jsonPath = getJsonPath(page);
    if (!fs.existsSync(jsonPath)) {
      return {};
    }
    const data = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { error: error.message };
  }
}

function writeData(page, data) {
  const jsonPath = getJsonPath(page);
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
}

export async function GET({ url }) {
  try {
    const page = url.searchParams.get('page');
    if (!page) {
      return new Response(JSON.stringify({ error: 'Page parameter required' }), { status: 400 });
    }
    const data = readData(page);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}

export async function POST({ request, url }) {
  try {
    // Check auth cookie to ensure secure operations
    const cookieHeader = request.headers.get('cookie') || '';
    if (!cookieHeader.includes('admin_session=sky_admin_secure_session_6c9f7a1e2b4d8c0f3e7a')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const page = url.searchParams.get('page');
    if (!page) {
      return new Response(JSON.stringify({ error: 'Page parameter required' }), { status: 400 });
    }

    const body = await request.json();
    writeData(page, body);
    
    return new Response(JSON.stringify({ success: true, data: body }), { 
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
