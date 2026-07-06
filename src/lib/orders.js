import crypto from 'crypto';
import { query } from '../db/sqlite.js';

export function generateOrderRef() {
  return `SS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function getOrderByRef(orderRef) {
  return query.get('SELECT * FROM orders WHERE order_ref = ?', [orderRef]);
}

export async function createOrder({
  orderRef,
  email,
  name,
  courseName,
  totalDue,
  checkoutMode,
  tier,
  couponCode = '',
}) {
  await query.run(
    `INSERT INTO orders (order_ref, customer_email, customer_name, course_name, total_due, amount_paid, status, checkout_mode, tier, coupon_code)
     VALUES (?, ?, ?, ?, ?, 0, 'open', ?, ?, ?)`,
    [orderRef, email, name, courseName, totalDue, checkoutMode, tier, couponCode]
  );
  return getOrderByRef(orderRef);
}

export async function recordOrderPayment(
  orderRef,
  { stripeSessionId, amount, paymentType = 'full', paymentMethod = '' }
) {
  const order = await getOrderByRef(orderRef);
  if (!order) {
    throw new Error('Order not found.');
  }

  const newPaid = Number(order.amount_paid) + Number(amount);
  const totalDue = Number(order.total_due);
  const balance = Math.max(0, totalDue - newPaid);
  const status = balance <= 0 ? 'paid' : 'partial';

  await query.run(
    `INSERT INTO order_payments (order_ref, stripe_session_id, amount, payment_type, payment_method)
     VALUES (?, ?, ?, ?, ?)`,
    [orderRef, stripeSessionId, amount, paymentType, paymentMethod || null]
  );

  await query.run(
    `UPDATE orders SET amount_paid = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_ref = ?`,
    [newPaid, status, orderRef]
  );

  return {
    ...order,
    amount_paid: newPaid,
    balance_due: balance,
    status,
  };
}

export async function listOpenOrdersByEmail(email) {
  return query.all(
    `SELECT * FROM orders WHERE customer_email = ? AND status != 'paid' ORDER BY created_at DESC`,
    [email.trim().toLowerCase()]
  );
}

export async function getOrderPaymentHistory(orderRef) {
  return query.all(
    `SELECT * FROM order_payments WHERE order_ref = ? ORDER BY created_at ASC`,
    [orderRef]
  );
}
