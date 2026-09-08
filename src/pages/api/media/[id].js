import fs from 'fs';
import path from 'path';
import { query } from '../../../db/sqlite.js';
import { requireAuth } from '../../../db/auth.js';

import { uploadToR2, deleteFromR2 } from '../../../lib/r2.js';

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

    // Delete files from R2
    try {
      const pathsToDelete = [media.path, ...versions.map(v => v.path)];
      
      for (const p of pathsToDelete) {
        if (p.startsWith('http')) {
          const urlObj = new URL(p);
          const key = urlObj.pathname.replace(/^\//, '');
          await deleteFromR2(key);
        } else if (p.startsWith('private/') || p.startsWith('public/')) {
          await deleteFromR2(p);
        }
      }
    } catch (e) {
      console.warn('Failed to delete file from R2:', e.message);
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
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${originalName}`;
    
    // We'll determine if it's private based on the current access level
    const isPrivate = media.access_level === 'restricted';
    const keyPrefix = isPrivate ? 'private/' : 'public/';
    const key = `${keyPrefix}${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    
    let newPath;
    if (isPrivate) {
      await uploadToR2(key, buffer, file.type || 'application/octet-stream');
      newPath = key;
    } else {
      newPath = await uploadToR2(key, buffer, file.type || 'application/octet-stream');
    }

    const mimeType = file.type || 'application/octet-stream';
    const size = file.size;

    // Update media record
    await query.run(`
      UPDATE media 
      SET filename = ?, path = ?, mime_type = ?, size = ?
      WHERE id = ?
    `, [originalName, newPath, mimeType, size, params.id]);

    return new Response(JSON.stringify({ success: true, path: newPath }), { status: 200 });
  } catch (err) {
    console.error('Replace Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
