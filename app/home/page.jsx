import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function readSingleParam(value) {
  return typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? '') : '';
}

export default async function HomeRedirectPage({ searchParams }) {
  const resolved = await Promise.resolve(searchParams);
  const tab = readSingleParam(resolved?.tab).toLowerCase();
  const view = readSingleParam(resolved?.view).toLowerCase();
  const productId = readSingleParam(resolved?.productId);

  if (tab === 'builder') {
    redirect(productId ? `/builder?productId=${encodeURIComponent(productId)}` : '/builder');
  }
  if (tab === 'bottleneck') {
    redirect('/bottleneck');
  }
  if (tab === 'versus') {
    redirect('/versus');
  }
  if (tab === 'tradein' || tab === 'trade-in') {
    redirect('/trade-in');
  }
  if (tab === 'qc') {
    redirect('/qc-panel');
  }
  if (tab === 'account' || tab === 'profile') {
    redirect('/profile');
  }
  if (tab === 'community') {
    redirect('/community');
  }
  if (tab === 'market' || tab === 'library') {
    if (view === 'upgrade') {
      redirect('/market?view=upgrade');
    }
    if (tab === 'library' || view === 'catalog' || view === 'library') {
      redirect('/market?view=catalog');
    }
    redirect('/market');
  }

  redirect('/');
}
