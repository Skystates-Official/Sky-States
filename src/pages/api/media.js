import fs from 'fs';
import path from 'path';
import { query } from '../../db/sqlite.js';
import { requireAuth } from '../../db/auth.js';
import { logActivity } from '../../db/audit.js';

export const prerender = false;

const UPLOADS_DIR = path.resolve('public/uploads');
const PRIVATE_UPLOADS_DIR = path.resolve('data/uploads');

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
    const accessLevel = formData.get('access_level') || 'public';
    let allowedRoles = formData.get('allowed_roles') || null;
    
    // Ensure allowed_roles is a valid JSON array or null
    if (allowedRoles) {
      try {
        const parsed = JSON.parse(allowedRoles);
        if (!Array.isArray(parsed)) allowedRoles = null;
      } catch(e) {
        allowedRoles = null;
      }
    }

    if (!file || !(file instanceof File)) {
      return json({ error: 'No file uploaded' }, 400);
    }

    const safeName = Date.now() + '_' + path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    
    const isPrivate = accessLevel === 'restricted';
    const activeDir = isPrivate ? PRIVATE_UPLOADS_DIR : UPLOADS_DIR;

    if (!fs.existsSync(activeDir)) {
      fs.mkdirSync(activeDir, { recursive: true });
    }

    const targetPath = path.join(activeDir, safeName);
    const relativePath = isPrivate ? `/private/uploads/${safeName}` : `/uploads/${safeName}`;

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
      `INSERT INTO media (filename, path, mime_type, size, alt_text, title, caption, description, dimensions, uploaded_by, access_level, allowed_roles) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [safeName, relativePath, file.type, file.size, altText, title, caption, description, dimensions, user.id || null, accessLevel, allowedRoles]
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
    
    // File Replacement Logic
    if (fileToReplace && fileToReplace instanceof File) {
      // 1. Back up old file to file_versions
      await query.run(
        `INSERT INTO file_versions (media_id, filename, path, size) VALUES (?, ?, ?, ?)`,
        [id, existing.filename, existing.path, existing.size]
      );
      
      // 2. Upload new file
      newFilename = Date.now() + '_v2_' + path.basename(fileToReplace.name).replace(/[^a-zA-Z0-9._-]/g, '_');
      const isPrivate = existing.access_level === 'restricted';
      const activeDir = isPrivate ? PRIVATE_UPLOADS_DIR : UPLOADS_DIR;

      if (!fs.existsSync(activeDir)) {
        fs.mkdirSync(activeDir, { recursive: true });
      }

      const targetPath = path.join(activeDir, newFilename);
      newPath = isPrivate ? `/private/uploads/${newFilename}` : `/uploads/${newFilename}`;
      newSize = fileToReplace.size;
      newMimeType = fileToReplace.type;

      const buffer = Buffer.from(await fileToReplace.arrayBuffer());
      fs.writeFileSync(targetPath, buffer);
    }

    const title = body.title !== undefined && body.title !== null ? body.title : existing.title;
    const altText = body.alt_text !== undefined && body.alt_text !== null ? body.alt_text : existing.alt_text;
    const caption = body.caption !== undefined && body.caption !== null ? body.caption : existing.caption;
    const description = body.description !== undefined && body.description !== null ? body.description : existing.description;
    
    // Optional permissions update
    const accessLevel = body.access_level || existing.access_level;
    let allowedRoles = body.allowed_roles !== undefined ? body.allowed_roles : existing.allowed_roles;
    if (body.allowed_roles && typeof body.allowed_roles === 'string') {
       try { allowedRoles = JSON.parse(body.allowed_roles); } catch(e) {}
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
