import fs from 'fs';
import path from 'path';
import { query } from '../../../db/sqlite.js';
import { requireAuth } from '../../../db/auth.js';

export const prerender = false;

export async function POST({ request }) {
  const user = requireAuth(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    const uploadDir = path.resolve('public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${originalName}`;
    const filePath = path.join(uploadDir, fileName);

    // Save to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const publicPath = `/uploads/${fileName}`;

    // Default metadata
    const mimeType = file.type || 'application/octet-stream';
    const size = file.size;
    const title = originalName.split('.')[0];
    const altText = title;

    // Insert into database
    const result = await query.run(`
      INSERT INTO media (filename, path, mime_type, size, title, alt_text, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [originalName, publicPath, mimeType, size, title, altText, user.id]);

    const newMedia = await query.get('SELECT * FROM media WHERE id = ?', [result.id]);

    return new Response(JSON.stringify(newMedia), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to upload file' }), { status: 500 });
  }
}
