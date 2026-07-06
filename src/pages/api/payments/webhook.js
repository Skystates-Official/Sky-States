import { getStripe } from '../../../lib/stripe.js';
import { finalizeCheckoutSession } from '../../../lib/checkout.js';
import { query } from '../../../db/sqlite.js';

export const prerender = false;

export async function POST({ request }) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured.');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook verification failed:', error.message);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  try {
    await logWebhookEvent(event);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSession(event.data.object, stripe);
        break;

      case 'checkout.session.async_payment_succeeded':
        await handleCheckoutSession(event.data.object, stripe, { forceFinalize: true });
        break;

      case 'checkout.session.async_payment_failed':
        await handleAsyncPaymentFailed(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await logPaymentFailure(event.data.object);
        break;

      default:
        break;
    }
  } catch (error) {
    console.error(`Stripe webhook handler error (${event.type}):`, error);
    return new Response('Webhook handler failed', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleCheckoutSession(session, stripe, { forceFinalize = false } = {}) {
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['payment_intent.payment_method'],
  });

  const shouldFinalize =
    fullSession.payment_status === 'paid' || (forceFinalize && fullSession.status === 'complete');

  if (!shouldFinalize) {
    console.log(`Checkout session ${session.id} completed but payment not yet confirmed.`);
    return;
  }

  await finalizeCheckoutSession(fullSession);
}

async function handleAsyncPaymentFailed(session) {
  const metadata = session.metadata || {};
  await query.run(`INSERT INTO forms (form_name, data) VALUES (?, ?)`, [
    'stripe_payment_failed',
    JSON.stringify({
      sessionId: session.id,
      orderRef: metadata.orderRef || '',
      email: session.customer_email || metadata.customerEmail || '',
      createdAt: new Date().toISOString(),
    }),
  ]);
}

async function logPaymentFailure(paymentIntent) {
  await query.run(`INSERT INTO forms (form_name, data) VALUES (?, ?)`, [
    'stripe_payment_failed',
    JSON.stringify({
      paymentIntentId: paymentIntent.id,
      amount: (paymentIntent.amount || 0) / 100,
      email: paymentIntent.metadata?.customerEmail || paymentIntent.receipt_email || '',
      lastError: paymentIntent.last_payment_error?.message || '',
      createdAt: new Date().toISOString(),
    }),
  ]);
}

async function logWebhookEvent(event) {
  await query.run(`INSERT INTO forms (form_name, data) VALUES (?, ?)`, [
    'stripe_webhook',
    JSON.stringify({
      eventId: event.id,
      type: event.type,
      createdAt: new Date().toISOString(),
    }),
  ]);
}
