import { query } from '../../db/sqlite.js';
import { requireFullAdmin, ROLES } from '../../db/auth.js';

export const prerender = false;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  try {
    const coupons = await query.all(
      `SELECT id, code, discount_amount, description, active, max_uses, used_count, expires_at, created_at
       FROM coupons ORDER BY created_at DESC`
    );
    return json(coupons);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function POST({ request }) {
  const actor = requireFullAdmin(request);
  if (!actor) return json({ error: 'Admin access required.' }, 403);

  try {
    const body = await request.json();
    const code = (body.code || '').trim().toUpperCase();
    const discountAmount = Number(body.discount_amount);
    const description = (body.description || '').trim();
    const active = body.active === false ? 0 : 1;
    const maxUses = body.max_uses === '' || body.max_uses == null ? null : Number(body.max_uses);
    const expiresAt = body.expires_at || null;

    if (!code || code.length < 3) {
      return json({ error: 'Coupon code must be at least 3 characters.' }, 400);
    }

    if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
      return json({ error: 'Discount amount must be greater than zero.' }, 400);
    }

    const existing = await query.get('SELECT id FROM coupons WHERE code = ?', [code]);
    if (existing) {
      return json({ error: 'Coupon code already exists.' }, 409);
    }

    const result = await query.run(
      `INSERT INTO coupons (code, discount_amount, description, active, max_uses, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [code, discountAmount, description, active, maxUses, expiresAt]
    );

    const created = await query.get('SELECT * FROM coupons WHERE id = ?', [result.id]);
    return json(created, 201);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function PUT({ request }) {
  const actor = requireFullAdmin(request);
  if (!actor) return json({ error: 'Admin access required.' }, 403);

  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!id) return json({ error: 'Coupon id is required.' }, 400);

    const existing = await query.get('SELECT * FROM coupons WHERE id = ?', [id]);
    if (!existing) return json({ error: 'Coupon not found.' }, 404);

    const code = body.code ? body.code.trim().toUpperCase() : existing.code;
    const discountAmount = body.discount_amount != null ? Number(body.discount_amount) : existing.discount_amount;
    const description = body.description != null ? body.description.trim() : existing.description;
    const active = body.active === false ? 0 : body.active === true ? 1 : existing.active;
    const maxUses = body.max_uses === '' ? null : body.max_uses != null ? Number(body.max_uses) : existing.max_uses;
    const expiresAt = body.expires_at !== undefined ? body.expires_at || null : existing.expires_at;

    if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
      return json({ error: 'Discount amount must be greater than zero.' }, 400);
    }

    const duplicate = await query.get('SELECT id FROM coupons WHERE code = ? AND id != ?', [code, id]);
    if (duplicate) return json({ error: 'Coupon code already exists.' }, 409);

    await query.run(
      `UPDATE coupons SET code = ?, discount_amount = ?, description = ?, active = ?, max_uses = ?, expires_at = ?
       WHERE id = ?`,
      [code, discountAmount, description, active, maxUses, expiresAt, id]
    );

    const updated = await query.get('SELECT * FROM coupons WHERE id = ?', [id]);
    return json(updated);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function DELETE({ request }) {
  const actor = requireFullAdmin(request);
  if (!actor) return json({ error: 'Admin access required.' }, 403);

  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!id) return json({ error: 'Coupon id is required.' }, 400);

    await query.run('DELETE FROM coupons WHERE id = ?', [id]);
    return json({ success: true });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
