'use client';

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { AlertCircle, AlertTriangle, LoaderCircle, X } from 'lucide-react';
import { ORDER_CANCEL_REASONS } from '@/lib/profile/profile-types';
import type { ProfileOrderRecord } from '@/lib/profile/profile-types';

interface CancelOrderModalProps {
  readonly order: ProfileOrderRecord | null;
  readonly isSubmitting: boolean;
  readonly error: string;
  readonly onClose: () => void;
  readonly onConfirm: (reason: string) => void;
}

const focusRing =
  'vt-motion-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60';

export function CancelOrderModal({
  order,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: CancelOrderModalProps): ReactElement | null {
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    setSelectedPreset('');
    setCustomReason('');
  }, [order?.id]);

  useEffect(() => {
    if (!order || typeof window === 'undefined') return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !isSubmitting) {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [order, isSubmitting, onClose]);

  if (!order) return null;

  const finalReason = customReason.trim() || selectedPreset;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
        className="vt-dialog-enter w-full max-w-md rounded-2xl border border-[#E4E4E7] bg-white p-5 text-[#18181B] shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-200 bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="cancel-order-title"
                className="tracking-tight font-sans text-lg font-bold text-[#18181B]"
              >
                Batalkan Pesanan?
              </h2>
              <p className="mt-0.5 font-mono text-xs text-[#71717A]">
                {order.orderNumber || order.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup dialog pembatalan"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#E4E4E7] bg-[#FAF9F6] text-[#18181B] transition hover:bg-[#F3F1ED] disabled:opacity-50 ${focusRing}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#71717A]">
          Anda akan membatalkan pesanan{' '}
          <span className="font-semibold text-[#18181B]">{order.productName}</span>. Pesanan
          yang sudah dibatalkan tidak dapat diaktifkan kembali.
        </p>

        <div className="mt-4 space-y-2.5">
          <p className="text-xs font-semibold text-[#18181B]">
            Alasan Pembatalan <span className="font-normal text-[#71717A]">(Opsional)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ORDER_CANCEL_REASONS.map((reason) => {
              const active = selectedPreset === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedPreset(active ? '' : reason)}
                  className={`min-h-9 rounded-full border px-3 py-1 text-xs transition ${focusRing} ${
                    active
                      ? 'border-[#EA580C] bg-[#FFF7ED] font-semibold text-[#C2410C]'
                      : 'border-[#E4E4E7] bg-[#FAF9F6] text-[#71717A] hover:border-[#18181B]/30 hover:text-[#18181B]'
                  }`}
                >
                  {reason}
                </button>
              );
            })}
          </div>

          <label className="block pt-1">
            <span className="sr-only">Catatan alasan pembatalan lainnya</span>
            <input
              type="text"
              value={customReason}
              disabled={isSubmitting}
              maxLength={240}
              onChange={(event) => setCustomReason(event.target.value)}
              placeholder="Atau tulis alasan singkat lainnya (opsional)…"
              className="vt-form-control min-h-10 w-full rounded-lg border border-[#E4E4E7] bg-[#FAF9F6] px-3 py-2 text-xs text-[#18181B] placeholder:text-[#71717A] focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20"
            />
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[#E4E4E7] bg-[#FAF9F6] px-4 py-2 text-sm font-medium text-[#18181B] transition hover:bg-[#F3F1ED] disabled:opacity-50 ${focusRing}`}
          >
            Kembali
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onConfirm(finalReason)}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
          >
            {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{isSubmitting ? 'Membatalkan…' : 'Ya, Batalkan Pesanan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CancelOrderModal;
