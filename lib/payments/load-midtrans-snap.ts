let snapLoad: Promise<void> | null = null;

export function loadMidtransSnap(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Pembayaran hanya tersedia di browser.'));
  if (window.snap) return Promise.resolve();
  if (snapLoad) return snapLoad;

  snapLoad = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('midtrans-snap');
    const script = existing instanceof HTMLScriptElement ? existing : document.createElement('script');
    script.id = 'midtrans-snap';
    script.src = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.async = true;
    script.dataset.clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '';
    script.onload = () => window.snap ? resolve() : reject(new Error('Skrip pembayaran belum siap.'));
    script.onerror = () => reject(new Error('Skrip pembayaran gagal dimuat.'));
    if (!existing) document.head.appendChild(script);
  }).catch((error: unknown) => {
    snapLoad = null;
    throw error;
  });
  return snapLoad;
}
