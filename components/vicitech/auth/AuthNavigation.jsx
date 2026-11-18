"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, LoaderCircle, MessageSquare, ShieldCheck, UserRound } from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

export default function AuthNavigation({ onAuthState, onNotify, onNavigate, onSignOut }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const applyAuthState = useCallback((nextSession) => {
    const resolvedSession = nextSession ?? null;
    const nextUser = resolvedSession?.user ?? null;
    setSession(resolvedSession);
    setUser(nextUser);
    setIsLoading(false);
    onAuthState?.({ user: nextUser, session: resolvedSession, isLoading: false });
    if (nextUser) setIsAuthOpen(false);
  }, [onAuthState]);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) {
      applyAuthState(null);
      return undefined;
    }

    let active = true;
    let authStateChanged = false;
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (error) {
      onNotify?.(`Could not initialize Supabase authentication: ${error.message}`);
      applyAuthState(null);
      return undefined;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (active) {
        authStateChanged = true;
        applyAuthState(event === "SIGNED_OUT" ? null : nextSession);
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        if (!authStateChanged) {
          onNotify?.(`Could not verify your sign-in: ${error.message}`);
          applyAuthState(null);
        }
      } else if (!authStateChanged) {
        const nextSession = data.session ?? null;
        applyAuthState(nextSession);
      }
    }).catch((error) => {
      if (!active) return;
      if (!authStateChanged) {
        onNotify?.(`Could not verify your sign-in: ${error.message}`);
        applyAuthState(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applyAuthState, onNotify]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("auth");
    const providerError =
      params.get("error_description") ||
      params.get("error") ||
      params.get("auth_error");

    if (authStatus === "success") {
      onNotify?.("Signed in successfully.");
    } else if (authStatus === "error" || providerError) {
      onNotify?.(`Sign-in failed: ${providerError || "Please try again."}`);
    }

    ["auth", "auth_error", "error", "error_description", "error_code", "code", "code_verifier", "token_hash", "type"]
      .forEach((key) => params.delete(key));
    const query = params.toString();
    const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    if (cleanUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", cleanUrl);
    }
  }, [onNotify]);

  const closeAuth = useCallback(() => setIsAuthOpen(false), []);

  useEffect(() => {
    if (user) setIsAuthOpen(false);
  }, [user]);

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      if (onSignOut) {
        await onSignOut();
        return;
      } else {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      onNotify?.("You have been signed out.");
    } catch (error) {
      onNotify?.(`Sign out failed: ${error.message}`);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <span className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500" aria-label="Checking sign-in">
        <LoaderCircle className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  return (
    <>
      {user ? (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto whitespace-nowrap">
          <details className="group relative hidden xl:block">
            <summary className="cursor-pointer list-none rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 transition hover:border-zinc-200 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 [&::-webkit-details-marker]:hidden">
              More
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 grid min-w-44 gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 shadow-2xl shadow-black/50">
  {typeof user?.user_metadata?.username === "string" && user.user_metadata.username && (
    <Link
      href={`/profile/${encodeURIComponent(user.user_metadata.username)}`}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 transition hover:bg-white dark:hover:bg-zinc-900 hover:text-cyan-800 dark:hover:text-cyan-200"
    >
      <UserRound className="h-4 w-4" /> Profile
    </Link>
  )}
  <Link
    href="/messages"
    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 transition hover:bg-white dark:hover:bg-zinc-900 hover:text-cyan-800 dark:hover:text-cyan-200"
  >
    <MessageSquare className="h-4 w-4" /> Messages
  </Link>
  <button
    type="button"
    onClick={() => onNavigate?.("account")}
    className="rounded-lg px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 transition hover:bg-white dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
  >
    Account
  </button>
  
  {/* HANYA MUNCUL JIKA ADMIN */}
  {user?.app_metadata?.role === "admin" && (
    <Link
      href="/qc-panel"
      className="rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 transition hover:bg-white dark:hover:bg-zinc-900 hover:text-cyan-800 dark:hover:text-cyan-200"
    >
      IoT QC Portal
    </Link>
  )}
</div>

          </details>
          {user?.app_metadata?.role === "admin" && (
            <Link
              href="/admin/iot-qc"
              aria-label="Admin QC Portal"
              title="Admin QC Portal"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-600/5 dark:bg-emerald-400/5 px-2 py-2 text-sm font-medium text-cyan-800 dark:text-cyan-200 transition hover:border-emerald-600/60 dark:hover:border-emerald-400/60 hover:bg-emerald-600/10 dark:hover:bg-emerald-400/10 lg:px-3"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden lg:inline">Admin QC Portal</span>
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            disabled={isSigningOut}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-2 py-2 text-sm text-zinc-600 dark:text-zinc-400 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-700 dark:hover:text-red-300 disabled:cursor-wait disabled:opacity-50 lg:px-3"
          >
            {isSigningOut ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto">
          <Link href="/qc-panel" className="hidden rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition-colors duration-200 hover:border-emerald-500/40 hover:text-emerald-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-emerald-300 xl:inline-flex">
            IoT QC
          </Link>
          <button
            type="button"
            onClick={() => setIsAuthOpen(true)}
            className="rounded-lg border border-emerald-600/30 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/10 transition-colors duration-200 hover:border-emerald-700 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:border-emerald-400/30 dark:bg-emerald-400 dark:text-zinc-950 dark:hover:border-emerald-300 dark:hover:bg-emerald-300"
          >
            Sign In
          </button>
        </div>
      )}
      {isAuthOpen && !user && (
        <AuthModal open user={user} onClose={closeAuth} onNotify={onNotify} />
      )}
    </>
  );
}
