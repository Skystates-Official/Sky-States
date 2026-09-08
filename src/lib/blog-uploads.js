import { uploadToR2, deleteFromR2, R2_PUBLIC_URL } from './r2.js';

export async function saveBlogUpload(file) {
  if (!file || !file.size) return '';

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = String(file.name || 'upload.bin').replace(/[^a-zA-Z0-9._-]+/g, '-');
  const fileName = `${Date.now()}-${safeName}`;
  const key = `blogs/${fileName}`;

  return await uploadToR2(key, buffer, file.type || 'application/octet-stream');
}

export async function deleteBlogUpload(imagePath) {
  if (!imagePath || !imagePath.startsWith(R2_PUBLIC_URL + '/blogs/')) return;
  
  const key = imagePath.replace(R2_PUBLIC_URL + '/', '');
  try {
    await deleteFromR2(key);
  } catch (error) {
    console.error('Failed to delete blog upload from R2:', error);
  }
}
