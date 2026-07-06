import { query } from '../../db/sqlite.js';

export const prerender = false;

export async function POST({ request }) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const phone = (body.phone || '').trim();
    const plan = body.plan || '6';
    const courseName = (body.courseName || 'Sky States Program').trim();
    const tier = body.tier || 'normal';
    const checkoutMode = body.mode === 'full' ? 'full' : 'registration';

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Please provide a valid name and email address.' }, 400);
    }

    if (!phone || phone.length < 7) {
      return json({ error: 'Please provide a valid phone number.' }, 400);
    }

    await query.run(
      `INSERT INTO forms (form_name, data) VALUES (?, ?)`,
      [
        'emi_request',
        JSON.stringify({
          name,
          email,
          phone,
          planMonths: plan,
          courseName,
          tier,
          checkoutMode,
          createdAt: new Date().toISOString(),
        }),
      ]
    );

    return json({ success: true, message: 'Your EMI request has been received. An advisor will contact you within 1 business day.' });
  } catch (error) {
    return json({ error: error.message || 'Unable to submit request.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
