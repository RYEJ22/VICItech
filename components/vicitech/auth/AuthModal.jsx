"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Github,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";
import {
  forceResetAuthSession,
  getSupabaseBrowserClient,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/client";
import {
  fetchOrEnsureUserProfile,
  isExpiredOrInvalidTokenError,
} from "@/lib/supabase/profile";

function getCallbackUrl() {
  const currentPath =
    window.location.pathname === "/"
      ? "/community"
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(currentPath || "/community")}`;
}

export default function AuthModal({ open, user, onClose, onNotify, onNavigate }) {
  const router = useRouter();
  const [mode, setMode] = useState("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasTokenError, setHasTokenError] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  useEffect(() => {
    if (!open || user) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting && !isResetting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isResetting, isSubmitting, onClose, open, user]);

  useEffect(() => {
    if (open) {
      setMessage("");
      setPassword("");
      setHasTokenError(false);
    }
  }, [mode, open]);

  if (!open || user) return null;

  const setError = (errorText, rawError = null) => {
    setMessage(errorText);
    setMessageType("error");
    setHasTokenError(Boolean(rawError && isExpiredOrInvalidTokenError(rawError)));
  };

  const handleForceResetSession = async () => {
    setIsResetting(true);
    try {
      await forceResetAuthSession();
      setHasTokenError(false);
      setPassword("");
      setMessage("Cache sesi dan token kedaluwarsa telah dibersihkan. Silakan masuk kembali.");
      setMessageType("success");
      onNotify?.("Session cache cleared. Please sign in again.");
      router.refresh();
    } catch (error) {
      setError(`Gagal mereset sesi: ${error.message}`, error);
    } finally {
      setIsResetting(false);
    }
  };

  const completePostAuth = async (supabase, activeUser) => {
    await fetchOrEnsureUserProfile(supabase, activeUser).catch(() => null);
    router.refresh();
    onClose();

    if (typeof window !== "undefined") {
      if (window.location.pathname === "/home") {
        onNavigate?.("community");
      } else if (window.location.pathname !== "/community") {
        router.push("/community");
      }
    }
  };

  const signInWithGitHub = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: getCallbackUrl() },
      });
      if (error) throw error;
    } catch (error) {
      setError(`GitHub sign-in failed: ${error.message}`, error);
      setIsSubmitting(false);
    }
  };

  const submitEmail = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "sign-in") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        setMessage("Signed in successfully.");
        setMessageType("success");
        onNotify?.("Signed in successfully.");
        await completePostAuth(supabase, data?.session?.user || data?.user);
        return;
      }

      const trimmedName = fullName.trim();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: trimmedName,
            display_name: trimmedName,
          },
          emailRedirectTo: getCallbackUrl(),
        },
      });
      if (error) throw error;

      if (data.session?.user) {
        onNotify?.("Account created and signed in.");
        await completePostAuth(supabase, data.session.user);
      } else {
        onNotify?.("Account created. Check your email to confirm your address.");
        onClose();
      }
    } catch (error) {
      const tokenExpired = isExpiredOrInvalidTokenError(error);
      const fallbackText = tokenExpired
        ? "Token sesi kedaluwarsa atau tidak valid. Gunakan Reset Session lalu masuk kembali."
        : error.message || "Authentication failed. Please try again.";
      setError(fallbackText, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const configured = isSupabaseAuthConfigured;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting && !isResetting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="w-full max-w-md overflow-hidden rounded-xl border border-default bg-surface text-primary shadow-2xl shadow-black/25"
      >
        <header className="flex items-start justify-between border-b border-default bg-canvas p-5 sm:p-6">
          <div>
            <h2 id="auth-title" className="font-serif text-2xl font-semibold text-primary [text-wrap:balance]">
              {mode === "sign-in" ? "Welcome back to ViciTech" : "Create your ViciTech account"}
            </h2>
            <p className="mt-1 text-sm text-secondary">
              {mode === "sign-in"
                ? "Sign in to access your profile, presets, and community hub."
                : "Join the ViciTech Circular IT ecosystem."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isResetting}
            aria-label="Close sign-in dialog"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-secondary transition hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:opacity-50"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        <div className="space-y-4 p-5 sm:p-6">
          {!configured && (
            <p
              role="alert"
              className="rounded-lg border border-status-sample/30 bg-status-sample/10 p-3 text-sm text-primary"
            >
              Add the Supabase URL and anon key to <code>.env.local</code> to enable authentication.
            </p>
          )}

          <button
            type="button"
            onClick={signInWithGitHub}
            disabled={isSubmitting || isResetting || !configured}
            className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-default bg-canvas px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" strokeWidth={1.75} />}
            Continue with GitHub
          </button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-secondary">
            <span className="h-px flex-1 bg-default" />
            or use email
            <span className="h-px flex-1 bg-default" />
          </div>

          <form onSubmit={submitEmail} className="space-y-4">
            {mode === "sign-up" && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-primary">Full Name</span>
                <input
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={isSubmitting || isResetting}
                  className="min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50"
                  placeholder="Your display name"
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
                disabled={isSubmitting || isResetting}
                className="min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-primary">Password</span>
              <input
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting || isResetting}
                className="min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50"
                placeholder="At least 6 characters"
              />
            </label>

            {message && (
              <div
                role={messageType === "error" ? "alert" : "status"}
                className={`space-y-2 rounded-lg border p-3 text-sm ${
                  messageType === "error"
                    ? "border-status-danger/30 bg-status-danger/10 text-primary"
                    : "border-status-live/30 bg-status-live/10 text-primary"
                }`}
              >
                <p className="flex items-start gap-2">
                  {messageType === "error" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-danger" strokeWidth={1.75} />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} />
                  )}
                  <span>{message}</span>
                </p>
                {hasTokenError && (
                  <button
                    type="button"
                    onClick={handleForceResetSession}
                    disabled={isResetting}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-status-danger/30 bg-surface px-3 py-2 text-xs font-semibold text-primary transition hover:bg-subtle disabled:opacity-50"
                  >
                    {isResetting ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5 text-status-danger" strokeWidth={1.75} />
                    )}
                    Force Logout / Reset Session
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isResetting || !configured}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-accent-hover hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {mode === "sign-in" ? "Sign in with email" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-secondary">
            {mode === "sign-in" ? "New to ViciTech?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              disabled={isSubmitting || isResetting}
              className="font-semibold text-primary underline decoration-accent-primary underline-offset-4 hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:opacity-50"
            >
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </button>
          </p>

          <details className="border-t border-default pt-3 text-xs text-secondary">
            <summary className="cursor-pointer select-none font-medium hover:text-primary">
              Session troubleshooting &amp; cache recovery
            </summary>
            <div className="mt-2 space-y-2">
              <p>
                Jika login gagal karena token lama atau cache sesi bermasalah, bersihkan cache lokal
                terlebih dahulu.
              </p>
              <button
                type="button"
                onClick={handleForceResetSession}
                disabled={isResetting || isSubmitting}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary transition hover:bg-subtle disabled:opacity-50"
              >
                {isResetting ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                Force Logout / Reset Session
              </button>
            </div>
          </details>
        </div>
      </section>
    </div>,
    document.body
  );
}
