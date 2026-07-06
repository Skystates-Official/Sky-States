import { calculateCheckoutTotal } from '../../../lib/pricing.js';
import { finalizeFreeCheckout } from '../../../lib/checkout.js';

export const prerender = false;

export async function POST({ request }) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'A valid email address is required.' }, 400);
    }

    const pricing = await calculateCheckoutTotal({
      mode: body.mode,
      tier: body.tier,
      couponCode: body.couponCode,
    });

    if (pricing.total !== 0) {
      return json({ error: 'This order requires payment.' }, 400);
    }

    const result = await finalizeFreeCheckout({
      email,
      name,
      courseName: body.courseName || 'Sky States Program',
      mode: pricing.checkoutMode,
      tier: pricing.selectedTier,
    });

    return json({ success: true, orderRef: result.orderRef, emailSent: result.emailResult?.sent === true });
  } catch (error) {
    console.error('Free checkout error:', error);
    return json({ error: error.message || 'Unable to complete checkout.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
