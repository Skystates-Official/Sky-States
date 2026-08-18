import { getSessionUser } from '../../../db/auth.js';
import { logActivity } from '../../../db/audit.js';

export const prerender = false;

function getClientIp(request) {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST({ request, cookies }) {
  try {
    const user = getSessionUser(request);
    
    if (user) {
      await logActivity(null, 'logout', `User ${user.username} logged out`, getClientIp(request));
    }

    cookies.delete('admin_session', { path: '/' });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred during logout.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
