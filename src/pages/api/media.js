import fs from 'fs';
import path from 'path';
import { query } from '../../db/sqlite.js';
import { getSessionUser } from '../../db/auth.js';

export const prerender = false;

const UPLOADS_DIR = path.resolve('public/uploads');

function checkAuth(request) {
  return !!getSessionUser(request);
}

// GET: List all media items
export async function GET() {
  try {
    const items = await query.all("SELECT * FROM media ORDER BY created_at DESC");
    return new Response(JSON.stringify(items), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// POST: Upload new file
export async function POST({ request }) {
  try {
    if (!checkAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const altText = formData.get('alt_text') || '';
    const title = formData.get('title') || '';
    const caption = formData.get('caption') || '';

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    // Sanitize filename to prevent directory traversal
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Ensure directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const targetPath = path.join(UPLOADS_DIR, safeName);
    const relativePath = `/uploads/${safeName}`;

    // Read and save file content
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(targetPath, buffer);

    // Save metadata to database
    const result = await query.run(
      `INSERT INTO media (filename, path, mime_type, size, alt_text, title, caption) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [safeName, relativePath, file.type, file.size, altText, title, caption]
    );

    const newMedia = {
      id: result.id,
      filename: safeName,
      path: relativePath,
      mime_type: file.type,
      size: file.size,
      alt_text: altText,
      title,
      caption
    };

    return new Response(JSON.stringify({ success: true, media: newMedia }), {
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

// DELETE: Remove media file
export async function DELETE({ request }) {
  try {
    if (!checkAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Media ID required' }), { status: 400 });
    }

    // Get item from DB
    const item = await query.get("SELECT * FROM media WHERE id = ?", [id]);
    if (!item) {
      return new Response(JSON.stringify({ error: 'Media item not found' }), { status: 404 });
    }

    // Remove file from disk
    const absolutePath = path.join('public', item.path);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    // Delete record from DB
    await query.run("DELETE FROM media WHERE id = ?", [id]);

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
