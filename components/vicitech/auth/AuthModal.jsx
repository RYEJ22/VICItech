"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Github, LoaderCircle, X } from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";

function getCallbackUrl() {
  const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath || "/")}`;
}

export default function AuthModal({ open, onClose, onNotify }) {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose, open]);

  useEffect(() => {
    if (open) {
      setMessage("");
      setPassword("");
    }
  }, [mode, open]);

  if (!open) return null;

  const setError = (error) => {
    setMessage(error);
    setMessageType("error");
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
      setError(`GitHub sign-in failed: ${error.message}`);
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
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        setMessage("You are signed in.");
        setMessageType("success");
        onNotify?.("Signed in successfully.");
        onClose();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: getCallbackUrl() },
      });
      if (error) throw error;

      if (data.session) {
        setMessage("Your account is ready.");
        setMessageType("success");
        onNotify?.("Account created and signed in.");
        onClose();
      } else {
        setMessage("Check your email for a confirmation link to finish creating your account.");
        setMessageType("success");
      }
    } catch (error) {
      setError(error.message || "Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const configured = isSupabaseAuthConfigured;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/70"
      >
        <header className="flex items-start justify-between border-b border-zinc-800 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">ViciTech OS</p>
            <h2 id="auth-title" className="mt-2 text-xl font-semibold text-zinc-50">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {mode === "sign-in" ? "Sign in to your ViciTech account." : "Join the ViciTech ecosystem."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close sign-in dialog"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 p-5 sm:p-6">
          {!configured && (
            <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              Add the Supabase URL and anon key to <code>.env.local</code> to enable authentication.
            </p>
          )}

          <button
            type="button"
            onClick={signInWithGitHub}
            disabled={isSubmitting || !configured}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
            Continue with GitHub
          </button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-zinc-600">
            <span className="h-px flex-1 bg-zinc-800" />
            or use email
            <span className="h-px flex-1 bg-zinc-800" />
          </div>

          <form onSubmit={submitEmail} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-300">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-50"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-300">Password</span>
              <input
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-50"
                placeholder="At least 6 characters"
              />
            </label>

            {message && (
              <p
                role={messageType === "error" ? "alert" : "status"}
                className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  messageType === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {messageType === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{message}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !configured}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {mode === "sign-in" ? "Sign in with email" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-400">
            {mode === "sign-in" ? "New to ViciTech?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              disabled={isSubmitting}
              className="font-medium text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
            >
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
