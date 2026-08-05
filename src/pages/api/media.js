import fs from 'fs';
import path from 'path';
import { query } from '../../db/sqlite.js';
import { requireAuth } from '../../db/auth.js';
import { logActivity } from '../../db/audit.js';

export const prerender = false;

const UPLOADS_DIR = path.resolve('public/uploads');

function getClientIp(request) {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const type = url.searchParams.get('type'); // e.g. 'image', 'video', 'document'

    let sql = `
      SELECT m.*, u.username as uploaded_by_username
      FROM media m
      LEFT JOIN users u ON m.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      if (type === 'image') {
        sql += " AND m.mime_type LIKE 'image/%'";
      } else if (type === 'video') {
        sql += " AND m.mime_type LIKE 'video/%'";
      } else if (type === 'document') {
        sql += " AND m.mime_type NOT LIKE 'image/%' AND m.mime_type NOT LIKE 'video/%'";
      }
    }

    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const items = await query.all(sql, params);

    // Get count
    let countSql = "SELECT COUNT(*) as count FROM media m WHERE 1=1";
    if (type) {
      if (type === 'image') countSql += " AND m.mime_type LIKE 'image/%'";
      else if (type === 'video') countSql += " AND m.mime_type LIKE 'video/%'";
      else if (type === 'document') countSql += " AND m.mime_type NOT LIKE 'image/%' AND m.mime_type NOT LIKE 'video/%'";
    }
    const countRes = await query.get(countSql);

    return json({
      media: items,
      pagination: {
        total: countRes ? countRes.count : 0,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Media GET error:', error);
    return json({ error: 'Failed to fetch media' }, 500);
  }
}

export async function POST({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const altText = formData.get('alt_text') || '';
    const title = formData.get('title') || '';
    const caption = formData.get('caption') || '';
    const description = formData.get('description') || '';
    let dimensions = formData.get('dimensions') || '';

    if (!file || !(file instanceof File)) {
      return json({ error: 'No file uploaded' }, 400);
    }

    const safeName = Date.now() + '_' + path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const targetPath = path.join(UPLOADS_DIR, safeName);
    const relativePath = `/uploads/${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(targetPath, buffer);

    // Try to get dimensions for images if not provided by client
    if (!dimensions && file.type.startsWith('image/')) {
        try {
            const sharp = (await import('sharp')).default;
            const metadata = await sharp(buffer).metadata();
            if (metadata.width && metadata.height) {
                dimensions = `${metadata.width}x${metadata.height}`;
            }
        } catch (e) {
            // sharp not available or failed, ignore
        }
    }

    const result = await query.run(
      `INSERT INTO media (filename, path, mime_type, size, alt_text, title, caption, description, dimensions, uploaded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [safeName, relativePath, file.type, file.size, altText, title, caption, description, dimensions, user.id || null]
    );

    await logActivity(user.id, 'upload_media', `Uploaded file: ${safeName}`, getClientIp(request));

    const newMedia = await query.get("SELECT * FROM media WHERE id = ?", [result.id]);

    return json({ success: true, media: newMedia }, 201);
  } catch (error) {
    console.error('Media POST error:', error);
    return json({ error: 'Failed to upload media' }, 500);
  }
}

export async function PUT({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await request.json();
    const id = body.id;

    if (!id) return json({ error: 'Media ID required' }, 400);

    const existing = await query.get("SELECT * FROM media WHERE id = ?", [id]);
    if (!existing) return json({ error: 'Media not found' }, 404);

    const title = body.title !== undefined ? body.title : existing.title;
    const altText = body.alt_text !== undefined ? body.alt_text : existing.alt_text;
    const caption = body.caption !== undefined ? body.caption : existing.caption;
    const description = body.description !== undefined ? body.description : existing.description;

    await query.run(
      `UPDATE media SET title = ?, alt_text = ?, caption = ?, description = ? WHERE id = ?`,
      [title, altText, caption, description, id]
    );

    await logActivity(user.id, 'update_media', `Updated metadata for media: ${existing.filename}`, getClientIp(request));

    const updatedMedia = await query.get("SELECT * FROM media WHERE id = ?", [id]);
    return json(updatedMedia);
  } catch (error) {
    console.error('Media PUT error:', error);
    return json({ error: 'Failed to update media' }, 500);
  }
}

export async function DELETE({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const { id } = await request.json();
    if (!id) return json({ error: 'Media ID required' }, 400);

    const item = await query.get("SELECT * FROM media WHERE id = ?", [id]);
    if (!item) return json({ error: 'Media item not found' }, 404);

    const absolutePath = path.join('public', item.path);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await query.run("DELETE FROM media WHERE id = ?", [id]);
    await logActivity(user.id, 'delete_media', `Deleted file: ${item.filename}`, getClientIp(request));

    return json({ success: true });
  } catch (error) {
    console.error('Media DELETE error:', error);
    return json({ error: 'Failed to delete media' }, 500);
  }
}
