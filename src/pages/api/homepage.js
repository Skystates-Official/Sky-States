import fs from 'fs';
import path from 'path';

export const prerender = false;

const jsonPath = path.resolve('src/data/homepage.json');

function readData() {
  try {
    const data = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function writeData(data) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
}

export async function GET() {
  return new Response(JSON.stringify(readData()), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request }) {
  try {
    // Check auth cookie to ensure secure operations
    const cookieHeader = request.headers.get('cookie') || '';
    if (!cookieHeader.includes('admin_session=authenticated')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    writeData(body);
    
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
