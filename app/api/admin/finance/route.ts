import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminRole } from '@/lib/supabase/admin-auth';

export const dynamic = 'force-dynamic';
const CANCELLED = ['cancelled', 'canceled', 'dibatalkan', 'batal'];

async function getAdminDb(): Promise<SupabaseClient | NextResponse> {
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    const { isAdmin } = await verifyAdminRole(db, user);
    return isAdmin ? db as SupabaseClient : NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 });
  } catch {
    return NextResponse.json({ error: 'Sesi admin tidak tersedia.' }, { status: 401 });
  }
}

export async function GET(): Promise<NextResponse> {
  const db = await getAdminDb();
  if (db instanceof NextResponse) return db;
  const [ordersResult, productsResult, expensesResult] = await Promise.all([
    db.from('orders').select('*').order('created_at', { ascending: false }).limit(5000),
    db.from('products').select('*').limit(5000),
    db.from('admin_expenses').select('*').order('expense_date', { ascending: false }).limit(2000),
  ]);
  if (ordersResult.error) return NextResponse.json({ error: 'Gagal memuat data pesanan.' }, { status: 500 });
  const orders = (ordersResult.data ?? []).map((value) => {
    const row = value as unknown as Record<string, unknown>;
    return { id: String(row.id), order_number: String(row.order_number ?? row.id), order_type: String(row.order_type ?? ''), user_role: String(row.user_role ?? ''), product_name: String(row.product_name ?? ''), total_price: Number(row.total_price) || 0, status: String(row.status ?? ''), created_at: String(row.created_at ?? ''), cogs_amount: Number(row.cogs_amount) || 0, gateway_fee: Number(row.gateway_fee) || 0, paid_amount: Number(row.paid_amount) || 0, cash_status: String(row.cash_status ?? 'pending_settlement') };
  });
  const products = (productsResult.data ?? []).map((value) => {
    const row = value as unknown as Record<string, unknown>;
    const costValue = row.cost_price ?? row.hpp ?? row.cost;
    const stockValue = row.stock_quantity ?? row.stock ?? row.quantity;
    return { id: String(row.id), title: String(row.title ?? ''), cost_price: Number(costValue) || 0, stock_quantity: Number(stockValue) || 0, stock_status: String(row.stock_status ?? 'sold_out') };
  });
  return NextResponse.json({ orders, products, expenses: expensesResult.error ? [] : expensesResult.data ?? [], migrationReady: !expensesResult.error });
}

export async function POST(request: Request): Promise<NextResponse> {
  const db = await getAdminDb();
  if (db instanceof NextResponse) return db;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 });
  const input = body as Record<string, unknown>;
  if (input.action === 'expense') {
    if (typeof input.category !== 'string' || typeof input.description !== 'string' || typeof input.amount !== 'number' || input.amount <= 0) return NextResponse.json({ error: 'Lengkapi kategori, keterangan, dan nominal yang valid.' }, { status: 400 });
    const { error } = await db.from('admin_expenses').insert({ expense_date: String(input.date ?? ''), category: input.category, description: input.description, amount: Math.round(input.amount) });
    if (error) return NextResponse.json({ error: 'Pengeluaran gagal disimpan. Pastikan migrasi keuangan sudah diterapkan.' }, { status: 503 });
    return NextResponse.json({ success: true });
  }
  if (input.action === 'delete-expense' && typeof input.id === 'string') {
    const { error } = await db.from('admin_expenses').delete().eq('id', input.id);
    return error ? NextResponse.json({ error: 'Pengeluaran gagal dihapus.' }, { status: 500 }) : NextResponse.json({ success: true });
  }
  if (input.action === 'order' && typeof input.id === 'string') {
    const fields = { cogs_amount: Number(input.cogs_amount) || 0, gateway_fee: Number(input.gateway_fee) || 0, paid_amount: Number(input.paid_amount) || 0, cash_status: String(input.cash_status ?? 'pending_settlement') };
    if (!['settled', 'pending_settlement', 'dp_partial'].includes(fields.cash_status)) return NextResponse.json({ error: 'Status kas tidak valid.' }, { status: 400 });
    const { error } = await db.from('orders').update(fields).eq('id', input.id);
    return error ? NextResponse.json({ error: 'Data keuangan pesanan gagal disimpan. Pastikan migrasi sudah diterapkan.' }, { status: 503 }) : NextResponse.json({ success: true });
  }
  if (input.action === 'product' && typeof input.id === 'string') {
    const costPrice = Number(input.cost_price);
    const stockQuantity = Number(input.stock_quantity);
    if (!Number.isSafeInteger(costPrice) || costPrice < 0 || !Number.isSafeInteger(stockQuantity) || stockQuantity < 0) return NextResponse.json({ error: 'HPP dan jumlah stok harus berupa bilangan bulat positif.' }, { status: 400 });
    const { error } = await db.from('products').update({ cost_price: costPrice, stock_quantity: stockQuantity }).eq('id', input.id);
    return error ? NextResponse.json({ error: 'HPP dan stok gagal disimpan. Pastikan migrasi sudah diterapkan.' }, { status: 503 }) : NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 });
}
