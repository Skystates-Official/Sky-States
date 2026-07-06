import { validateCouponCode } from '../../lib/pricing.js';

export const prerender = false;

export async function POST({ request }) {
  try {
    const { code, basePrice, mode } = await request.json();
    const price = Number(basePrice);

    if (!Number.isFinite(price) || price <= 0) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid base price.' }), { status: 400 });
    }

    if (mode !== 'full') {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Promotional codes apply to full program enrollment only.',
      }), { status: 400 });
    }

    const result = await validateCouponCode(code, price, 'full');

    if (!result.valid) {
      return new Response(JSON.stringify({ valid: false, error: result.error }), { status: 400 });
    }

    return new Response(JSON.stringify({
      valid: true,
      code: result.code,
      discount: result.discount,
      newTotal: result.total,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
