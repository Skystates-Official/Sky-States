import fs from 'fs';
import path from 'path';
import { query } from '../../../db/sqlite.js';
import { requireAuth } from '../../../db/auth.js';

export const prerender = false;

export async function GET({ params, request }) {
  const user = requireAuth(request);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const media = await query.get('SELECT * FROM media WHERE id = ?', [params.id]);
    if (!media) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

    const versions = await query.all('SELECT * FROM file_versions WHERE media_id = ? ORDER BY created_at DESC', [params.id]);

    return new Response(JSON.stringify({ ...media, versions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function PUT({ params, request }) {
  const user = requireAuth(request);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const body = await request.json();
    const { title, alt_text, caption, description, access_level, allowed_roles } = body;

    await query.run(`
      UPDATE media 
      SET title = ?, alt_text = ?, caption = ?, description = ?, access_level = ?, allowed_roles = ?
      WHERE id = ?
    `, [title, alt_text, caption, description, access_level, allowed_roles, params.id]);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function DELETE({ params, request }) {
  const user = requireAuth(request);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const media = await query.get('SELECT * FROM media WHERE id = ?', [params.id]);
    if (!media) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

    const versions = await query.all('SELECT * FROM file_versions WHERE media_id = ?', [params.id]);

    // Delete files from disk
    try {
      const fullPath = path.join(process.cwd(), 'public', media.path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      
      for (const version of versions) {
        const vPath = path.join(process.cwd(), 'public', version.path);
        if (fs.existsSync(vPath)) fs.unlinkSync(vPath);
      }
    } catch (e) {
      console.warn('File already deleted or access denied:', e.message);
    }

    await query.run('DELETE FROM media WHERE id = ?', [params.id]);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function POST({ params, request }) {
  const user = requireAuth(request);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  // Handle replace file
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    const media = await query.get('SELECT * FROM media WHERE id = ?', [params.id]);
    if (!media) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

    // Track old version
    await query.run(`
      INSERT INTO file_versions (media_id, filename, path, size)
      VALUES (?, ?, ?, ?)
    `, [media.id, media.filename, media.path, media.size]);

    // Save new file
    const uploadDir = path.resolve('public/uploads');
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${originalName}`;
    const filePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const publicPath = `/uploads/${fileName}`;
    const mimeType = file.type || 'application/octet-stream';
    const size = file.size;

    // Update media record
    await query.run(`
      UPDATE media 
      SET filename = ?, path = ?, mime_type = ?, size = ?
      WHERE id = ?
    `, [originalName, publicPath, mimeType, size, params.id]);

    return new Response(JSON.stringify({ success: true, path: publicPath }), { status: 200 });
  } catch (err) {
    console.error('Replace Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
