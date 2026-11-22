"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, LoaderCircle, LockKeyhole, RotateCcw } from "lucide-react";
import { forceResetAuthSession, getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { verifyAdminRole } from "@/lib/supabase/admin-auth";
import { isExpiredOrInvalidTokenError } from "@/lib/supabase/profile";

function safeNextPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/admin/dashboard";
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const handleForceResetSession = async () => {
    setIsResetting(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      await forceResetAuthSession();
      setPassword("");
      setStatusMessage("Cache sesi admin dan token kedaluwarsa telah dibersihkan. Silakan login kembali.");
      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(`Gagal mereset sesi: ${getErrorMessage(error, "Unknown error")}`);
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "unauthorized") {
      setErrorMessage("Access Denied: Admin privileges required");
    } else if (params.get("error") === "authorization") {
      setErrorMessage("Profil admin tidak dapat diverifikasi. Silakan coba lagi.");
    } else if (params.get("error") === "configuration") {
      setErrorMessage("Supabase authentication is not configured for this deployment.");
    }

    if (!isSupabaseAuthConfigured) {
      setIsCheckingSession(false);
      return;
    }

    let active = true;
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(async (result: {
      data: { user: { id: string; app_metadata?: { role?: string } } | null };
      error: { name: string; message: string } | null;
    }) => {
      if (!active) return;
      const { data, error } = result;
      if (error) {
        const hasNoSession =
          error.name === "AuthSessionMissingError" ||
          /auth session missing/i.test(error.message || "");
        if (isExpiredOrInvalidTokenError(error) && !hasNoSession) {
          await forceResetAuthSession(supabase);
          if (!active) return;
          setErrorMessage("Sesi admin kedaluwarsa dan cache lokal telah dibersihkan. Silakan login kembali.");
        } else if (!hasNoSession) {
          setErrorMessage(`Could not verify your session: ${error.message}`);
        }
      } else if (data.user) {
        const { isAdmin, error: roleError } = await verifyAdminRole(supabase, data.user);
        if (!active) return;
        if (roleError) {
          setErrorMessage(`Profil admin tidak dapat diverifikasi: ${roleError.message}`);
        } else if (isAdmin) {
          router.replace(safeNextPath(params.get("next") || "/admin/dashboard"));
        } else {
          const { error: signOutError } = await supabase.auth.signOut();
          if (!active) return;
          setErrorMessage(signOutError
            ? `Access Denied: Admin privileges required. Sign out failed: ${signOutError.message}`
            : "Access Denied: Admin privileges required");
        }
      }
      setIsCheckingSession(false);
    }).catch((error: unknown) => {
      if (!active) return;
      setErrorMessage(`Could not verify your session: ${getErrorMessage(error, "Unknown error")}`);
      setIsCheckingSession(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (!isSupabaseAuthConfigured) {
        throw new Error("Supabase authentication is not configured.");
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const { isAdmin, error: roleError } = await verifyAdminRole(supabase, data.user);
      if (roleError) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          throw new Error(`Profil admin tidak dapat diverifikasi: ${roleError.message}. Gagal mengakhiri sesi: ${signOutError.message}`);
        }
        throw new Error(`Profil admin tidak dapat diverifikasi: ${roleError.message}`);
      }

      if (!isAdmin) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          throw new Error(`Access Denied: Admin privileges required. Sign out failed: ${signOutError.message}`);
        }
        setErrorMessage("Access Denied: Admin privileges required");
        setPassword("");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      router.replace(safeNextPath(params.get("next") || "/admin/dashboard"));
      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Admin sign-in failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative grid min-h-[calc(100vh-81px)] place-items-center overflow-hidden bg-canvas px-4 pb-24 pt-12 md:pb-12">
      <section className="relative w-full max-w-md rounded-xl border border-default bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-default bg-accent-subtle text-accent-primary">
          <LockKeyhole className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-primary [text-wrap:balance]">
          Login Admin
        </h1>
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-secondary">
          Masuk dengan akun administrator terverifikasi untuk mengelola operasi QC dan katalog ViciTech.
        </p>

        {isCheckingSession ? (
          <p role="status" className="mt-6 flex items-center gap-2 text-sm text-secondary">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Memeriksa sesi aktif…
          </p>
        ) : (
          <form onSubmit={submitLogin} className="mt-6 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-primary">Email</span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting || isResetting}
                className="min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50"
                placeholder="admin@example.com"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-primary">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting || isResetting}
                className="min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50"
                placeholder="Kata sandi admin"
              />
            </label>
            {errorMessage && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-primary">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-danger" strokeWidth={1.75} />
                <span>{errorMessage}</span>
              </p>
            )}
            {statusMessage && (
              <p role="status" className="flex items-start gap-2 rounded-lg border border-status-live/30 bg-status-live/10 p-3 text-sm text-primary">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} />
                <span>{statusMessage}</span>
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting || isResetting || !isSupabaseAuthConfigured}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Login sebagai Admin
            </button>
            <button
              type="button"
              onClick={handleForceResetSession}
              disabled={isSubmitting || isResetting}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2 text-xs font-medium text-secondary transition hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:opacity-50"
            >
              {isResetting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />}
              Force Logout / Reset Session
            </button>
            {!isSupabaseAuthConfigured && (
              <p className="text-xs text-status-sample">Set the Supabase public URL and anon key to enable admin sign in.</p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
