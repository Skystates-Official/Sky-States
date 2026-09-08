import path from 'path';
import { query } from '../../../db/sqlite.js';
import { requireAuth } from '../../../db/auth.js';
import { getPresignedUrlR2, R2_PUBLIC_URL } from '../../../lib/r2.js';

export const prerender = false;

export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response('Media ID is required', { status: 400 });
    }

    const media = await query.get("SELECT * FROM media WHERE id = ?", [id]);
    
    if (!media) {
      return new Response('File not found', { status: 404 });
    }

    // Security Check
    if (media.access_level === 'restricted') {
      const user = requireAuth(request);
      if (!user) {
        return new Response('Unauthorized. Please log in to download this file.', { status: 401 });
      }

      // Check allowed_roles if specified
      if (media.allowed_roles) {
        try {
          const allowed = JSON.parse(media.allowed_roles);
          if (!allowed.includes(user.role) && user.role !== 'admin') {
             return new Response('Forbidden. You do not have the required role to access this file.', { status: 403 });
          }
        } catch(e) {
          return new Response('Forbidden', { status: 403 });
        }
      }
    }

    // Resolve the actual file path
    // If it's a public URL already, redirect to it
    if (media.path.startsWith('http')) {
      return Response.redirect(media.path, 302);
    }
    
    // If it's a private key or legacy local path that got migrated
    let r2Key = media.path;
    if (r2Key.startsWith('/private/uploads/')) {
        r2Key = `private/${path.basename(r2Key)}`;
    } else if (r2Key.startsWith('/uploads/')) {
        r2Key = `public/${path.basename(r2Key)}`;
    }

    // If it's restricted, we generate a presigned URL to let them download it securely
    if (media.access_level === 'restricted') {
      try {
        const presignedUrl = await getPresignedUrlR2(r2Key, 3600); // 1 hour expiration
        return Response.redirect(presignedUrl, 302);
      } catch (err) {
        console.error('Presigned URL error:', err);
        return new Response('Failed to generate secure download link', { status: 500 });
      }
    } else {
      // Public file, redirect to R2 public URL
      // If it somehow doesn't have http yet (legacy), construct it
      return Response.redirect(`${R2_PUBLIC_URL}/${r2Key}`, 302);
    }
  } catch (error) {
    console.error('Media Download error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
