import { query } from '../db/sqlite.js';

export async function listCoupons() {
  return query.all(
    `SELECT id, code, discount_amount, description, active, max_uses, used_count, expires_at, created_at
     FROM coupons ORDER BY created_at DESC`
  );
}

export async function getCouponByCode(code) {
  const clean = (code || '').trim().toUpperCase();
  if (!clean) return null;
  return query.get('SELECT * FROM coupons WHERE code = ?', [clean]);
}

export async function validateStoredCoupon(code, basePrice) {
  const coupon = await getCouponByCode(code);
  if (!coupon) {
    return { valid: false, error: 'Invalid coupon code.' };
  }

  if (!coupon.active) {
    return { valid: false, error: 'This coupon is no longer active.' };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: 'This coupon has expired.' };
  }

  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: 'This coupon has reached its usage limit.' };
  }

  const discountAmount = Number(coupon.discount_amount);
  if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
    return { valid: false, error: 'Invalid coupon configuration.' };
  }

  const appliedDiscount = Math.min(discountAmount, basePrice);
  const total = Math.max(0, basePrice - appliedDiscount);

  return {
    valid: true,
    code: coupon.code,
    discount: appliedDiscount,
    total,
    couponId: coupon.id,
  };
}

export async function incrementCouponUsage(couponId) {
  if (!couponId) return;
  await query.run('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [couponId]);
}
