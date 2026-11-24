// STRIPE WEBHOOK (COMMENTED OUT - SWAPPED TO WHOP)
// import { getStripe } from '../../../lib/stripe.js';
// import { finalizeCheckoutSession } from '../../../lib/checkout.js';
import { query } from '../../../db/sqlite.js';
import { finalizeWhopPayment, verifyWhopWebhook } from '../../../lib/whop.js';

export const prerender = false;

export async function POST({ request }) {
  /* =========================================================================
   * STRIPE WEBHOOK (COMMENTED OUT)
   * =========================================================================
   * const stripe = getStripe();
   * const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
   * const signature = request.headers.get('stripe-signature');
   * const rawBody = await request.text();
   * ...
   * ========================================================================= */

  // WHOP WEBHOOK HANDLER
  try {
    const rawBody = await request.text();
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

    // Convert Request headers to a simple dictionary
    const headers = {};
    request.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    const event = verifyWhopWebhook(rawBody, headers, webhookSecret);
    const eventType = event.action || event.type || '';
    const data = event.data || {};

    await logWebhookEvent(event);

    // Whop payment success events
    if (
      eventType === 'payment.succeeded' ||
      eventType === 'membership.went_valid' ||
      eventType === 'checkout.session.completed' ||
      data.status === 'paid' ||
      data.status === 'completed'
    ) {
      const metadata = data.metadata || (data.custom_fields ? Object.fromEntries(data.custom_fields.map(f => [f.key, f.value])) : {}) || {};
      let orderRef = metadata.orderRef || metadata.order_ref || metadata.orderId || '';

      const customer = data.customer || {};
      const customerEmail = customer.email || data.user?.email || data.email || metadata.customerEmail || '';
      const customerName = customer.name || data.user?.username || metadata.customerName || 'Customer';
      const amount = data.amount ? Number(data.amount) / (data.currency ? 1 : 100) : Number(metadata.totalDue || 0);
      const paymentId = data.id || event.id || '';

      // If orderRef is not provided in metadata, search for latest open order by this email
      if (!orderRef && customerEmail) {
        const openOrder = await query.get(
          `SELECT order_ref FROM orders WHERE customer_email = ? AND status != 'paid' ORDER BY created_at DESC LIMIT 1`,
          [customerEmail.trim().toLowerCase()]
        );
        if (openOrder) {
          orderRef = openOrder.order_ref;
        }
      }

      if (orderRef) {
        await finalizeWhopPayment({
          orderRef,
          paymentId,
          amount,
          email: customerEmail,
          name: customerName,
          paymentMethod: 'Whop',
          metadata,
        });
        console.log(`Whop payment confirmed for order ${orderRef}`);
      } else {
        console.warn('Whop webhook received payment but no matching orderRef could be found.');
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Whop webhook handler error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Webhook handler failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function logWebhookEvent(event) {
  try {
    await query.run(`INSERT INTO forms (form_name, data) VALUES (?, ?)`, [
      'whop_webhook_log',
      JSON.stringify({
        id: event.id || '',
        action: event.action || event.type || '',
        createdAt: new Date().toISOString(),
      }),
    ]);
  } catch (err) {
    console.warn('Unable to log webhook event:', err.message);
  }
}
