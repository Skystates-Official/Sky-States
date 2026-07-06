import fs from 'fs';
import path from 'path';
import { validateStoredCoupon } from './coupons.js';

export const PRICING = {
  registration: { normal: 99, '1on1': 499 },
  full: { normal: 3499, '1on1': 6499 },
};

/** Single source of truth for displayed prices site-wide */
export function formatUsd(amount, { alwaysCents = false } = {}) {
  const value = Number(amount);
  const showCents = alwaysCents || !Number.isInteger(value);
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  })}`;
}

function readCouponLimits() {
  let minLimit = 10;
  let maxLimit = 1000;

  try {
    const configPath = path.resolve('src/data/coupon-config.json');
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (typeof configData.minLimit === 'number') minLimit = configData.minLimit;
      if (typeof configData.maxLimit === 'number') maxLimit = configData.maxLimit;
    }
  } catch {
    // use defaults
  }

  return { minLimit, maxLimit };
}

function validateLegacySkyCoupon(code, basePrice) {
  const cleanCode = (code || '').trim().toLowerCase();
  const match = cleanCode.match(/^sky(\d+)$/);
  if (!match) {
    return { valid: false, error: 'Invalid coupon code.' };
  }

  const discountAmount = parseInt(match[1], 10);
  const { minLimit, maxLimit } = readCouponLimits();

  if (discountAmount < minLimit || discountAmount > maxLimit) {
    return { valid: false, error: 'Invalid coupon code or coupon has expired.' };
  }

  const appliedDiscount = Math.min(discountAmount, basePrice);
  const total = Math.max(0, basePrice - appliedDiscount);

  return {
    valid: true,
    code: cleanCode.toUpperCase(),
    discount: appliedDiscount,
    total,
  };
}

export async function validateCouponCode(code, basePrice, checkoutMode = 'full') {
  if (checkoutMode !== 'full') {
    return {
      valid: false,
      error: 'Promotional codes apply to full program enrollment only.',
    };
  }

  const stored = await validateStoredCoupon(code, basePrice);
  if (stored.valid) return stored;

  const legacy = validateLegacySkyCoupon(code, basePrice);
  if (legacy.valid) return legacy;

  return stored.error ? stored : legacy;
}

export async function calculateCheckoutTotal({ mode = 'registration', tier = 'normal', couponCode = '' }) {
  const checkoutMode = mode === 'full' ? 'full' : 'registration';
  const selectedTier = tier === '1on1' ? '1on1' : 'normal';
  const basePrice = PRICING[checkoutMode][selectedTier];

  const effectiveCouponCode = checkoutMode === 'full' ? couponCode : '';
  const coupon = effectiveCouponCode ? await validateCouponCode(effectiveCouponCode, basePrice, checkoutMode) : null;
  const discount = coupon?.valid ? coupon.discount : 0;
  const total = Math.max(0, basePrice - discount);
  const amountCents = Math.round(total * 100);

  return {
    checkoutMode,
    selectedTier,
    basePrice,
    discount,
    total,
    amountCents,
    couponCode: coupon?.valid ? coupon.code : '',
    couponId: coupon?.valid ? coupon.couponId : null,
  };
}
