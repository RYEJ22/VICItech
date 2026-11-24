import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

interface MidtransNotification {
  readonly order_id?: unknown;
  readonly status_code?: unknown;
  readonly gross_amount?: unknown;
  readonly signature_key?: unknown;
  readonly transaction_status?: unknown;
  readonly fraud_status?: unknown;
  readonly payment_type?: unknown;
}

const VALID_TRANSACTION_STATUSES = new Set([
  'authorize', 'capture', 'settlement', 'pending', 'deny', 'cancel', 'expire', 'failure',
  'refund', 'partial_refund', 'chargeback', 'partial_chargeback',
]);

function hasValidSignature(body: MidtransNotification, keys: string[]): boolean {
  if (typeof body.order_id !== 'string' || typeof body.status_code !== 'string'
      || typeof body.gross_amount !== 'string' || typeof body.signature_key !== 'string') return false;
  const signature = body.signature_key.trim().toLowerCase();
  if (!/^[0-9a-f]{128}$/.test(signature)) return false;
  const receivedBytes = Buffer.from(signature, 'hex');
  return keys.some((key) => {
    const expected = createHash('sha512')
      .update(`${body.order_id}${body.status_code}${body.gross_amount}${key}`)
      .digest('hex');
    const expectedBytes = Buffer.from(expected, 'hex');
    return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const signatureSecret = process.env.MIDTRANS_SIGNATURE_SECRET_KEY?.trim();
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if ((!signatureSecret && !serverKey) || !url || !serviceKey) {
    console.error('[ViciTech] Midtrans webhook configuration is missing.');
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  }

  let body: MidtransNotification;
  try {
    body = await request.json() as MidtransNotification;
  } catch {
    return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });
  }
  if (typeof body.order_id !== 'string' || !body.order_id.trim()) {
    return NextResponse.json({ error: 'Notification order ID is missing.' }, { status: 400 });
  }

  const candidateKeys = [...new Set([
    signatureSecret,
    signatureSecret && !signatureSecret.startsWith('SB-') ? `SB-${signatureSecret}` : undefined,
    serverKey,
  ].filter((key): key is string => Boolean(key?.trim())).map((key) => key.trim()))];
  let verifiedNotification = body;
  let locallyVerified = hasValidSignature(body, candidateKeys);

  if (!locallyVerified) {
    if (serverKey) {
      try {
        // Midtrans sandbox keys begin with SB-. Production server keys use a
        // different prefix, so select the matching status API host from the key.
        const baseUrl = serverKey.startsWith('SB-')
          ? 'https://api.sandbox.midtrans.com'
          : 'https://api.midtrans.com';
        const response = await fetch(`${baseUrl}/v2/${encodeURIComponent(body.order_id)}/status`, {
          method: 'GET',
          headers: {
            Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        });
        const status = response.ok ? await response.json() as MidtransNotification : null;
        if (status && status.order_id === body.order_id && typeof status.transaction_status === 'string'
            && VALID_TRANSACTION_STATUSES.has(status.transaction_status)
            && typeof status.status_code === 'string' && typeof status.gross_amount === 'string') {
          verifiedNotification = status;
          locallyVerified = true;
        }
      } catch (error) {
        console.error('[ViciTech] Midtrans status verification request failed.', {
          orderId: body.order_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    if (!locallyVerified) {
      console.error('[ViciTech] Midtrans notification could not be verified by signature or status API.', { orderId: body.order_id });
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }
  }
  const verifiedOrderId = verifiedNotification.order_id as string;
  const verifiedGrossAmount = verifiedNotification.gross_amount as string;

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let { data: order, error: lookupError } = await supabase.from('orders')
    .select('id, total_price, status, payment_status')
    .eq('order_number', verifiedOrderId).maybeSingle();
  if (!order && !lookupError) {
    const fallback = await supabase.from('orders')
      .select('id, total_price, status, payment_status')
      .eq('id', verifiedOrderId).maybeSingle();
    order = fallback.data;
    lookupError = fallback.error;
  }
  // Some integrations append a transaction suffix to Midtrans order IDs. Try
  // the unsuffixed order number as a final fallback.
  if (!order && !lookupError) {
    const baseOrderId = verifiedOrderId.replace(/-\d+$/, '');
    if (baseOrderId !== verifiedOrderId) {
      const fallback = await supabase.from('orders')
        .select('id, total_price, status, payment_status')
        .eq('order_number', baseOrderId).maybeSingle();
      order = fallback.data;
      lookupError = fallback.error;
    }
  }
  if (lookupError || !order) {
    console.error('[ViciTech] Midtrans webhook could not find order.', { orderId: verifiedOrderId, lookupError });
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  if (Math.round(Number(order.total_price)) !== Math.round(Number(verifiedGrossAmount))) {
    return NextResponse.json({ error: 'Payment amount does not match the order.' }, { status: 400 });
  }

  let update: Record<string, string> | null = null;
  if (verifiedNotification.transaction_status === 'settlement' || (verifiedNotification.transaction_status === 'capture' && verifiedNotification.fraud_status !== 'challenge')) {
    update = { payment_status: 'paid', payment_method: typeof verifiedNotification.payment_type === 'string' ? verifiedNotification.payment_type : 'unknown', paid_at: new Date().toISOString(), status: 'pending_qc' };
  } else if (verifiedNotification.transaction_status === 'expire' || verifiedNotification.transaction_status === 'cancel' || verifiedNotification.transaction_status === 'deny') {
    update = { payment_status: verifiedNotification.transaction_status === 'expire' ? 'expired' : 'failed' };
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
      midtransOrderId: verifiedOrderId,
      transactionStatus: verifiedNotification.transaction_status,
      paymentStatus: update.payment_status,
    });
  }
  return NextResponse.json({ received: true });
}
