'use client';

import { AlertCircle, LoaderCircle, MapPin, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { createPartnerAction, updatePartnerAction } from '@/app/admin/partners/actions';
import {
  isPartnerType,
  PARTNER_TYPE_LABELS,
  PARTNER_TYPES,
  validatePartnerPayload,
} from '@/lib/admin/partners-validation';
import type {
  PartnerFormPayload,
  PartnerRow,
  PartnerType,
} from '@/lib/admin/partners-validation';
import { AdminDrawer } from './admin-drawer';

interface PartnerEditorDrawerProps {
  readonly open: boolean;
  readonly partner: PartnerRow | null;
  readonly onClose: () => void;
  readonly onSaved: (saved: PartnerRow, mode: 'create' | 'edit') => void;
}

const inputClass =
  'min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-55';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary';

export function PartnerEditorDrawer({
  open,
  partner,
  onClose,
  onSaved,
}: PartnerEditorDrawerProps): ReactElement {
  const isEditing = Boolean(partner);

  const [name, setName] = useState('');
  const [type, setType] = useState<PartnerType>('service_center');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [gmapsUrl, setGmapsUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isVerified, setIsVerified] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrorMessage('');

    if (partner) {
      setName(partner.name);
      setType(partner.type);
      setCity(partner.city);
      setAddress(partner.address);
      setWhatsappNumber(partner.whatsapp_number ?? '');
      setGmapsUrl(partner.gmaps_url ?? '');
      setLatitude(partner.latitude === null ? '' : String(partner.latitude));
      setLongitude(partner.longitude === null ? '' : String(partner.longitude));
      setIsVerified(partner.is_verified);
    } else {
      setName('');
      setType('service_center');
      setCity('');
      setAddress('');
      setWhatsappNumber('');
      setGmapsUrl('');
      setLatitude('');
      setLongitude('');
      setIsVerified(true);
    }
  }, [open, partner]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const payload: PartnerFormPayload = {
      name,
      type,
      city,
      address,
      whatsapp_number: whatsappNumber,
      gmaps_url: gmapsUrl,
      latitude,
      longitude,
      is_verified: isVerified,
    };

    const clientCheck = validatePartnerPayload(payload);
    if (!clientCheck.ok) {
      setErrorMessage(clientCheck.error);
      return;
    }

    setIsSaving(true);
    try {
      const result = partner
        ? await updatePartnerAction(partner.id, payload)
        : await createPartnerAction(payload);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      onSaved(result.data, partner ? 'edit' : 'create');
    } catch (submitErr: unknown) {
      setErrorMessage(
        submitErr instanceof Error ? submitErr.message : 'Gagal menyimpan data mitra.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      closeDisabled={isSaving}
      badge={isEditing ? 'Edit Mitra Resmi' : 'Mitra Baru'}
      title={isEditing ? partner?.name || 'Edit Mitra' : 'Tambah Mitra & Service Center'}
      subtitle={
        isEditing
          ? `${partner?.city ?? ''} · ${partner ? PARTNER_TYPE_LABELS[partner.type] : ''}`
          : 'Daftarkan bengkel servis resmi atau toko komponen rekanan ViciTech.'
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-default bg-surface px-4 py-2 text-sm font-medium text-primary transition hover:bg-subtle disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            form="admin-partner-editor-form"
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-accent-hover hover:text-accent-foreground disabled:cursor-wait disabled:opacity-55"
          >
            {isSaving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
            <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Mitra'}</span>
          </button>
        </div>
      }
    >
      <form id="admin-partner-editor-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {errorMessage ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-red-50 p-3 text-sm text-status-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : null}

        <section className="space-y-4 rounded-xl border border-default bg-surface p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
            <MapPin className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Identitas &amp; Lokasi Mitra</span>
          </h3>

          <div>
            <label htmlFor="partner-name" className={labelClass}>
              Nama Mitra / Cabang
            </label>
            <input
              id="partner-name"
              type="text"
              required
              maxLength={160}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ViciTech Hub Bandung"
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="partner-type" className={labelClass}>
                Tipe Mitra
              </label>
              <select
                id="partner-type"
                value={type}
                onChange={(event) => {
                  const val = event.target.value;
                  if (isPartnerType(val)) setType(val);
                }}
                className={inputClass}
              >
                {PARTNER_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {PARTNER_TYPE_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="partner-city" className={labelClass}>
                Kota
              </label>
              <input
                id="partner-city"
                type="text"
                required
                maxLength={100}
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Bandung"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="partner-address" className={labelClass}>
              Alamat Lengkap
            </label>
            <textarea
              id="partner-address"
              rows={2}
              required
              maxLength={300}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Jl. Dipatiukur No. 40, Coblong"
              className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="partner-whatsapp" className={labelClass}>
                Nomor WhatsApp (Opsional)
              </label>
              <input
                id="partner-whatsapp"
                type="tel"
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                placeholder="6281234567890"
                className={`${inputClass} font-mono text-xs`}
              />
            </div>

            <div>
              <label htmlFor="partner-gmaps" className={labelClass}>
                Link Google Maps (Opsional)
              </label>
              <input
                id="partner-gmaps"
                type="url"
                value={gmapsUrl}
                onChange={(event) => setGmapsUrl(event.target.value)}
                placeholder="https://maps.google.com/?q=..."
                className={`${inputClass} text-xs`}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="partner-lat" className={labelClass}>
                Latitude (Opsional)
              </label>
              <input
                id="partner-lat"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                placeholder="-6.893500"
                className={`${inputClass} font-mono text-xs tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="partner-lng" className={labelClass}>
                Longitude (Opsional)
              </label>
              <input
                id="partner-lng"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                placeholder="107.615200"
                className={`${inputClass} font-mono text-xs tabular-nums`}
              />
            </div>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-default bg-canvas px-3.5 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4 text-status-live" strokeWidth={1.75} aria-hidden="true" />
              <span>Tandai sebagai Mitra Terverifikasi</span>
            </span>
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(event) => setIsVerified(event.target.checked)}
              className="h-5 w-5 accent-[#EA580C]"
            />
          </label>
        </section>
      </form>
    </AdminDrawer>
  );
}
