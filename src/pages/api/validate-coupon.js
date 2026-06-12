import fs from 'fs';
import path from 'path';

export const prerender = false;

export async function POST({ request }) {
  try {
    const { code, basePrice } = await request.json();
    const cleanCode = (code || '').trim().toLowerCase();
    
    // Match "sky" followed by a number
    const match = cleanCode.match(/^sky(\d+)$/);
    if (!match) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid coupon format. Must be sky followed by a number.' }), { status: 400 });
    }
    
    const discountAmount = parseInt(match[1], 10);
    
    // Read limits from coupon-config.json
    let minLimit = 10;
    let maxLimit = 6499;
    try {
      const configPath = path.resolve('src/data/coupon-config.json');
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (typeof configData.minLimit === 'number') minLimit = configData.minLimit;
        if (typeof configData.maxLimit === 'number') maxLimit = configData.maxLimit;
      }
    } catch (e) {
      // fallback to defaults
    }
    
    // Verify coupon range
    if (discountAmount < minLimit || discountAmount > maxLimit) {
      return new Response(JSON.stringify({ valid: false, error: `Coupon value must be between $${minLimit} and $${maxLimit}.` }), { status: 400 });
    }
    
    // Calculate new pricing totals (capped at $0 minimum)
    const appliedDiscount = Math.min(discountAmount, basePrice);
    const newTotal = Math.max(0, basePrice - appliedDiscount);

    return new Response(JSON.stringify({
      valid: true,
      code: cleanCode.toUpperCase(),
      discount: appliedDiscount,
      newTotal: newTotal
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
