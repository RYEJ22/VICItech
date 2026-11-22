"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, LoaderCircle, MailCheck } from "lucide-react";
import { mapAuthErrorMessage } from "@/lib/auth/auth-errors";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";

export type AuthFormMode = "login" | "register";

export interface AuthFormProps {
  readonly mode: AuthFormMode;
  readonly next: string;
  readonly initialError?: string;
}

const inputClass =
  "min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50";

function GitHubIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.1 3.3 9.42 7.87 10.95.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.77.11 3.06.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function AuthForm({ mode, next, initialError }: AuthFormProps): ReactElement {
  const router = useRouter();
  const isRegister = mode === "register";
  const safeNext = sanitizeNextPath(next);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirectingOAuth, setIsRedirectingOAuth] = useState(false);
  const [error, setError] = useState(initialError ? mapAuthErrorMessage(initialError) : "");
  const [confirmationEmail, setConfirmationEmail] = useState("");

  const busy = isSubmitting || isRedirectingOAuth;
  const disabled = busy || !isSupabaseAuthConfigured;

  const signInWithGitHub = async (): Promise<void> => {
    setError("");
    setIsRedirectingOAuth(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
    } catch (caught) {
      setError(mapAuthErrorMessage(caught));
      setIsRedirectingOAuth(false);
    }
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!isRegister) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        router.push(safeNext);
        router.refresh();
        return;
      }

      const trimmedName = fullName.trim();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: trimmedName, display_name: trimmedName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        router.push(safeNext);
        router.refresh();
        return;
      }
      setConfirmationEmail(email.trim());
    } catch (caught) {
      setError(mapAuthErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmationEmail) {
    return (
      <div role="status" className="space-y-4 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-subtle text-accent-primary">
          <MailCheck className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h2 className="font-serif text-xl font-semibold text-primary">Periksa email Anda</h2>
        <p className="text-sm leading-relaxed text-secondary">
          Kami mengirim tautan konfirmasi ke{" "}
          <span className="font-mono font-semibold text-primary">{confirmationEmail}</span>. Buka kotak masuk
          Anda (cek juga folder spam) lalu klik tautan tersebut untuk mengaktifkan akun.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-default bg-canvas px-4 text-sm font-medium text-primary transition hover:bg-subtle"
        >
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isSupabaseAuthConfigured && (
        <p role="alert" className="rounded-lg border border-status-sample/30 bg-status-sample/10 p-3 text-sm text-primary">
          Autentikasi belum dikonfigurasi. Tambahkan URL dan anon key Supabase ke <code>.env.local</code>.
        </p>
      )}

      <button
        type="button"
        onClick={signInWithGitHub}
        disabled={disabled}
        className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-default bg-canvas px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRedirectingOAuth ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <GitHubIcon />}
        {isRedirectingOAuth ? "Mengalihkan ke GitHub…" : "Lanjutkan dengan GitHub"}
      </button>

      <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-secondary">
        <span className="h-px flex-1 bg-border-default" />
        atau lanjutkan dengan email
        <span className="h-px flex-1 bg-border-default" />
      </div>

      <form onSubmit={submitEmail} className="space-y-4">
        {isRegister && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-primary">Nama Lengkap</span>
            <input
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={busy}
              className={inputClass}
              placeholder="Nama tampilan Anda"
            />
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-primary">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
            className={inputClass}
            placeholder="nama@email.com"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-primary">Kata Sandi</span>
          <input
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
            className={inputClass}
            placeholder="Minimal 6 karakter"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-primary"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-danger" strokeWidth={1.75} aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={disabled}
          className="vt-btn-tactile flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="hidden h-4 w-4" aria-hidden="true" />
          )}
          {isRegister ? "Buat Akun" : "Masuk dengan Email"}
        </button>
      </form>

      <p className="text-center text-sm text-secondary">
        {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
        <Link
          href={`${isRegister ? "/login" : "/register"}?next=${encodeURIComponent(safeNext)}`}
          className="font-semibold text-primary underline decoration-accent-primary underline-offset-4 hover:text-accent-primary"
        >
          {isRegister ? "Masuk" : "Daftar sekarang"}
        </Link>
      </p>
    </div>
  );
}
