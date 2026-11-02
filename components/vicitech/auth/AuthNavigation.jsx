"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut, LoaderCircle, UserRound } from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

export default function AuthNavigation({ onNotify, onSignOut }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) {
      setIsLoading(false);
      return undefined;
    }

    let active = true;
    let authStateChanged = false;
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (error) {
      onNotify?.(`Could not initialize Supabase authentication: ${error.message}`);
      setIsLoading(false);
      return undefined;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        authStateChanged = true;
        setUser(session?.user ?? null);
      }
    });

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        if (!authStateChanged) {
          onNotify?.(`Could not verify your sign-in: ${error.message}`);
          setUser(null);
        }
      } else if (!authStateChanged) {
        setUser(data.user ?? null);
      }
      setIsLoading(false);
    }).catch((error) => {
      if (!active) return;
      if (!authStateChanged) {
        onNotify?.(`Could not verify your sign-in: ${error.message}`);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [onNotify]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("auth");
    if (authStatus !== "success" && authStatus !== "error") return;

    if (authStatus === "success") {
      onNotify?.("Signed in successfully.");
    } else {
      onNotify?.(`Sign-in failed: ${params.get("auth_error") || "Please try again."}`);
    }

    params.delete("auth");
    params.delete("auth_error");
    const query = params.toString();
    const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", cleanUrl);
  }, [onNotify]);

  const closeAuth = useCallback(() => setIsAuthOpen(false), []);

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
      <span className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-800 text-zinc-500" aria-label="Checking sign-in">
        <LoaderCircle className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  return (
    <>
      {user ? (
        <div className="flex items-center gap-2">
          <span
            title={user.email || "Signed-in user"}
            className="hidden max-w-36 truncate text-xs text-zinc-300 xl:block"
          >
            {user.email || "Signed in"}
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300" aria-hidden="true">
            <UserRound className="h-4 w-4" />
          </span>
          <button
            type="button"
            onClick={signOut}
            disabled={isSigningOut}
            aria-label="Log out"
            title="Log out"
            className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-50"
          >
            {isSigningOut ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAuthOpen(true)}
          className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/70 hover:bg-cyan-400/15"
        >
          Sign In
        </button>
      )}
      <AuthModal open={isAuthOpen} onClose={closeAuth} onNotify={onNotify} />
    </>
  );
}
