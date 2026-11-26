'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Lightbulb,
  MessageSquareHeart,
  MoreHorizontal,
  Send,
  Star,
} from 'lucide-react';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';

type FeedbackCategory =
  | 'Saran Fitur'
  | 'Laporan Bug'
  | 'Testimoni / Pengalaman'
  | 'Lainnya';

interface CategoryOption {
  readonly value: FeedbackCategory;
  readonly label: string;
  readonly description: string;
  readonly icon: typeof Lightbulb;
}

const CATEGORY_OPTIONS: readonly CategoryOption[] = [
  {
    value: 'Saran Fitur',
    label: 'Saran Fitur',
    description: 'Usulan alat baru atau peningkatan alur kerja.',
    icon: Lightbulb,
  },
  {
    value: 'Laporan Bug',
    label: 'Laporan Bug',
    description: 'Kendala tampilan, error, atau perhitungan.',
    icon: Bug,
  },
  {
    value: 'Testimoni / Pengalaman',
    label: 'Testimoni / Pengalaman',
    description: 'Ceritakan pengalamanmu mencoba ViciTech OS.',
    icon: MessageSquareHeart,
  },
  {
    value: 'Lainnya',
    label: 'Lainnya',
    description: 'Pertanyaan umum, privasi data, atau kerja sama.',
    icon: MoreHorizontal,
  },
];

const MODULE_OPTIONS: readonly string[] = [
  'Tidak spesifik',
  'Beranda',
  'Market & Katalog',
  'Smart Preset Builder',
  'Bottleneck Analyzer',
  'Upgrade Analyzer',
  'Konsultan Rakitan AI',
  'Circular Trade-In',
  'Komunitas & DM',
  'IoT QC Panel',
  'Profil & Pesanan',
  'Kebijakan Cookie & Privasi',
  'Lainnya',
];

const RATING_LABELS: Readonly<Record<number, string>> = {
  1: 'Sangat Kurang',
  2: 'Kurang',
  3: 'Cukup Baik',
  4: 'Baik',
  5: 'Sangat Baik',
};

interface SubmittedSummary {
  readonly category: FeedbackCategory;
  readonly rating: number;
  readonly pageModule: string | null;
}

export function FeedbackForm() {
  const [category, setCategory] = useState<FeedbackCategory>('Saran Fitur');
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState('');
  const [pageModule, setPageModule] = useState('Tidak spesifik');
  const [contactName, setContactName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedSummary | null>(null);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) return;

    let active = true;
    const supabase = getSupabaseBrowserClient();

    async function prefillSignedInUser(): Promise<void> {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active || !user) return;
        setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .maybeSingle();

        if (!active) return;

        const displayName =
          (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
          (typeof profile?.username === 'string' && profile.username.trim() ? `@${profile.username.trim()}` : '') ||
          (typeof user.email === 'string' ? user.email : '');

        if (displayName) {
          setContactName((current) => (current.trim() ? current : displayName));
          setIsAutoFilled(true);
        }
      } catch {
        // Pengguna tamu tetap dapat mengisi form tanpa login.
      }
    }

    void prefillSignedInUser();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    setErrorMessage(null);

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 5) {
      setErrorMessage('Mohon tulis pesan minimal 5 karakter agar masukan Anda dapat kami pahami.');
      return;
    }

    if (rating < 1 || rating > 5) {
      setErrorMessage('Pilih rating antara 1 hingga 5.');
      return;
    }

    if (!isSupabaseAuthConfigured) {
      setErrorMessage('Layanan penyimpanan masukan belum terhubung di lingkungan ini.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const selectedModule = pageModule === 'Tidak spesifik' ? null : pageModule;
      const cleanContact = contactName.trim() || null;

      const { error } = await supabase.from('user_feedback').insert({
        user_id: userId,
        category,
        rating,
        message: trimmedMessage,
        page_module: selectedModule,
        contact_name: cleanContact,
      });

      if (error) {
        setErrorMessage(
          'Gagal mengirim masukan ke server. Silakan periksa koneksi Anda dan coba beberapa saat lagi.',
        );
        return;
      }

      setSubmitted({
        category,
        rating,
        pageModule: selectedModule,
      });
      setMessage('');
    } catch {
      setErrorMessage('Terjadi gangguan jaringan saat mengirim masukan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section
        aria-live="polite"
        className="rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EA580C]">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-[#18181B]">
          Terima kasih atas masukan Anda!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#52525B]">
          Laporan Anda telah tersimpan di basis data validasi ViciTech OS dan akan ditinjau langsung oleh tim pengembang.
        </p>

        <dl className="mt-5 grid gap-3 rounded-xl border border-[#EEEAE5] bg-[#FAF9F6] p-4 text-xs sm:grid-cols-3">
          <div>
            <dt className="font-medium text-[#52525B]">Kategori</dt>
            <dd className="mt-1 font-semibold text-[#18181B]">{submitted.category}</dd>
          </div>
          <div>
            <dt className="font-medium text-[#52525B]">Rating</dt>
            <dd className="mt-1 font-semibold text-[#18181B]">
              {submitted.rating} / 5 ({RATING_LABELS[submitted.rating]})
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[#52525B]">Halaman / Modul</dt>
            <dd className="mt-1 font-semibold text-[#18181B]">
              {submitted.pageModule ?? 'Umum'}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSubmitted(null)}
            className="vt-motion-press inline-flex min-h-11 items-center justify-center rounded-xl bg-[#EA580C] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 focus-visible:ring-offset-2"
          >
            Kirim Masukan Lain
          </button>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-6 rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm sm:p-7"
      noValidate
    >
      {/* ── Kategori ── */}
      <fieldset>
        <legend className="text-sm font-semibold text-[#18181B]">
          Kategori Masukan <span className="text-[#EA580C]">*</span>
        </legend>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          {CATEGORY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = category === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                aria-pressed={selected}
                className={`vt-motion-press flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 ${
                  selected
                    ? 'border-[#EA580C] bg-[#FFF7ED]'
                    : 'border-[#E4E4E7] bg-[#FAF9F6] hover:border-[#D4D4D8] hover:bg-white'
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    selected
                      ? 'bg-[#EA580C] text-white'
                      : 'bg-white text-[#52525B] border border-[#E4E4E7]'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#18181B]">{option.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[#52525B]">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ── Rating 1–5 ── */}
      <fieldset>
        <legend className="text-sm font-semibold text-[#18181B]">
          Penilaian Pengalaman (1–5) <span className="text-[#EA580C]">*</span>
        </legend>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => {
            const active = value <= rating;
            const isExact = value === rating;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-label={`Beri rating ${value} dari 5: ${RATING_LABELS[value]}`}
                aria-pressed={isExact}
                className={`vt-motion-press inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 ${
                  isExact
                    ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C]'
                    : 'border-[#E4E4E7] bg-[#FAF9F6] text-[#52525B] hover:border-[#D4D4D8] hover:bg-white'
                }`}
              >
                <Star
                  className={`h-4 w-4 ${active ? 'fill-[#EA580C] text-[#EA580C]' : 'text-[#A1A1AA]'}`}
                  aria-hidden="true"
                />
                <span>{value}</span>
              </button>
            );
          })}
          <span className="ml-1 text-xs font-medium text-[#52525B]">
            {RATING_LABELS[rating]}
          </span>
        </div>
      </fieldset>

      {/* ── Pesan ── */}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="feedback-message" className="text-sm font-semibold text-[#18181B]">
            Detail Masukan <span className="text-[#EA580C]">*</span>
          </label>
          <span className="text-xs text-[#52525B]">{message.length}/2000</span>
        </div>
        <textarea
          id="feedback-message"
          required
          rows={5}
          maxLength={2000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Jelaskan fitur yang Anda harapkan, langkah reproduksi bug, atau kesan Anda saat menggunakan ViciTech…"
          className="mt-2 w-full resize-y rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] px-3.5 py-3 text-sm leading-relaxed text-[#18181B] placeholder:text-[#71717A] focus-visible:border-[#EA580C] focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
        />
      </div>

      {/* ── Modul & Kontak Opsional ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="feedback-module" className="block text-sm font-semibold text-[#18181B]">
            Halaman / Modul <span className="text-xs font-normal text-[#52525B]">(Opsional)</span>
          </label>
          <select
            id="feedback-module"
            value={pageModule}
            onChange={(event) => setPageModule(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] px-3.5 text-sm text-[#18181B] focus-visible:border-[#EA580C] focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
          >
            {MODULE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="feedback-contact" className="block text-sm font-semibold text-[#18181B]">
            Nama / Kontak <span className="text-xs font-normal text-[#52525B]">(Opsional)</span>
          </label>
          <input
            id="feedback-contact"
            type="text"
            maxLength={160}
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            placeholder="Nama, @username, atau email"
            className="mt-2 min-h-11 w-full rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] px-3.5 text-sm text-[#18181B] placeholder:text-[#71717A] focus-visible:border-[#EA580C] focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
          />
          {isAutoFilled ? (
            <p className="mt-1 text-xs text-[#52525B]">
              Diisi otomatis dari akun Anda yang sedang masuk. Anda bebas mengubah atau mengosongkannya.
            </p>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-relaxed text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEEAE5] pt-4">
        <p className="text-xs leading-relaxed text-[#52525B]">
          Dapat dikirim tanpa login. Masukan hanya dapat dibaca oleh admin ViciTech.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="vt-motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#C2410C] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 focus-visible:ring-offset-2"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span>{submitting ? 'Mengirim…' : 'Kirim Masukan'}</span>
        </button>
      </div>
    </form>
  );
}
