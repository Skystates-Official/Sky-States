import { query } from '../../db/sqlite.js';
import { sendReviewAdminEmail, sendReviewUserAutoReplyEmail } from '../../lib/email.js';

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
    const email = (body.email || '').trim().toLowerCase();
    const subject = (body.subject || '').trim();
    const message = (body.message || '').trim();

    // 1. INPUT VALIDATION & SANITIZATION
    if (!name || name.length < 2 || name.length > 100) {
      return json({ error: 'Name must be between 2 and 100 characters.' }, 400);
    }

    // Safety checks for HTML tag injection (XSS mitigation)
    if (/[<>]/.test(name) || /[<>]/.test(subject) || /[<>]/.test(message)) {
      return json({ error: 'HTML tags are not allowed in review entries.' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 150) {
      return json({ error: 'Please provide a valid email address.' }, 400);
    }

    if (!subject || subject.length < 3 || subject.length > 150) {
      return json({ error: 'Subject must be between 3 and 150 characters.' }, 400);
    }

    if (!message || message.length < 10 || message.length > 2000) {
      return json({ error: 'Review text must be between 10 and 2000 characters.' }, 400);
    }

    // Link/URL Spam Check (URLs are forbidden in reviews to prevent bot advertisement)
    if (/\bhttps?:\/\/\S+/i.test(message) || /\bwww\.\S+/i.test(message)) {
      return json({ error: 'Website URLs or links are not allowed in the review content.' }, 400);
    }

    // Common spam keyword validation (case-insensitive filter)
    const spamKeywords = ['casino', 'lottery', 'crypto double', 'buy bitcoin', 'viagra', 'seo rank', 'pills'];
    const lowerMessage = message.toLowerCase();
    const containsSpam = spamKeywords.some(keyword => lowerMessage.includes(keyword));
    if (containsSpam) {
      return json({ error: 'Your review matches common patterns flagged by our spam filter.' }, 400);
    }

    // 2. RATE LIMITING (Sliding Window by IP and Email Address)
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = clientAddress || forwarded?.split(',')[0].trim() || '127.0.0.1';
    const ipKey = `ip:${clientIp}`;
    const emailKey = `email:${email}`;

    if (isRateLimited(ipKey)) {
      return json({ error: 'You have submitted too many reviews recently. Please try again in 15 minutes.' }, 429);
    }

    if (isRateLimited(emailKey)) {
      return json({ error: 'This email address has submitted too many reviews recently. Please try again in 15 minutes.' }, 429);
    }

    // 3. DATABASE INGESTION (Save to SQLite forms table)
    await query.run(
      `INSERT INTO forms (form_name, data) VALUES (?, ?)`,
      [
        'review',
        JSON.stringify({
          name,
          email,
          subject,
          message,
          clientIp,
          createdAt: new Date().toISOString(),
        }),
      ]
    );

    // 4. NOTIFICATION & ACKNOWLEDGEMENT EMAILS (Asynchronous triggers)
    try {
      // Alert Admin
      await sendReviewAdminEmail({ name, email, subject, message });
    } catch (adminEmailErr) {
      console.error('Failed to email admin about review:', adminEmailErr);
    }

    try {
      // Auto-reply to Student
      await sendReviewUserAutoReplyEmail({ name, email });
    } catch (userEmailErr) {
      console.error('Failed to auto-reply to user review:', userEmailErr);
    }

    return json({ success: true, message: 'Review submitted successfully — thank you for your feedback!' });
  } catch (error) {
    console.error('API reviews execution error:', error);
    return json({ error: error.message || 'Unable to submit review.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
