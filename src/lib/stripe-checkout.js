/**
 * Stripe Checkout configuration and payment method reference.
 * Enable methods in: https://dashboard.stripe.com/settings/payment_methods
 */

export const STRIPE_PAYMENT_METHODS = [
  {
    id: 'card',
    label: 'Credit & Debit Cards',
    detail: 'Visa, Mastercard, Amex, Discover',
    dashboard: 'Cards',
    enabledByDefault: true,
  },
  {
    id: 'link',
    label: 'Link',
    detail: 'One-click checkout with saved details',
    dashboard: 'Link',
    enabledByDefault: true,
  },
  {
    id: 'apple_pay',
    label: 'Apple Pay',
    detail: 'Safari & iOS devices',
    dashboard: 'Apple Pay',
    enabledByDefault: true,
  },
  {
    id: 'google_pay',
    label: 'Google Pay',
    detail: 'Chrome & Android devices',
    dashboard: 'Google Pay',
    enabledByDefault: true,
  },
  {
    id: 'us_bank_account',
    label: 'ACH Bank Transfer',
    detail: 'US bank account (1–3 business days)',
    dashboard: 'ACH Direct Debit',
    enabledByDefault: false,
  },
  {
    id: 'affirm',
    label: 'Affirm',
    detail: 'Buy now, pay later',
    dashboard: 'Affirm',
    enabledByDefault: false,
  },
  {
    id: 'afterpay_clearpay',
    label: 'Afterpay',
    detail: 'Installments at checkout',
    dashboard: 'Afterpay / Clearpay',
    enabledByDefault: false,
  },
  {
    id: 'klarna',
    label: 'Klarna',
    detail: 'Pay in 4 or monthly',
    dashboard: 'Klarna',
    enabledByDefault: false,
  },
  {
    id: 'cashapp',
    label: 'Cash App Pay',
    detail: 'Pay with Cash App balance',
    dashboard: 'Cash App Pay',
    enabledByDefault: false,
  },
  {
    id: 'amazon_pay',
    label: 'Amazon Pay',
    detail: 'Pay with Amazon account',
    dashboard: 'Amazon Pay',
    enabledByDefault: false,
  },
  {
    id: 'paypal',
    label: 'PayPal',
    detail: 'Pay with PayPal balance or linked bank',
    dashboard: 'PayPal',
    enabledByDefault: false,
  },
];

export function formatPaymentMethod(type) {
  const labels = {
    card: 'Card',
    link: 'Link',
    us_bank_account: 'Bank transfer (ACH)',
    affirm: 'Affirm',
    afterpay_clearpay: 'Afterpay',
    klarna: 'Klarna',
    cashapp: 'Cash App Pay',
    amazon_pay: 'Amazon Pay',
    paypal: 'PayPal',
    apple_pay: 'Apple Pay',
    google_pay: 'Google Pay',
  };
  return labels[type] || type || 'Card';
}

export function buildCheckoutSessionParams({
  email,
  name,
  courseLabel,
  paymentLabel,
  tierLabel,
  couponCode,
  amountCents,
  orderRef,
  totalDue,
  chargeAmount,
  paymentStyle,
  checkoutMode,
  tier,
  successUrl,
  cancelUrl,
}) {
  return {
    mode: 'payment',
    customer_email: email,
    client_reference_id: orderRef,
    payment_method_types: ['card', 'link', 'us_bank_account', 'afterpay_clearpay', 'klarna', 'cashapp', 'amazon_pay'],
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: true },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `${courseLabel} — ${paymentLabel}`,
            description: `${tierLabel}${couponCode ? ` (Coupon ${couponCode})` : ''}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      orderRef,
      customerEmail: email,
      customerName: name || 'Customer',
      courseName: courseLabel,
      checkoutMode: checkoutMode || 'registration',
      tier: tier || 'normal',
      couponCode: couponCode || '',
      totalDue: String(totalDue),
      paymentStyle,
      chargeAmount: String(chargeAmount),
    },
    payment_intent_data: {
      metadata: {
        orderRef,
        customerEmail: email,
        customerName: name || 'Customer',
        courseName: courseLabel,
      },
    },
    custom_text: {
      submit: {
        message: 'Secure payment processed by Stripe. You will receive a confirmation email from support@skystates.us.',
      },
    },
  };
}
