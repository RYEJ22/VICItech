"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, LockKeyhole } from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { verifyAdminRole } from "@/lib/supabase/admin-auth";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

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
        if (!hasNoSession) {
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
    <main className="relative grid min-h-[calc(100vh-81px)] place-items-center overflow-hidden px-4 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(8,145,178,0.16),transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.08),transparent_40%)]" />
      <section className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-600/10 dark:bg-emerald-400/10 text-cyan-700 dark:text-cyan-300">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-400">Restricted access</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Login Admin</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Sign in with an administrator account to access ViciTech operations.
        </p>

        {isCheckingSession ? (
          <p role="status" className="mt-6 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Checking your session…
          </p>
        ) : (
          <form onSubmit={submitLogin} className="mt-6 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-600/60 dark:focus:border-emerald-400/60 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-50"
                placeholder="admin@example.com"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-600/60 dark:focus:border-emerald-400/60 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-50"
                placeholder="Your password"
              />
            </label>
            {errorMessage && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !isSupabaseAuthConfigured}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 dark:bg-emerald-400 px-4 py-3 text-sm font-semibold text-white dark:text-zinc-950 transition hover:bg-emerald-500 dark:hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Login sebagai Admin
            </button>
            {!isSupabaseAuthConfigured && (
              <p className="text-xs text-amber-700 dark:text-amber-300">Set the Supabase public URL and anon key to enable admin sign in.</p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
