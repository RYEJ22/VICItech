import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

interface SnapItem {
  readonly id?: string;
  readonly name?: string;
  readonly label?: string;
  readonly quantity?: number;
  readonly unitPrice?: number;
  readonly price?: number;
}

interface SnapResponse {
  readonly token?: string;
  readonly redirect_url?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serverKey || !serviceKey || !supabaseUrl) return NextResponse.json({ error: 'Payment service is not configured.' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const orderId = typeof body === 'object' && body !== null && 'orderId' in body
    ? (body as { orderId?: unknown }).orderId
    : null;
  if (typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json({ error: 'A valid orderId is required.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return NextResponse.json({ error: 'Sign in to pay for this order.' }, { status: 401 });

    const { data: order, error } = await supabase.from('orders')
      .select('id, order_number, user_id, product_name, items, total_price, customer_info, payment_status, payment_reference')
      .eq('id', orderId).eq('user_id', auth.user.id).single();
    if (error || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    if (order.payment_status === 'paid') return NextResponse.json({ error: 'This order has already been paid.' }, { status: 409 });

    const amount = Math.round(Number(order.total_price));
    if (!Number.isFinite(amount) || amount < 1) return NextResponse.json({ error: 'Order amount is invalid.' }, { status: 400 });

    let items = Array.isArray(order.items) ? (order.items as SnapItem[]).flatMap((item, index) => {
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const price = Math.round(Number(item.unitPrice ?? item.price) || 0);
      const name = String(item.name ?? item.label ?? `Item ${index + 1}`).slice(0, 50);
      return price > 0 ? [{ id: String(item.id ?? index).slice(0, 50), price, quantity, name }] : [];
    }) : [];
    const listedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (!items.length || listedTotal > amount) {
      items = [{ id: order.id, price: amount, quantity: 1, name: String(order.product_name).slice(0, 50) }];
    } else if (listedTotal < amount) {
      items.push({ id: 'order-adjustment', price: amount - listedTotal, quantity: 1, name: 'Penyesuaian total pesanan' });
    }
    const customer = typeof order.customer_info === 'object' && order.customer_info !== null
      ? order.customer_info as Record<string, unknown> : {};
    const customerDetails = {
      first_name: String(customer.fullName ?? auth.user.user_metadata?.full_name ?? 'Pelanggan').slice(0, 50),
      email: String(customer.email ?? auth.user.email ?? '').slice(0, 50),
      phone: String(customer.phone ?? '').slice(0, 20),
    };
    const midtransOrderId = order.order_number || order.id;
    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        transaction_details: { order_id: midtransOrderId, gross_amount: amount },
        item_details: items,
        customer_details: customerDetails,
      }),
      cache: 'no-store',
    });
    const snap = await response.json() as SnapResponse;
    if (!response.ok || !snap.token || !snap.redirect_url) {
      console.error('[ViciTech] Midtrans transaction creation failed:', response.status);
      return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 502 });
    }
    const admin = createSupabaseClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: updateError } = await admin.from('orders').update({
      payment_reference: snap.token,
      payment_status: 'pending',
    }).eq('id', order.id).eq('user_id', auth.user.id);
    if (updateError) return NextResponse.json({ error: 'Could not save payment session.' }, { status: 500 });

    return NextResponse.json({ token: snap.token, redirect_url: snap.redirect_url });
  } catch (error) {
    console.error('[ViciTech] Payment creation failed:', error);
    return NextResponse.json({ error: 'Payment request could not be completed.' }, { status: 500 });
  }
}
