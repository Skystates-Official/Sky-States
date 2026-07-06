import { getStripe } from '../../../lib/stripe.js';
import { calculateCheckoutTotal } from '../../../lib/pricing.js';

export const prerender = false;

export async function POST({ request }) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || '').trim();
    const courseName = (body.courseName || 'Sky States Program').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'A valid email address is required.' }, 400);
    }

    const pricing = await calculateCheckoutTotal({
      mode: body.mode,
      tier: body.tier,
      couponCode: body.couponCode,
    });

    if (pricing.total === 0) {
      return json({
        freeCheckout: true,
        amount: 0,
        message: 'No payment required for this order.',
      });
    }

    if (pricing.amountCents < 50) {
      return json({ error: 'Order total must be at least $0.50.' }, 400);
    }

    if (pricing.amountCents > 500000) {
      return json({ error: 'Order total exceeds the maximum allowed amount.' }, 400);
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.amountCents,
      currency: 'usd',
      receipt_email: email,
      metadata: {
        customerEmail: email,
        customerName: name || 'Customer',
        courseName,
        checkoutMode: pricing.checkoutMode,
        tier: pricing.selectedTier,
        couponCode: pricing.couponCode,
        basePrice: String(pricing.basePrice),
        discount: String(pricing.discount),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return json({
      clientSecret: paymentIntent.client_secret,
      amount: pricing.total,
      currency: 'usd',
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    return json({ error: error.message || 'Unable to start payment.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
