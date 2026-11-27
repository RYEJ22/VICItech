'use client';

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { AlertCircle, AlertTriangle, LoaderCircle, X } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
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
  'vt-motion-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50';

export function CancelOrderModal({
  order,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: CancelOrderModalProps): ReactElement | null {
  const { isEnglish } = useLanguage();
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
      className="vt-backdrop-enter fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
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
        className="vt-dialog-enter max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-xl border border-default bg-surface p-5 text-primary shadow-floating sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-red-200 bg-red-50 text-status-danger">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="cancel-order-title"
                className="font-sans text-lg font-bold tracking-tight text-primary"
              >
                {isEnglish ? 'Cancel Order?' : 'Batalkan Pesanan?'}
              </h2>
              <p className="mt-0.5 break-all font-mono text-xs text-secondary">
                {order.orderNumber || order.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={isEnglish ? 'Close cancellation dialog' : 'Tutup dialog pembatalan'}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-default bg-canvas text-primary transition-colors hover:bg-subtle disabled:opacity-50 ${focusRing}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-secondary">
          {isEnglish ? 'You are about to cancel order ' : 'Anda akan membatalkan pesanan '}
          <span className="font-semibold text-primary">{order.productName}</span>
          {isEnglish
            ? '. Once cancelled, this order cannot be reactivated.'
            : '. Pesanan yang sudah dibatalkan tidak dapat diaktifkan kembali.'}
        </p>

        <div className="mt-4 space-y-2.5">
          <p className="text-xs font-semibold text-primary">
            {isEnglish ? 'Cancellation Reason ' : 'Alasan Pembatalan '}
            <span className="font-normal text-secondary">
              {isEnglish ? '(Optional)' : '(Opsional)'}
            </span>
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
                  className={`min-h-11 rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ease-smooth sm:min-h-10 ${focusRing} ${
                    active
                      ? 'border-accent-primary bg-accent-subtle font-semibold text-accent-hover'
                      : 'border-default bg-canvas text-secondary hover:border-strong hover:text-primary'
                  }`}
                >
                  {reason}
                </button>
              );
            })}
          </div>

          <label className="block pt-1">
            <span className="sr-only">
              {isEnglish ? 'Additional cancellation reason' : 'Catatan alasan pembatalan lainnya'}
            </span>
            <input
              type="text"
              value={customReason}
              disabled={isSubmitting}
              maxLength={240}
              onChange={(event) => setCustomReason(event.target.value)}
              placeholder={
                isEnglish
                  ? 'Or write another brief reason (optional)…'
                  : 'Atau tulis alasan singkat lainnya (opsional)…'
              }
              className="vt-form-control min-h-11 w-full rounded-lg border border-default bg-subtle px-3 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
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
            className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-default bg-canvas px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-subtle disabled:opacity-50 ${focusRing}`}
          >
            {isEnglish ? 'Back' : 'Kembali'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onConfirm(finalReason)}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-status-danger px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-smooth hover:bg-red-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
          >
            {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>
              {isSubmitting
                ? isEnglish
                  ? 'Cancelling…'
                  : 'Membatalkan…'
                : isEnglish
                  ? 'Yes, Cancel Order'
                  : 'Ya, Batalkan Pesanan'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CancelOrderModal;
