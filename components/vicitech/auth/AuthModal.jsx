"use client";

import { useEffect, useRef, useState } from "react";
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

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-4 w-4">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.02 46.98 31.9 46.98 24.55Z" />
      <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.18 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -4)" />
    </svg>
  );
}

function MessageNotice({ message, messageType, hasTokenError, isResetting, onReset }) {
  return (
    <div role={messageType === "error" ? "alert" : "status"} className={`space-y-2 rounded-lg border p-3 text-sm ${messageType === "error" ? "border-status-danger/30 bg-status-danger/10 text-primary" : "border-status-live/30 bg-status-live/10 text-primary"}`}>
      <p className="flex items-start gap-2">
        {messageType === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-danger" strokeWidth={1.75} /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} />}
        <span>{message}</span>
      </p>
      {hasTokenError && <button type="button" onClick={onReset} disabled={isResetting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-status-danger/30 bg-surface px-3 py-2 text-xs font-semibold text-primary transition hover:bg-subtle disabled:opacity-50">{isResetting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 text-status-danger" strokeWidth={1.75} />}Force Logout / Reset Session</button>}
    </div>
  );
}

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
  const [step, setStep] = useState("credentials");
  const [authMethod, setAuthMethod] = useState("password");
  const [otp, setOtp] = useState(Array(8).fill(""));
  const [otpType, setOtpType] = useState("email");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasTokenError, setHasTokenError] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const otpRefs = useRef([]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

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
      setOtp(Array(8).fill(""));
      setStep("credentials");
      setOtpType("email");
      setAuthMethod("password");
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
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const signedInUser = session?.user || activeUser;
    if (!session || !signedInUser) {
      throw new Error("Your email was verified, but a session could not be started. Please sign in again.");
    }

    await fetchOrEnsureUserProfile(supabase, signedInUser).catch(() => null);
    router.refresh();
    onClose();

    if (typeof window !== "undefined") {
      if (window.location.pathname !== "/community") {
        onNavigate?.("community");
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

  const signInWithGoogle = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getCallbackUrl() },
      });
      if (error) throw error;
    } catch (error) {
      setError(`Google sign-in failed: ${error.message}`, error);
      setIsSubmitting(false);
    }
  };

  const sendOtp = async () => {
    if (!email.trim()) {
      setError("Enter your email address to receive a sign-in code.");
      return;
    }
    if (mode === "sign-up" && fullName.trim().length < 2) {
      setError("Enter your name to create an account.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          ...(mode === "sign-up" && fullName.trim() ? { data: { full_name: fullName.trim(), display_name: fullName.trim() } } : {}),
        },
      });
      if (error) throw error;
      setOtp(Array(8).fill(""));
      setOtpType("email");
      setStep("verify-otp");
      setResendSeconds(60);
      setMessage(`An 8-digit code was sent to ${email.trim()}.`);
      setMessageType("success");
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch (error) {
      setError(error.message || "Could not send your code. Please try again.", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateOtp = (index, value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length > 1) {
      const pasted = digits.slice(0, 8).split("");
      setOtp((current) => current.map((_, i) => pasted[i] || ""));
      otpRefs.current[Math.min(pasted.length, 7)]?.focus();
      return;
    }
    setOtp((current) => current.map((digit, i) => (i === index ? digits : digit)));
    if (digits && index < 7) otpRefs.current[index + 1]?.focus();
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    const token = otp.join("");
    if (token.length !== 8) {
      setError("Enter all 8 digits from your email.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: otpType });
      if (error) throw error;
      onNotify?.("Signed in successfully.");
      await completePostAuth(supabase, data?.user || data?.session?.user);
    } catch (error) {
      setError(error.message || "That code could not be verified. Please try again.", error);
    } finally {
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
        setOtpType("signup");
        setOtp(Array(8).fill(""));
        setResendSeconds(60);
        setStep("verify-otp");
        setMessage(`An 8-digit confirmation code was sent to ${email.trim()}.`);
        setMessageType("success");
        window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
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

  const resendOtp = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const result = otpType === "signup"
        ? await supabase.auth.resend({ type: "signup", email: email.trim() })
        : await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (result.error) throw result.error;
      setOtp(Array(8).fill(""));
      setResendSeconds(60);
      setMessage(`A new code was sent to ${email.trim()}.`);
      setMessageType("success");
      otpRefs.current[0]?.focus();
    } catch (error) {
      setError(error.message || "Could not resend your code. Please try again.", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnToCredentials = () => {
    setStep("credentials");
    setOtp(Array(8).fill(""));
    setResendSeconds(0);
    setMessage("");
  };

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
            <h2 id="auth-title" className="tracking-tight font-sans text-2xl font-bold text-primary [text-wrap:balance]">
              {step === "verify-otp" ? "Verify your email" : mode === "sign-in" ? "Welcome back to ViciTech" : "Create your ViciTech account"}
            </h2>
            <p className="mt-1 text-sm text-secondary">
              {step === "verify-otp"
                ? `Enter the 8-digit code sent to ${email}.`
                : mode === "sign-in"
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
          {step === "credentials" && <>
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

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isSubmitting || isResetting || !configured}
            className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-default bg-canvas px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-secondary">
            <span className="h-px flex-1 bg-default" />
            or use email
            <span className="h-px flex-1 bg-default" />
          </div></>}

          {step === "credentials" && (mode === "sign-in" || mode === "sign-up") && (
            <div className="flex rounded-lg border border-default bg-canvas p-1 text-sm">
              <button type="button" onClick={() => { setAuthMethod("password"); setMessage(""); }} className={`min-h-10 flex-1 rounded-md px-2 font-medium transition ${authMethod === "password" ? "bg-surface text-primary shadow-sm" : "text-secondary hover:text-primary"}`}>Email + password</button>
              <button type="button" onClick={() => { setAuthMethod("otp"); setMessage(""); }} className={`min-h-10 flex-1 rounded-md px-2 font-medium transition ${authMethod === "otp" ? "bg-surface text-primary shadow-sm" : "text-secondary hover:text-primary"}`}>Sign in with 8-digit OTP code</button>
            </div>
          )}

          {step === "credentials" && mode === "sign-up" && (
            <p className="rounded-lg border border-status-sample/30 bg-status-sample/10 p-3 text-sm text-primary">
              Creating and verifying a new account will sign this browser into that account, replacing any current Supabase session.
            </p>
          )}

          {step === "credentials" && authMethod === "otp" ? (
            <form onSubmit={(event) => { event.preventDefault(); sendOtp(); }} className="space-y-4">
              {mode === "sign-up" && <label className="block space-y-1.5"><span className="text-sm font-medium text-primary">Full Name</span><input type="text" autoComplete="name" minLength={2} maxLength={80} required value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={isSubmitting || isResetting} className="vt-form-control min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50" placeholder="Your display name" /></label>}
              <label className="block space-y-1.5"><span className="text-sm font-medium text-primary">Email</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting || isResetting} className="vt-form-control min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50" placeholder="you@example.com" /></label>
              {message && <MessageNotice message={message} messageType={messageType} hasTokenError={hasTokenError} isResetting={isResetting} onReset={handleForceResetSession} />}
              <button type="submit" disabled={isSubmitting || isResetting || !configured} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}Send 8-digit code</button>
            </form>
          ) : step === "verify-otp" ? (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="flex items-center justify-between text-sm"><span className="text-secondary">Code sent to <strong className="font-medium text-primary">{email}</strong></span><button type="button" onClick={returnToCredentials} disabled={isSubmitting} className="font-semibold text-accent-primary underline underline-offset-4">Change email</button></div>
              <div className="flex justify-between gap-1.5" onPaste={(event) => { const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8); if (pasted) { event.preventDefault(); updateOtp(0, pasted); } }}>
                {otp.map((digit, index) => <input key={index} ref={(element) => { otpRefs.current[index] = element; }} type="text" inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} aria-label={`Code digit ${index + 1}`} maxLength={1} value={digit} onChange={(event) => updateOtp(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace") { if (digit) setOtp((current) => current.map((value, i) => i === index ? "" : value)); if (index > 0) otpRefs.current[index - 1]?.focus(); } if (event.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus(); if (event.key === "ArrowRight" && index < 7) otpRefs.current[index + 1]?.focus(); }} disabled={isSubmitting || isResetting} className="vt-form-control h-12 min-w-0 w-full rounded-lg border border-default bg-canvas text-center text-lg font-semibold text-primary outline-none transition focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 disabled:opacity-50" />)}
              </div>
              {message && <MessageNotice message={message} messageType={messageType} hasTokenError={hasTokenError} isResetting={isResetting} onReset={handleForceResetSession} />}
              <button type="submit" disabled={isSubmitting || isResetting || otp.join("").length !== 8 || !configured} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}Verify &amp; Continue</button>
              <button type="button" onClick={resendOtp} disabled={isSubmitting || resendSeconds > 0 || !configured} className="w-full text-center text-sm font-medium text-accent-primary underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50">{resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}</button>
            </form>
          ) : step === "credentials" && <form onSubmit={submitEmail} className="space-y-4">
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
                  className="vt-form-control min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50"
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
                className="vt-form-control min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50"
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
                className="vt-form-control min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50"
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
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {mode === "sign-in" ? "Sign in with email" : "Create account"}
            </button>
          </form>}

          {step === "credentials" && <p className="text-center text-sm text-secondary">
            {mode === "sign-in" ? "New to ViciTech?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              disabled={isSubmitting || isResetting}
              className="font-semibold text-primary underline decoration-accent-primary underline-offset-4 hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:opacity-50"
            >
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </button>
          </p>}

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
