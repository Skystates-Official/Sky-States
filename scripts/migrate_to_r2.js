import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { uploadToR2, R2_PUBLIC_URL } from '../src/lib/r2.js';
import { query } from '../src/db/sqlite.js';

async function migrateFile(filePath, keyPrefix) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.log(`Skipping (not found on disk): ${filePath}`);
    return null;
  }

  const filename = path.basename(absolutePath);
  const key = `${keyPrefix}${filename}`;
  const buffer = fs.readFileSync(absolutePath);
  
  // Basic mime type detection
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
    '.pdf': 'application/pdf'
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  console.log(`Uploading ${filename} to R2 key: ${key}`);
  const r2Url = await uploadToR2(key, buffer, mimeType);
  return { key, url: r2Url };
}

async function migrateBlogs() {
  console.log('Migrating blog images...');
  const blogs = await query.all("SELECT id, image FROM blogs WHERE image IS NOT NULL AND image != '' AND image NOT LIKE 'http%'");
  
  for (const blog of blogs) {
    if (blog.image.startsWith('/uploads/blogs/')) {
      const localPath = path.join('public', blog.image); // public/uploads/blogs/...
      const result = await migrateFile(localPath, 'blogs/');
      if (result) {
        await query.run("UPDATE blogs SET image = ? WHERE id = ?", [result.url, blog.id]);
        console.log(`Updated blog ${blog.id}`);
      }
    }
  }
}

async function migrateMedia() {
  console.log('Migrating media library...');
  const mediaItems = await query.all("SELECT id, path, access_level FROM media WHERE path NOT LIKE 'http%'");
  
  for (const item of mediaItems) {
    let localPath;
    let keyPrefix;
    if (item.access_level === 'restricted' || item.path.startsWith('/private/')) {
      localPath = path.join('data/uploads', path.basename(item.path));
      keyPrefix = 'private/';
    } else {
      localPath = path.join('public/uploads', path.basename(item.path));
      keyPrefix = 'public/';
    }

    const result = await migrateFile(localPath, keyPrefix);
    if (result) {
      const newPath = item.access_level === 'restricted' ? result.key : result.url;
      await query.run("UPDATE media SET path = ? WHERE id = ?", [newPath, item.id]);
      console.log(`Updated media ${item.id}`);
    }
  }
}

async function run() {
  try {
    await migrateBlogs();
    await migrateMedia();
    console.log('Migration completed.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

run();
