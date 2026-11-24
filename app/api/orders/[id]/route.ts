import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminRole } from '@/lib/supabase/admin-auth';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  { params }: { readonly params: { readonly id: string } },
): Promise<NextResponse> {
  const orderId = params.id;
  if (!UUID_PATTERN.test(orderId)) {
    return NextResponse.json({ error: 'A valid order ID is required.' }, { status: 400 });
  }

  let sessionClient;
  try {
    sessionClient = await createClient();
  } catch (error) {
    console.error('[ViciTech] Order deletion auth client could not be created:', error);
    return NextResponse.json({ error: 'Could not verify your session.' }, { status: 503 });
  }

  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in to delete this order.' }, { status: 401 });
  }

  const { isAdmin, error: roleError } = await verifyAdminRole(sessionClient, user);
  if (roleError) {
    console.error('[ViciTech] Order deletion admin role check failed:', roleError);
    return NextResponse.json({ error: 'Could not verify access.' }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Order deletion is not configured.' }, { status: 503 });
  }

  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .select('id, user_id, status, order_number')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    console.error('[ViciTech] Could not fetch order for deletion:', orderError);
    return NextResponse.json({ error: 'Could not fetch order.' }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.status !== 'cancelled') {
    return NextResponse.json({ error: 'Only cancelled orders can be deleted.' }, { status: 400 });
  }
  if (order.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'You cannot delete another user’s order.' }, { status: 403 });
  }

  // QC rows refer to orders by order_id instead of a foreign key. Remove those
  // first; telemetry rows linked to their serial numbers cascade from qc_logs.
  const relatedOrderIds = [...new Set([order.id, order.order_number].filter(
    (value): value is string => typeof value === 'string' && Boolean(value),
  ))];
  const { error: childDeleteError } = await adminClient
    .from('qc_logs')
    .delete()
    .in('order_id', relatedOrderIds);
  if (childDeleteError) {
    console.error('[ViciTech] Could not delete QC rows for cancelled order:', childDeleteError);
    return NextResponse.json({ error: 'Could not delete related order records.' }, { status: 500 });
  }

  // Keep the status predicate on DELETE as well to protect against a concurrent change.
  const { data: deletedOrder, error: deleteError } = await adminClient
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('status', 'cancelled')
    .select('id')
    .maybeSingle();

  if (deleteError) {
    console.error('[ViciTech] Could not delete cancelled order:', deleteError);
    return NextResponse.json({ error: 'Could not delete order.' }, { status: 500 });
  }
  if (!deletedOrder) {
    return NextResponse.json({ error: 'Order status changed. Refresh and try again.' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
