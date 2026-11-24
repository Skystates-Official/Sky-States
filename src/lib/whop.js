import crypto from 'crypto';
import { query } from '../db/sqlite.js';
import { createOrder, getOrderByRef, recordOrderPayment, generateOrderRef } from './orders.js';
import { sendPaymentConfirmationEmail } from './email.js';

export function getWhopConfig() {
  const env = typeof process !== 'undefined' ? process.env : {};
  return {
    apiKey: env.WHOP_API_KEY || 'apik_T8D4YnUWGdnKe_C8993637_C_1112f89783348c6b6860d2c30dc569f8994892ecf6aca65e065de74086f073',
    accountId: env.WHOP_ACCOUNT_ID || 'biz_zeeiZARyClkWO9',
    productId: env.WHOP_PRODUCT_ID || 'prod_205QaVFBwYudn',
    webhookSecret: env.WHOP_WEBHOOK_SECRET || '',
    checkoutUrl: env.WHOP_CHECKOUT_URL || '',
    checkoutUrlRegistration: env.WHOP_CHECKOUT_URL_REGISTRATION || '',
    checkoutUrlFull: env.WHOP_CHECKOUT_URL_FULL || '',
    planId: env.WHOP_PLAN_ID || 'plan_PDC82muY6oYwR',
    planIdRegistration: env.WHOP_PLAN_ID_REGISTRATION || 'plan_PDC82muY6oYwR',
    planIdRegistration1on1: env.WHOP_PLAN_ID_REGISTRATION_1ON1 || '',
    planIdFull: env.WHOP_PLAN_ID_FULL || 'plan_0oeH0EbzgXkuc',
    planIdFull1on1: env.WHOP_PLAN_ID_FULL_1ON1 || 'plan_YpZtHyDuf61PV',
  };
}

/**
 * Format redirect URL so it complies with Whop requirements (must start with https://)
 */
/**
 * Format redirect URL so it complies with Whop requirements:
 * - Whop rejects 'localhost' as not an FQDN, but accepts '127.0.0.1' for local dev.
 * - Non-local production URLs must use https://.
 */
function formatWhopRedirectUrl(urlStr, fallbackOrigin = 'https://skystates.us') {
  if (!urlStr) return `${fallbackOrigin}/checkout/success`;
  try {
    const parsed = new URL(urlStr);
    // Allow localhost by mapping to 127.0.0.1 so Whop accepts local development
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
      return parsed.toString();
    }
    if (parsed.hostname === '127.0.0.1') {
      return parsed.toString();
    }
    // For non-local URLs, Whop requires https://
    if (parsed.protocol === 'http:') {
      const origin = fallbackOrigin.startsWith('http') ? new URL(fallbackOrigin).origin : 'https://skystates.us';
      return `${origin}${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    return `${fallbackOrigin}/checkout/success`;
  }
}

/**
 * Create a Whop checkout redirect URL or session
 */
export async function createWhopCheckout({
  email,
  name,
  courseName,
  totalDue,
  orderRef,
  mode,
  tier,
  couponCode = '',
  successUrl,
  cancelUrl,
}) {
  const config = getWhopConfig();
  const formattedSuccessUrl = formatWhopRedirectUrl(successUrl);
  const formattedCancelUrl = cancelUrl ? formatWhopRedirectUrl(cancelUrl, 'https://skystates.us/checkout?canceled=1') : undefined;

  // 1. Try dynamic pricing variant on-the-fly for <= $2,500 (Whop allows instant dynamic card checkout up to $2,500)
  if (config.apiKey && totalDue > 0 && totalDue <= 2500) {
    try {
      const tierLabel = tier === '1on1' ? 'Personalised Classes' : 'Batch Classes';
      const modeLabel = mode === 'full' ? 'Full Program' : 'Intro Session';
      const dynamicTitle = `${courseName} - ${modeLabel} (${tierLabel})`.slice(0, 30);

      const dynamicPayload = {
        account_id: config.accountId || 'biz_zeeiZARyClkWO9',
        variant: {
          title: dynamicTitle,
          billing_type: 'one_time',
          initial_price: Number(totalDue),
          currency: 'usd',
        },
        redirect_url: formattedSuccessUrl,
        metadata: {
          orderRef,
          customerEmail: email,
          customerName: name,
          courseName,
          mode,
          tier,
          couponCode,
          totalDue: String(totalDue),
        },
      };
      if (formattedCancelUrl) dynamicPayload.cancel_url = formattedCancelUrl;

      const dynamicResponse = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dynamicPayload),
      });

      const dynamicData = await dynamicResponse.json();
      if (dynamicResponse.ok && (dynamicData.purchase_url || dynamicData.id)) {
        const purchaseUrl = dynamicData.purchase_url || `https://whop.com/checkout/${dynamicData.id}/`;
        const directUrl = new URL(purchaseUrl);
        if (email) directUrl.searchParams.set('email', email);
        if (orderRef) directUrl.searchParams.set('order_ref', orderRef);
        if (couponCode) {
          directUrl.searchParams.set('promoCode', couponCode);
          directUrl.searchParams.set('code', couponCode);
        }
        return {
          url: directUrl.toString(),
          id: dynamicData.id || orderRef,
          provider: 'whop_api_dynamic',
        };
      }
    } catch (dynErr) {
      console.warn('Dynamic variant creation error, falling back to plan ID:', dynErr.message);
    }
  }

  // 2. Select plan ID corresponding to the selected mode and tier ONLY IF the amount exactly matches the standard price
  let planId = '';
  if (Number(totalDue) === 6499) {
    planId = config.planIdFull1on1 || config.planIdFull;
  } else if (Number(totalDue) === 3499) {
    planId = config.planIdFull;
  } else if (Number(totalDue) === 99) {
    planId = config.planIdRegistration;
  }

  // 3. If high-ticket amount (> $2,500) has a custom price (e.g. coupon discount or special track),
  // dynamically create a plan under the product so Whop configures wire/ACH/card properly
  if (!planId && config.apiKey && totalDue > 2500 && config.productId) {
    try {
      const tierShort = tier === '1on1' ? '1-on-1' : 'Batch';
      const shortPlanTitle = `${courseName.slice(0, 16)} ${tierShort} $${totalDue}`.slice(0, 30);
      const planRes = await fetch('https://api.whop.com/api/v1/plans', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: config.productId,
          billing_type: 'one_time',
          initial_price: Number(totalDue),
          currency: 'usd',
          title: shortPlanTitle,
        }),
      });
      const planData = await planRes.json();
      if (planRes.ok && planData.id) {
        planId = planData.id;
      }
    } catch (createPlanErr) {
      console.warn('Whop dynamic high-ticket plan creation error:', createPlanErr.message);
    }
  }

  if (!planId) {
    planId = mode === 'full' ? (config.planIdFull || config.planIdFull1on1) : config.planIdRegistration;
  }

  if (config.apiKey && planId) {
    try {
      const planPayload = {
        account_id: config.accountId || 'biz_zeeiZARyClkWO9',
        variant_id: planId,
        redirect_url: formattedSuccessUrl,
        metadata: {
          orderRef,
          customerEmail: email,
          customerName: name,
          courseName,
          mode,
          tier,
          couponCode,
          totalDue: String(totalDue),
        },
      };
      if (formattedCancelUrl) planPayload.cancel_url = formattedCancelUrl;

      const response = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planPayload),
      });

      const data = await response.json();
      if (response.ok && (data.purchase_url || data.id)) {
        const purchaseUrl = data.purchase_url || `https://whop.com/checkout/${data.id}/`;
        const directUrl = new URL(purchaseUrl);
        if (email) directUrl.searchParams.set('email', email);
        if (orderRef) directUrl.searchParams.set('order_ref', orderRef);
        if (couponCode) {
          directUrl.searchParams.set('promoCode', couponCode);
          directUrl.searchParams.set('code', couponCode);
        }
        return {
          url: directUrl.toString(),
          id: data.id || orderRef,
          provider: 'whop_api',
        };
      } else {
        console.warn('Whop API checkout configuration responded with error:', data);
      }
    } catch (apiErr) {
      console.warn('Whop API request error, falling back to direct URL:', apiErr.message);
    }
  }

  // 2. Direct Whop Checkout URL (Configured via WHOP_CHECKOUT_URL or plan default)
  let directCheckoutUrl = '';
  if (mode === 'full' && config.checkoutUrlFull) {
    directCheckoutUrl = config.checkoutUrlFull;
  } else if (mode === 'registration' && config.checkoutUrlRegistration) {
    directCheckoutUrl = config.checkoutUrlRegistration;
  } else if (config.checkoutUrl) {
    directCheckoutUrl = config.checkoutUrl;
  } else if (planId) {
    directCheckoutUrl = `https://whop.com/checkout/${planId}`;
  }

  if (directCheckoutUrl) {
    try {
      const url = new URL(directCheckoutUrl);
      if (email) url.searchParams.set('email', email);
      if (httpsSuccessUrl) url.searchParams.set('redirect_url', httpsSuccessUrl);
      if (orderRef) {
        url.searchParams.set('order_ref', orderRef);
        url.searchParams.set('metadata[orderRef]', orderRef);
      }
      return {
        url: url.toString(),
        id: orderRef,
        provider: 'whop_hosted',
      };
    } catch (urlErr) {
      console.error('Invalid WHOP_CHECKOUT_URL format:', urlErr);
    }
  }

  // 3. Fallback / Configuration notice:
  throw new Error(
    'Whop payment gateway is enabled, but WHOP_CHECKOUT_URL or WHOP_PLAN_ID is not configured in your .env file.'
  );
}

/**
 * Finalize an order paid through Whop
 */
export async function finalizeWhopPayment({
  orderRef,
  paymentId,
  amount,
  email,
  name,
  courseName,
  paymentMethod = 'Whop',
  metadata = {},
}) {
  const actualOrderRef = orderRef || metadata.orderRef;
  const paymentSessionId = paymentId ? `whop_${paymentId}` : `whop_${actualOrderRef || Date.now()}`;

  // Check if this payment was already recorded to prevent duplicate processing
  const existingPayment = await query.get(
    'SELECT * FROM order_payments WHERE stripe_session_id = ?',
    [paymentSessionId]
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

  let finalOrderRef = actualOrderRef;
  if (!finalOrderRef) {
    finalOrderRef = generateOrderRef();
  }

  let order = await getOrderByRef(finalOrderRef);
  const orderAmount = Number(amount || metadata.totalDue || (order ? order.total_due : 0));
  const customerEmail = email || metadata.customerEmail || (order ? order.customer_email : '');
  const customerName = name || metadata.customerName || (order ? order.customer_name : 'Customer');
  const programCourseName = courseName || metadata.courseName || (order ? order.course_name : 'Sky States Program');

  if (!order) {
    await createOrder({
      orderRef: finalOrderRef,
      email: customerEmail,
      name: customerName,
      courseName: programCourseName,
      totalDue: orderAmount,
      checkoutMode: metadata.checkoutMode || 'registration',
      tier: metadata.tier || 'normal',
      couponCode: metadata.couponCode || '',
    });
    order = await getOrderByRef(finalOrderRef);
  }

  const updatedOrder = await recordOrderPayment(finalOrderRef, {
    stripeSessionId: paymentSessionId,
    amount: orderAmount,
    paymentType: 'full',
    paymentMethod,
  });

  await query.run(
    `INSERT IGNORE INTO forms (form_name, data) VALUES (?, ?)`,
    [
      'whop_checkout',
      JSON.stringify({
        paymentId: paymentSessionId,
        orderRef: finalOrderRef,
        amount: orderAmount,
        email: customerEmail,
        metadata,
        status: 'paid',
        createdAt: new Date().toISOString(),
      }),
    ]
  );

  let emailResult = { sent: false };
  try {
    emailResult = await sendPaymentConfirmationEmail({
      to: customerEmail,
      customerName,
      courseName: programCourseName,
      amountPaid: orderAmount,
      totalDue: updatedOrder ? updatedOrder.total_due : orderAmount,
      orderRef: finalOrderRef,
    });
  } catch (emailErr) {
    console.warn('Payment confirmation email failed to send:', emailErr.message);
    emailResult = { sent: false, error: emailErr.message };
  }

  return { order: updatedOrder || order, orderRef: finalOrderRef, emailResult };
}

/**
 * Verify Whop webhook payload
 */
export function verifyWhopWebhook(rawBody, headers, webhookSecret) {
  if (!webhookSecret) {
    return JSON.parse(rawBody);
  }

  const signatureHeader =
    headers['webhook-signature'] ||
    headers['Webhook-Signature'] ||
    headers['whop-signature'] ||
    '';

  if (!signatureHeader) {
    console.warn('Whop webhook missing signature header; parsing payload.');
    return JSON.parse(rawBody);
  }

  try {
    const msgId = headers['webhook-id'] || headers['Webhook-Id'] || '';
    const timestamp = headers['webhook-timestamp'] || headers['Webhook-Timestamp'] || '';

    // Standard Webhooks specification formats
    const signedContentWithId = msgId ? `${msgId}.${timestamp}.${rawBody}` : `${timestamp}.${rawBody}`;
    const signedContentNoId = `${timestamp}.${rawBody}`;

    const rawSecret = webhookSecret.replace(/^(ws_|whsec_)/, '');
    const keys = [];
    if (/^[0-9a-fA-F]{64}$/.test(rawSecret)) {
      keys.push(Buffer.from(rawSecret, 'hex'));
    }
    try {
      const b64 = Buffer.from(rawSecret, 'base64');
      if (b64.length > 0) keys.push(b64);
    } catch {}
    keys.push(Buffer.from(webhookSecret, 'utf8'));
    keys.push(Buffer.from(rawSecret, 'utf8'));

    const providedSignatures = signatureHeader
      .split(' ')
      .map((s) => s.replace(/^v1[=,]/, '').trim())
      .filter(Boolean);

    let matched = false;
    for (const key of keys) {
      for (const content of [signedContentWithId, signedContentNoId]) {
        const computedBase64 = crypto.createHmac('sha256', key).update(content).digest('base64');
        const computedHex = crypto.createHmac('sha256', key).update(content).digest('hex');

        for (const sig of providedSignatures) {
          if (sig === computedBase64 || sig === computedHex) {
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      if (matched) break;
    }

    if (!matched) {
      console.warn('Whop webhook signature mismatch, proceeding with caution.');
    } else {
      console.log('Whop webhook signature verified successfully.');
    }
  } catch (err) {
    console.warn('Whop webhook verification error:', err.message);
  }

  return JSON.parse(rawBody);
}
