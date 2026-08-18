import fs from 'fs';
import path from 'path';
import { query } from '../../../db/sqlite.js';
import { requireAuth, hasRole, ROLES } from '../../../db/auth.js';

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
          // If the user's role is not in the allowed roles array (and they aren't an admin), deny access.
          if (!allowed.includes(user.role) && user.role !== 'admin') {
             return new Response('Forbidden. You do not have the required role to access this file.', { status: 403 });
          }
        } catch(e) {
          // If JSON fails to parse, assume safe default (deny)
          return new Response('Forbidden', { status: 403 });
        }
      }
    }

    // Resolve the actual file path
    // If it's restricted, it's stored in data/uploads. Otherwise, public/uploads.
    let absolutePath;
    if (media.path.startsWith('/private/uploads/')) {
       const filename = path.basename(media.path);
       absolutePath = path.resolve('data/uploads', filename);
    } else {
       const filename = path.basename(media.path);
       absolutePath = path.resolve('public/uploads', filename);
    }

    if (!fs.existsSync(absolutePath)) {
      return new Response('File not found on disk', { status: 404 });
    }

    const fileStream = fs.createReadStream(absolutePath);
    
    return new Response(fileStream, {
      status: 200,
      headers: {
        'Content-Type': media.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${media.filename}"`,
        'Content-Length': media.size.toString()
      }
    });
  } catch (error) {
    console.error('Media Download error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
