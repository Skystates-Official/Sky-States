


import path from 'path';
import { query } from '../../../db/sqlite.js';
import { requireAuth } from '../../../db/auth.js';
import { logActivity } from '../../../db/audit.js';
import { uploadToR2, deleteFromR2 } from '../../../lib/r2.js';

export const prerender = false;

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
    const search = url.searchParams.get('search') || '';
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

    if (search) {
      sql += ' AND (m.title LIKE ? OR m.filename LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

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
    const countParams = [];
    if (search) {
      countSql += " AND (m.title LIKE ? OR m.filename LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (type) {
      if (type === 'image') countSql += " AND m.mime_type LIKE 'image/%'";
      else if (type === 'video') countSql += " AND m.mime_type LIKE 'video/%'";
      else if (type === 'document') countSql += " AND m.mime_type NOT LIKE 'image/%' AND m.mime_type NOT LIKE 'video/%'";
    }
    const countRes = await query.get(countSql, countParams);

    return json({
      media: items,
      items: items,
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
    const accessLevel = formData.get('access_level') || 'public';
    let allowedRoles = formData.get('allowed_roles') || null;

    if (allowedRoles) {
      try {
        const parsed = JSON.parse(allowedRoles);
        if (!Array.isArray(parsed)) allowedRoles = null;
      } catch (e) {
        allowedRoles = null;
      }
    }

    if (!file || typeof file === 'string' || !(file instanceof File || file instanceof Blob)) {
      return json({ error: 'No file uploaded' }, 400);
    }

    const originalName = file.name || 'upload.bin';
    const safeName = Date.now() + '_' + path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');

    const isPrivate = accessLevel === 'restricted';
    const keyPrefix = isPrivate ? 'private/' : 'public/';
    const key = `${keyPrefix}${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    let relativePath;
    if (isPrivate) {
      await uploadToR2(key, buffer, file.type || 'application/octet-stream');
      relativePath = key;
    } else {
      relativePath = await uploadToR2(key, buffer, file.type || 'application/octet-stream');
    }

    // Try sharp for dimensions if image
    if (!dimensions && file.type && file.type.startsWith('image/')) {
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
      `INSERT INTO media (filename, path, mime_type, size, alt_text, title, caption, description, dimensions, uploaded_by, access_level, allowed_roles) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [safeName, relativePath, file.type || 'application/octet-stream', file.size || buffer.length, altText, title, caption, description, dimensions, user.id || null, accessLevel, allowedRoles]
    );

    await logActivity(user.id, 'upload_media', `Uploaded file: ${safeName}`, getClientIp(request));

    const newMedia = await query.get("SELECT * FROM media WHERE id = ?", [result.id]);

    return json({
      success: true,
      media: newMedia,
      ...newMedia
    }, 201);
  } catch (error) {
    console.error('Media POST error:', error);
    return json({ error: 'Failed to upload media: ' + (error.message || 'Unknown error') }, 500);
  }
}

export async function PUT({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const contentType = request.headers.get('content-type') || '';
    let body = {};
    let fileToReplace = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {
        id: formData.get('id'),
        title: formData.get('title'),
        alt_text: formData.get('alt_text'),
        caption: formData.get('caption'),
        description: formData.get('description'),
        access_level: formData.get('access_level'),
        allowed_roles: formData.get('allowed_roles')
      };
      fileToReplace = formData.get('file');
    } else {
      body = await request.json();
    }

    const id = body.id;
    if (!id) return json({ error: 'Media ID required' }, 400);

    const existing = await query.get("SELECT * FROM media WHERE id = ?", [id]);
    if (!existing) return json({ error: 'Media not found' }, 404);

    let newFilename = existing.filename;
    let newPath = existing.path;
    let newSize = existing.size;
    let newMimeType = existing.mime_type;

    if (fileToReplace && (fileToReplace instanceof File || fileToReplace instanceof Blob)) {
      await query.run(
        `INSERT INTO file_versions (media_id, filename, path, size) VALUES (?, ?, ?, ?)`,
        [id, existing.filename, existing.path, existing.size]
      );

      const origName = fileToReplace.name || 'replacement.bin';
      newFilename = Date.now() + '_v2_' + path.basename(origName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const isPrivate = existing.access_level === 'restricted';
      const keyPrefix = isPrivate ? 'private/' : 'public/';
      const key = `${keyPrefix}${newFilename}`;

      const buffer = Buffer.from(await fileToReplace.arrayBuffer());

      if (isPrivate) {
        await uploadToR2(key, buffer, fileToReplace.type || 'application/octet-stream');
        newPath = key;
      } else {
        newPath = await uploadToR2(key, buffer, fileToReplace.type || 'application/octet-stream');
      }

      newSize = fileToReplace.size || buffer.length;
      newMimeType = fileToReplace.type || 'application/octet-stream';
    }

    const title = body.title !== undefined && body.title !== null ? body.title : existing.title;
    const altText = body.alt_text !== undefined && body.alt_text !== null ? body.alt_text : existing.alt_text;
    const caption = body.caption !== undefined && body.caption !== null ? body.caption : existing.caption;
    const description = body.description !== undefined && body.description !== null ? body.description : existing.description;

    const accessLevel = body.access_level || existing.access_level;
    let allowedRoles = body.allowed_roles !== undefined ? body.allowed_roles : existing.allowed_roles;
    if (body.allowed_roles && typeof body.allowed_roles === 'string') {
      try { allowedRoles = JSON.parse(body.allowed_roles); } catch (e) {}
      allowedRoles = Array.isArray(allowedRoles) ? JSON.stringify(allowedRoles) : null;
    } else if (Array.isArray(body.allowed_roles)) {
      allowedRoles = JSON.stringify(body.allowed_roles);
    }

    await query.run(
      `UPDATE media SET title = ?, alt_text = ?, caption = ?, description = ?, filename = ?, path = ?, size = ?, mime_type = ?, access_level = ?, allowed_roles = ? WHERE id = ?`,
      [title, altText, caption, description, newFilename, newPath, newSize, newMimeType, accessLevel, allowedRoles, id]
    );

    await logActivity(user.id, 'update_media', `Updated media: ${existing.filename} ${fileToReplace ? '(File Replaced)' : ''}`, getClientIp(request));

    const updatedMedia = await query.get("SELECT * FROM media WHERE id = ?", [id]);
    return json({
      success: true,
      media: updatedMedia,
      ...updatedMedia
    });
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

    try {
      if (item.path.startsWith('http')) {
        const urlObj = new URL(item.path);
        const key = urlObj.pathname.replace(/^\//, '');
        await deleteFromR2(key);
      } else {
        if (item.path.startsWith('private/') || item.path.startsWith('public/')) {
          await deleteFromR2(item.path);
        }
      }
    } catch (e) {
      console.warn('Failed to delete file from R2:', e.message);
    }

    const userRecord = await query.get('SELECT id FROM users WHERE username = ?', [user.username]);
    const userId = userRecord ? userRecord.id : null;

    await query.run("DELETE FROM media WHERE id = ?", [id]);
    await logActivity(userId, 'delete_media', `Deleted file: ${item.filename}`, getClientIp(request));

    return json({ success: true });
  } catch (error) {
    console.error('Media DELETE error:', error);
    return json({ error: 'Failed to delete media' }, 500);
  }
}
