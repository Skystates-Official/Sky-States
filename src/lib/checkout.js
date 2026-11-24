// STRIPE COMMENTED OUT: Switched to Whop payment method
// import { getStripe } from './stripe.js';
// import { formatPaymentMethod } from './stripe-checkout.js';
import { generateOrderRef, createOrder, recordOrderPayment, getOrderByRef } from './orders.js';
import { sendPaymentConfirmationEmail, sendFreeEnrollmentEmail } from './email.js';
import { query } from '../db/sqlite.js';
export { finalizeWhopPayment } from './whop.js';

export async function finalizeCheckoutSession(session) {
  const metadata = session.metadata || {};
  const amountPaid = (session.amount_total || 0) / 100;
  const email = session.customer_email || metadata.customerEmail || '';
  const name = metadata.customerName || 'Customer';
  const courseName = metadata.courseName || 'Sky States Program';
  let orderRef = metadata.orderRef;

  const sessionId = session.id || orderRef;
  const existingPayment = await query.get(
    'SELECT * FROM order_payments WHERE stripe_session_id = ?',
    [sessionId]
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
    stripeSessionId: sessionId,
    amount: amountPaid,
    paymentType: 'full',
    paymentMethod: 'Whop',
  });

  await query.run(
    `INSERT IGNORE INTO forms (form_name, data) VALUES (?, ?)`,
    [
      'whop_checkout',
      JSON.stringify({
        sessionId,
        orderRef,
        amount: amountPaid,
        email,
        metadata,
        status: 'paid',
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
  /* =========================================================================
   * STRIPE SESSION RETRIEVAL (COMMENTED OUT)
   * =========================================================================
   * const stripe = getStripe();
   * const session = await stripe.checkout.sessions.retrieve(sessionId, {
   *   expand: ['payment_intent.payment_method'],
   * });
   * ...
   * ========================================================================= */

  // Check local database for payment or order associated with this reference
  const payment = await query.get(
    'SELECT * FROM order_payments WHERE stripe_session_id = ? OR order_ref = ?',
    [sessionId, sessionId]
  );

  if (payment) {
    const order = await getOrderByRef(payment.order_ref);
    return {
      ok: true,
      session: {
        id: sessionId,
        payment_status: 'paid',
        amount_total: Math.round(Number(payment.amount) * 100),
        customer_email: order ? order.customer_email : '',
        metadata: {
          orderRef: payment.order_ref,
          customerName: order ? order.customer_name : '',
          courseName: order ? order.course_name : '',
        },
      },
    };
  }

  const order = await getOrderByRef(sessionId);
  if (order) {
    return {
      ok: true,
      session: {
        id: sessionId,
        payment_status: order.status === 'paid' ? 'paid' : 'unpaid',
        amount_total: Math.round(Number(order.total_due) * 100),
        customer_email: order.customer_email,
        metadata: {
          orderRef: order.order_ref,
          customerName: order.customer_name,
          courseName: order.course_name,
        },
      },
    };
  }

  return { ok: false, session: null, error: 'Payment record not found.' };
}
