"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  LoaderCircle,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  forceResetAuthSession,
  getSupabaseBrowserClient,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/client";
import {
  fetchOrEnsureUserProfile,
  getUserDisplayName,
  isExpiredOrInvalidTokenError,
} from "@/lib/supabase/profile";
import AuthModal from "./AuthModal";

export default function AuthNavigation({ onAuthState, onNotify, onNavigate, onSignOut }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const applyAuthState = useCallback(
    (nextSession, nextProfile = null) => {
      const resolvedSession = nextSession ?? null;
      const nextUser = resolvedSession?.user ?? null;
      setUser(nextUser);
      setProfile(nextProfile);
      setIsLoading(false);
      const payload = {
        user: nextUser,
        profile: nextProfile,
        session: resolvedSession,
        isLoading: false,
      };
      onAuthState?.(payload);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("vicitech:auth-state", { detail: payload }));
      }
      if (nextUser) setIsAuthOpen(false);
    },
    [onAuthState]
  );

  useEffect(() => {
    if (!isSupabaseAuthConfigured) {
      applyAuthState(null, null);
      return undefined;
    }

    let active = true;
    let authStateChanged = false;
    let supabase;

    try {
      supabase = getSupabaseBrowserClient();
    } catch (error) {
      onNotify?.(`Could not initialize Supabase authentication: ${error.message}`);
      applyAuthState(null, null);
      return undefined;
    }

    const syncSessionAndProfile = async (nextSession) => {
      if (!active) return;
      if (!nextSession?.user) {
        applyAuthState(null, null);
        return;
      }

      const { data: userCheck, error: userCheckError } = await supabase.auth.getUser();
      if (!active) return;
      if (userCheckError && isExpiredOrInvalidTokenError(userCheckError)) {
        await forceResetAuthSession(supabase);
        if (!active) return;
        applyAuthState(null, null);
        onNotify?.("Your session expired. Please sign in again.");
        return;
      }

      const verifiedUser = userCheck?.user || nextSession.user;
      const verifiedSession = { ...nextSession, user: verifiedUser };
      const { profile: resolvedProfile, error: profileError } =
        await fetchOrEnsureUserProfile(supabase, verifiedUser);

      if (!active) return;
      if (profileError && isExpiredOrInvalidTokenError(profileError)) {
        await forceResetAuthSession(supabase);
        if (!active) return;
        applyAuthState(null, null);
        onNotify?.("Session token could not be refreshed. Please sign in again.");
        return;
      }

      applyAuthState(verifiedSession, resolvedProfile);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      authStateChanged = true;
      if (event === "SIGNED_OUT" || !nextSession) {
        applyAuthState(null, null);
        return;
      }
      void syncSessionAndProfile(nextSession);
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          if (isExpiredOrInvalidTokenError(error)) {
            void forceResetAuthSession(supabase).then(() => {
              if (!active) return;
              applyAuthState(null, null);
              onNotify?.("Session expired and local cache cleared. Please sign in again.");
            });
            return;
          }
          if (!authStateChanged) {
            onNotify?.(`Could not verify your sign-in: ${error.message}`);
            applyAuthState(null, null);
          }
        } else if (!authStateChanged) {
          void syncSessionAndProfile(data.session ?? null);
        }
      })
      .catch((error) => {
        if (!active) return;
        if (isExpiredOrInvalidTokenError(error)) {
          void forceResetAuthSession(supabase).then(() => {
            if (!active) return;
            applyAuthState(null, null);
          });
          return;
        }
        if (!authStateChanged) {
          onNotify?.(`Could not verify your sign-in: ${error.message}`);
          applyAuthState(null, null);
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
      router.refresh();
    } else if (authStatus === "error" || providerError) {
      onNotify?.(`Sign-in failed: ${providerError || "Please try again."}`);
    }

    [
      "auth",
      "auth_error",
      "error",
      "error_description",
      "error_code",
      "code",
      "code_verifier",
      "token_hash",
      "type",
    ].forEach((key) => params.delete(key));
    const query = params.toString();
    const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    if (cleanUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", cleanUrl);
    }
  }, [onNotify, router]);

  const closeAuth = useCallback(() => setIsAuthOpen(false), []);

  useEffect(() => {
    if (user) setIsAuthOpen(false);
  }, [user]);

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      if (onSignOut) {
        await onSignOut();
      } else {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      await forceResetAuthSession();
      applyAuthState(null, null);
      router.refresh();
      onNotify?.("You have been signed out.");
    } catch (error) {
      onNotify?.(`Sign out failed: ${error.message}`);
    } finally {
      setIsSigningOut(false);
    }
  };

  const resetSessionCache = async () => {
    setIsSigningOut(true);
    try {
      await forceResetAuthSession();
      applyAuthState(null, null);
      router.refresh();
      onNotify?.("Session cache cleared.");
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <span
        className="grid h-9 w-9 place-items-center rounded-full border border-default text-secondary"
        aria-label="Checking sign-in"
      >
        <LoaderCircle className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  const profileUsername = profile?.username || user?.user_metadata?.username;
  const resolvedName = getUserDisplayName(user, profile);

  return (
    <>
      {user ? (
        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <details className="group relative hidden lg:block">
            <summary className="flex h-9 min-h-9 cursor-pointer list-none items-center rounded-full border border-default bg-canvas px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-subtle [&::-webkit-details-marker]:hidden">
              {resolvedName}
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 grid min-w-52 gap-1 rounded-xl border border-default bg-surface p-2 shadow-2xl shadow-black/15">
              {typeof profileUsername === "string" && profileUsername && (
                <Link
                  href={`/profile/${encodeURIComponent(profileUsername)}`}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary transition hover:bg-subtle hover:text-accent-primary"
                >
                  <UserRound className="h-4 w-4" strokeWidth={1.75} /> Profile
                </Link>
              )}
              <Link
                href="/messages"
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary transition hover:bg-subtle hover:text-accent-primary"
              >
                <MessageSquare className="h-4 w-4" strokeWidth={1.75} /> Messages
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) onNavigate("account");
                  else router.push("/home?tab=account");
                }}
                className="flex min-h-11 items-center rounded-lg px-3 py-2 text-left text-sm text-primary transition hover:bg-subtle hover:text-accent-primary"
              >
                Account
              </button>

              {(user?.app_metadata?.role === "admin" || profile?.role === "admin") && (
                <Link
                  href="/qc-panel"
                  className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-primary transition hover:bg-subtle hover:text-accent-primary"
                >
                  IoT QC Portal
                </Link>
              )}

              <button
                type="button"
                onClick={resetSessionCache}
                disabled={isSigningOut}
                className="flex min-h-11 items-center gap-2 rounded-lg border-t border-default px-3 py-2 text-left text-xs font-medium text-secondary transition hover:bg-subtle hover:text-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} /> Force Logout / Reset Session
              </button>
            </div>
          </details>

          {(user?.app_metadata?.role === "admin" || profile?.role === "admin") && (
            <Link
              href="/admin/iot-qc"
              aria-label="Admin QC Portal"
              title="Admin QC Portal"
              className="inline-flex h-9 min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-accent-primary/30 bg-accent-subtle px-2.5 py-1.5 text-xs font-medium text-primary transition hover:border-accent-primary hover:bg-subtle"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} />
              <span className="hidden xl:inline">Admin QC Portal</span>
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            disabled={isSigningOut}
            className="flex h-9 min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-default px-2.5 py-1.5 text-xs text-secondary transition hover:border-status-danger/40 hover:bg-status-danger/10 hover:text-status-danger disabled:cursor-wait disabled:opacity-50"
          >
            {isSigningOut ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />}
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setIsAuthOpen(true)}
            className="inline-flex h-9 min-h-9 items-center justify-center whitespace-nowrap rounded-full bg-accent-primary px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors duration-200 hover:bg-accent-hover hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
          >
            Sign In
          </button>
        </div>
      )}
      {isAuthOpen && !user && (
        <AuthModal open user={user} onClose={closeAuth} onNotify={onNotify} onNavigate={onNavigate} />
      )}
    </>
  );
}
