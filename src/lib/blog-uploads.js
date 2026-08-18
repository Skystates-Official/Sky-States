import fs from 'fs/promises';
import path from 'path';

/**
 * Persist blog uploads where the Node adapter can serve them.
 * Dev: public/uploads/blogs
 * Prod: dist/client/uploads/blogs (and public/ for rebuilds)
 */
export function getBlogUploadDirs() {
  const publicDir = path.join(process.cwd(), 'public', 'uploads', 'blogs');
  const clientDir = path.join(process.cwd(), 'dist', 'client', 'uploads', 'blogs');
  const dirs = [publicDir];
  if (process.env.NODE_ENV === 'production') {
    dirs.push(clientDir);
  }
  return dirs;
}

export async function saveBlogUpload(file) {
  if (!file || !file.size) return '';

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = String(file.name || 'upload.bin').replace(/[^a-zA-Z0-9._-]+/g, '-');
  const fileName = `${Date.now()}-${safeName}`;
  const dirs = getBlogUploadDirs();

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), buffer);
  }

  return `/uploads/blogs/${fileName}`;
}

export async function deleteBlogUpload(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/blogs/')) return;

  const relative = imagePath.replace(/^\//, '');
  const candidates = [
    path.join(process.cwd(), 'public', relative),
    path.join(process.cwd(), 'dist', 'client', relative),
  ];

  for (const filePath of candidates) {
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore missing files
    }
  }
}
