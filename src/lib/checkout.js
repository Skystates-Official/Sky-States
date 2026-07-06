import { getStripe } from './stripe.js';
import { generateOrderRef, createOrder, recordOrderPayment, getOrderByRef } from './orders.js';
import { sendPaymentConfirmationEmail, sendFreeEnrollmentEmail } from './email.js';
import { formatPaymentMethod } from './stripe-checkout.js';
import { query } from '../db/sqlite.js';

function extractPaymentMethod(session) {
  const paymentIntent = session.payment_intent;
  if (!paymentIntent || typeof paymentIntent === 'string') return 'card';
  const method = paymentIntent.payment_method;
  if (!method || typeof method === 'string') return 'card';
  return method.type || 'card';
}

export async function finalizeCheckoutSession(session) {
  const metadata = session.metadata || {};
  const amountPaid = (session.amount_total || 0) / 100;
  const email = session.customer_email || metadata.customerEmail || '';
  const name = metadata.customerName || 'Customer';
  const courseName = metadata.courseName || 'Sky States Program';
  let orderRef = metadata.orderRef;

  const existingPayment = await query.get(
    'SELECT * FROM order_payments WHERE stripe_session_id = ?',
    [session.id]
  );
  if (existingPayment) {
    const order = await getOrderByRef(existingPayment.order_ref);
    return {
      order: order
        ? {
            ...order,
            balance_due: Math.max(0, Number(order.total_due) - Number(order.amount_paid)),
          }
        : null,
      orderRef: existingPayment.order_ref,
      emailResult: { sent: false, skipped: true, reason: 'already_processed' },
    };
  }

  if (!orderRef) {
    orderRef = generateOrderRef();
  }

  let order = await getOrderByRef(orderRef);
  if (!order) {
    await createOrder({
      orderRef,
      email,
      name,
      courseName,
      totalDue: Number(metadata.totalDue || amountPaid),
      checkoutMode: metadata.checkoutMode || 'registration',
      tier: metadata.tier || 'normal',
      couponCode: metadata.couponCode || '',
    });
  }

  const updatedOrder = await recordOrderPayment(orderRef, {
    stripeSessionId: session.id,
    amount: amountPaid,
    paymentType: 'full',
    paymentMethod: formatPaymentMethod(extractPaymentMethod(session)),
  });

  await query.run(
    `INSERT OR IGNORE INTO forms (form_name, data) VALUES (?, ?)`,
    [
      'stripe_checkout',
      JSON.stringify({
        sessionId: session.id,
        orderRef,
        amount: amountPaid,
        email,
        metadata,
        status: session.payment_status,
        createdAt: new Date().toISOString(),
      }),
    ]
  );

  const emailResult = await sendPaymentConfirmationEmail({
    to: email,
    customerName: name,
    courseName,
    amountPaid,
    totalDue: updatedOrder.total_due,
    orderRef,
  });

  return { order: updatedOrder, orderRef, emailResult };
}

export async function finalizeFreeCheckout({ email, name, courseName, mode, tier }) {
  const orderRef = generateOrderRef();
  await createOrder({
    orderRef,
    email,
    name,
    courseName,
    totalDue: 0,
    checkoutMode: mode,
    tier,
  });

  await query.run(
    `UPDATE orders SET amount_paid = 0, status = 'paid' WHERE order_ref = ?`,
    [orderRef]
  );

  const emailResult = await sendFreeEnrollmentEmail({ to: email, customerName: name, courseName, orderRef });
  return { orderRef, emailResult };
}

export async function retrievePaidSession(sessionId) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent.payment_method'],
  });

  if (session.payment_status === 'paid') {
    return { ok: true, session };
  }

  if (session.status === 'complete' && session.payment_status === 'unpaid') {
    return {
      ok: false,
      session,
      processing: true,
      error:
        'Your payment is being processed. Bank transfers and some methods can take 1–3 business days. We will email you at ' +
        (session.customer_email || session.metadata?.customerEmail || 'your address') +
        ' once confirmed.',
    };
  }

  return { ok: false, session, error: 'Payment not completed.' };
}
