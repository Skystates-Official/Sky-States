// STRIPE PAYMENT INTENT (COMMENTED OUT - SWAPPED TO WHOP)
// import { getStripe } from '../../../lib/stripe.js';
// import { calculateCheckoutTotal } from '../../../lib/pricing.js';

export const prerender = false;

export async function POST({ request }) {
  /*
  try {
    const body = await request.json();
    ...
  } catch (error) {
    ...
  }
  */
  return json(
    {
      error: 'Stripe payments are currently disabled. Please use Whop checkout to complete your enrollment.',
    },
    400
  );
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
