import { query } from '../../db/sqlite.js';
import { sendConsultationFormEmail, sendConsultationAutoReplyEmail } from '../../lib/email.js';

export const prerender = false;

// Sliding Window Rate Limiting Setup (In-Memory)
const WINDOW_SIZE_MS = 15 * 60 * 1000; // 15 minutes sliding window
const MAX_REQUESTS = 3; // Max 3 requests per identifier per window
const rateLimitStore = new Map();

function isRateLimited(key) {
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE_MS;

  const timestamps = rateLimitStore.get(key) || [];
  const active = timestamps.filter(t => t > windowStart);

  if (active.length >= MAX_REQUESTS) {
    rateLimitStore.set(key, active);
    return true;
  }

  active.push(now);
  rateLimitStore.set(key, active);
  return false;
}

// Periodically clean up fully expired entries from the Map to prevent memory leaks (every 15 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const threshold = now - WINDOW_SIZE_MS;
    
    for (const [key, timestamps] of rateLimitStore.entries()) {
      const active = timestamps.filter(t => t > threshold);
      if (active.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, active);
      }
    }
  }, 15 * 60 * 1000); // Run sweeper every 15 minutes
}

export async function POST({ request, clientAddress }) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const phone = (body.phone || '').trim();
    const program = (body.program || '').trim();
    const queryText = (body.query || '').trim();

    // 1. DATA VALIDATION
    if (!name || name.length < 2 || name.length > 100) {
      return json({ error: 'Please provide a valid name (2-100 characters).' }, 400);
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Please provide a valid email address.' }, 400);
    }

    if (!phone || phone.length < 7 || phone.length > 20) {
      return json({ error: 'Please provide a valid mobile number.' }, 400);
    }

    if (!program) {
      return json({ error: 'Please select a program.' }, 400);
    }

    // Safety checks for HTML tag injection (XSS mitigation)
    if (/[<>]/.test(name) || /[<>]/.test(email) || /[<>]/.test(phone) || /[<>]/.test(queryText)) {
      return json({ error: 'HTML tags are not allowed in input fields.' }, 400);
    }

    // 2. RATE LIMITING (Sliding Window by IP and Mobile Number)
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = clientAddress || forwarded?.split(',')[0].trim() || '127.0.0.1';
    const ipKey = `ip:${clientIp}`;
    const phoneKey = `phone:${phone}`;

    if (isRateLimited(ipKey)) {
      return json({ error: 'You have submitted too many consultation requests recently. Please try again in 15 minutes.' }, 429);
    }

    if (isRateLimited(phoneKey)) {
      return json({ error: 'This phone number has submitted too many consultation requests recently. Please try again in 15 minutes.' }, 429);
    }

    // 3. DATABASE INGESTION (Save to SQLite forms table)
    await query.run(
      `INSERT INTO forms (form_name, data) VALUES (?, ?)`,
      [
        'consultation',
        JSON.stringify({
          name,
          email,
          phone,
          program,
          query: queryText,
          clientIp,
          createdAt: new Date().toISOString(),
        }),
      ]
    );

    // 4. NOTIFICATION EMAIL TO ADMIN
    try {
      await sendConsultationFormEmail({ name, email, phone, program, query: queryText });
    } catch (emailErr) {
      console.error('Failed to send consultation email:', emailErr);
    }

    // 5. AUTO-REPLY EMAIL TO USER
    try {
      await sendConsultationAutoReplyEmail({ name, email, program });
    } catch (autoReplyErr) {
      console.error('Failed to send consultation auto-reply:', autoReplyErr);
    }

    return json({ success: true, message: 'Thank you! Your career consultation request has been received. Our advisors will contact you shortly.' });
  } catch (error) {
    console.error('API consultation execution error:', error);
    return json({ error: error.message || 'Unable to submit request.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
