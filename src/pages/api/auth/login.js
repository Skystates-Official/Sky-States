import { authenticateUser, createSessionToken } from '../../../db/auth.js';
import { logActivity } from '../../../db/audit.js';

export const prerender = false;

function getClientIp(request) {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST({ request, cookies }) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await authenticateUser(username, password);
    const ip = getClientIp(request);

    if (user) {
      const token = createSessionToken(user.username, user.role);
      
      cookies.set('admin_session', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 86400
      });

      await logActivity(user.id, 'login', 'User logged in successfully', ip);

      return new Response(JSON.stringify({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      await logActivity(null, 'failed_login', `Failed login attempt for username: ${username}`, ip);
      return new Response(JSON.stringify({ error: 'Invalid credentials. Please try again.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred during authentication.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
