import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

interface MidtransNotification {
  readonly order_id?: string;
  readonly status_code?: string;
  readonly gross_amount?: string;
  readonly signature_key?: string;
  readonly transaction_status?: string;
  readonly fraud_status?: string;
  readonly payment_type?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const signatureSecret = (process.env.MIDTRANS_SIGNATURE_SECRET_KEY || process.env.MIDTRANS_SERVER_KEY)?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!signatureSecret || !url || !serviceKey) {
    console.error('[ViciTech] Midtrans webhook configuration is missing.');
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  }

  let body: MidtransNotification;
  try {
    body = await request.json() as MidtransNotification;
  } catch {
    return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });
  }
  if (!body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) {
    return NextResponse.json({ error: 'Incomplete notification.' }, { status: 400 });
  }
  // Hash the exact payload strings. In particular, gross_amount must retain
  // its decimal formatting (for example, "2990000.00").
  const expected = createHash('sha512')
    .update(`${String(body.order_id)}${String(body.status_code)}${String(body.gross_amount)}${signatureSecret}`)
    .digest('hex');
  const signature = String(body.signature_key).trim().toLowerCase();
  if (!/^[0-9a-f]{128}$/.test(signature)) {
    console.error('[ViciTech] Midtrans webhook signature is not valid SHA-512 hex.', { orderId: body.order_id });
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }
  const receivedBytes = Buffer.from(signature, 'hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  if (receivedBytes.length !== expectedBytes.length || !timingSafeEqual(receivedBytes, expectedBytes)) {
    console.error('[ViciTech] Midtrans webhook signature validation failed.', { orderId: body.order_id });
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let { data: order, error: lookupError } = await supabase.from('orders')
    .select('id, total_price, status, payment_status')
    .eq('order_number', body.order_id).maybeSingle();
  if (!order && !lookupError) {
    const fallback = await supabase.from('orders')
      .select('id, total_price, status, payment_status')
      .eq('id', body.order_id).maybeSingle();
    order = fallback.data;
    lookupError = fallback.error;
  }
  // Some integrations append a transaction suffix to Midtrans order IDs. Try
  // the unsuffixed order number as a final fallback.
  if (!order && !lookupError) {
    const baseOrderId = body.order_id.replace(/-\d+$/, '');
    if (baseOrderId !== body.order_id) {
      const fallback = await supabase.from('orders')
        .select('id, total_price, status, payment_status')
        .eq('order_number', baseOrderId).maybeSingle();
      order = fallback.data;
      lookupError = fallback.error;
    }
  }
  if (lookupError || !order) {
    console.error('[ViciTech] Midtrans webhook could not find order.', { orderId: body.order_id, lookupError });
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  if (Math.round(Number(order.total_price)) !== Math.round(Number(body.gross_amount))) {
    return NextResponse.json({ error: 'Payment amount does not match the order.' }, { status: 400 });
  }

  let update: Record<string, string> | null = null;
  if (body.transaction_status === 'settlement' || (body.transaction_status === 'capture' && body.fraud_status !== 'challenge')) {
    update = { payment_status: 'paid', payment_method: body.payment_type || 'unknown', paid_at: new Date().toISOString(), status: 'pending_qc' };
  } else if (body.transaction_status === 'expire' || body.transaction_status === 'cancel' || body.transaction_status === 'deny') {
    update = { payment_status: body.transaction_status === 'expire' ? 'expired' : 'failed' };
  }
  if (update) {
    let query = supabase.from('orders').update(update).eq('id', order.id);
    if (update.payment_status !== 'paid') query = query.neq('status', 'cancelled');
    const { error: updateError } = await query;
    if (updateError) {
      console.error('[ViciTech] Payment notification update failed:', updateError);
      return NextResponse.json({ error: 'Could not update payment status.' }, { status: 500 });
    }
    console.log('[ViciTech] Midtrans payment status updated.', {
      orderId: order.id,
      midtransOrderId: body.order_id,
      transactionStatus: body.transaction_status,
      paymentStatus: update.payment_status,
    });
  }
  return NextResponse.json({ received: true });
}
