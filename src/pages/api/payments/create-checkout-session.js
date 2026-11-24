// STRIPE COMMENTED OUT: Payment method switched to Whop
// import { getStripe } from '../../../lib/stripe.js';
// import { buildCheckoutSessionParams } from '../../../lib/stripe-checkout.js';
import { calculateCheckoutTotal } from '../../../lib/pricing.js';
import { generateOrderRef, createOrder } from '../../../lib/orders.js';
import { createWhopCheckout } from '../../../lib/whop.js';

export const prerender = false;

const SITE_URL = (import.meta.env.SITE_URL || process.env.SITE_URL || 'https://skystates.us').replace(/\/+$/, '');

export async function POST({ request }) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || '').trim();
    const courseName = (body.courseName || 'Sky States Program').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'A valid email address is required.' }, 400);
    }

    const orderRef = generateOrderRef();

    const pricing = await calculateCheckoutTotal({
      mode: body.mode,
      tier: body.tier,
      couponCode: body.couponCode,
      courseName,
    });

    if (pricing.total === 0) {
      return json({
        freeCheckout: true,
        amount: 0,
        orderRef,
        message: 'No payment required for this order.',
      });
    }

    const totalDue = pricing.total;
    const chargeAmount = totalDue;

    const amountCents = Math.round(chargeAmount * 100);
    if (amountCents < 50) {
      return json({ error: 'Payment amount must be at least $0.50.' }, 400);
    }

    // Persist pending order to database so order tracking and success verification work seamlessly
    await createOrder({
      orderRef,
      email,
      name,
      courseName,
      totalDue,
      checkoutMode: pricing.checkoutMode || body.mode || 'registration',
      tier: pricing.selectedTier || body.tier || 'normal',
      couponCode: pricing.couponCode || body.couponCode || '',
    });

    /* =========================================================================
     * STRIPE CHECKOUT (COMMENTED OUT - SWAPPED TO WHOP)
     * =========================================================================
     * const stripe = getStripe();
     * const tierLabel = (pricing.selectedTier || body.tier) === '1on1' ? 'Personalised Classes' : 'Batch Classes';
     * const modeLabel = (pricing.checkoutMode || body.mode) === 'full' ? 'Full Program' : 'Intro Session';
     * const session = await stripe.checkout.sessions.create(
     *   buildCheckoutSessionParams({
     *     email,
     *     name,
     *     courseLabel: courseName,
     *     paymentLabel: modeLabel,
     *     tierLabel,
     *     couponCode: pricing.couponCode || body.couponCode || '',
     *     amountCents,
     *     orderRef,
     *     totalDue,
     *     chargeAmount,
     *     paymentStyle: 'full',
     *     checkoutMode: pricing.checkoutMode || body.mode || 'registration',
     *     tier: pricing.selectedTier || body.tier || 'normal',
     *     successUrl: `${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
     *     cancelUrl: `${SITE_URL}/checkout?canceled=1`,
     *   })
     * );
     * return json({ url: session.url, sessionId: session.id, amount: chargeAmount, totalDue, orderRef });
     * ========================================================================= */

    // WHOP CHECKOUT SESSION / REDIRECT
    let baseSiteUrl = SITE_URL;
    try {
      const requestOrigin = new URL(request.url).origin;
      if (requestOrigin && requestOrigin !== 'null') {
        baseSiteUrl = requestOrigin.replace(/\/+$/, '');
      }
    } catch (_) {}

    const successUrl = `${baseSiteUrl}/checkout/success?order_ref=${orderRef}`;
    const cancelUrl = `${baseSiteUrl}/checkout?canceled=1`;

    const whopSession = await createWhopCheckout({
      email,
      name,
      courseName,
      totalDue,
      orderRef,
      mode: pricing.checkoutMode || body.mode || 'registration',
      tier: pricing.selectedTier || body.tier || 'normal',
      couponCode: pricing.couponCode || body.couponCode || '',
      successUrl,
      cancelUrl,
    });

    return json({
      url: whopSession.url,
      sessionId: whopSession.id || orderRef,
      amount: chargeAmount,
      totalDue,
      orderRef,
    });
  } catch (error) {
    console.error('Create Whop checkout session error:', error);
    return json({ error: error.message || 'Unable to start checkout.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
