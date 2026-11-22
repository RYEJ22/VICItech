"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LoaderCircle,
  LogOut,
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
  getUserInitials,
  isExpiredOrInvalidTokenError,
} from "@/lib/supabase/profile";
import AuthModal from "./AuthModal";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60";

/**
 * @param {{
 *   onAuthState?: (payload: any) => void,
 *   onNotify?: (message: string) => void,
 *   onNavigate?: (moduleId: string) => void,
 *   onSignOut?: () => Promise<void>,
 *   isMenuOpen?: boolean,
 *   onToggleMenu?: () => void,
 *   onCloseMenu?: () => void,
 *   variant?: "desktop" | "mobile",
 * }} props
 */
export default function AuthNavigation({
  onAuthState,
  onNotify,
  onNavigate,
  onSignOut,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  variant = "desktop",
}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [localMenuOpen, setLocalMenuOpen] = useState(false);

  const isControlled = typeof onToggleMenu === "function";
  const menuOpen = isControlled ? Boolean(isMenuOpen) : localMenuOpen;

  const toggleMenu = useCallback(() => {
    if (onToggleMenu) onToggleMenu();
    else setLocalMenuOpen((prev) => !prev);
  }, [onToggleMenu]);

  const closeMenu = useCallback(() => {
    if (onCloseMenu) onCloseMenu();
    else setLocalMenuOpen(false);
  }, [onCloseMenu]);

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
      onNotify?.(`Gagal menginisialisasi autentikasi Supabase: ${error.message}`);
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
        onNotify?.("Sesi Anda telah berakhir. Silakan masuk kembali.");
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
        onNotify?.("Token sesi tidak dapat diperbarui. Silakan masuk kembali.");
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
              onNotify?.("Sesi berakhir dan cache lokal dibersihkan. Silakan masuk kembali.");
            });
            return;
          }
          if (!authStateChanged) {
            onNotify?.(`Tidak dapat memverifikasi sesi masuk Anda: ${error.message}`);
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
          onNotify?.(`Tidak dapat memverifikasi sesi masuk Anda: ${error.message}`);
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
      onNotify?.("Berhasil masuk ke akun Anda.");
      router.refresh();
    } else if (authStatus === "error" || providerError) {
      onNotify?.(`Gagal masuk: ${providerError || "Silakan coba lagi."}`);
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

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      const updated = event instanceof CustomEvent ? event.detail : null;
      if (!updated || typeof updated !== "object") return;
      setProfile((current) => ({
        ...(current || {}),
        username: updated.username ?? current?.username,
        display_name: updated.displayName ?? current?.display_name,
        full_name: updated.displayName ?? current?.full_name,
        avatar_url: updated.avatarUrl !== undefined ? updated.avatarUrl : current?.avatar_url,
        bio: updated.bio !== undefined ? updated.bio : current?.bio,
      }));
    };
    window.addEventListener("vicitech:profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("vicitech:profile-updated", handleProfileUpdated);
  }, []);

  const signOut = async () => {
    setIsSigningOut(true);
    closeMenu();
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
      onNotify?.("Anda telah keluar dari akun.");
    } catch (error) {
      onNotify?.(`Gagal keluar: ${error.message}`);
    } finally {
      setIsSigningOut(false);
    }
  };

  const isMobile = variant === "mobile";

  if (isLoading) {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-full border border-[#E4E4E7] bg-[#FFFFFF] text-[#71717A] ${
          isMobile ? "h-10 w-10" : "h-10 w-10"
        }`}
        aria-label="Memeriksa sesi masuk"
      >
        <LoaderCircle className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  const resolvedName = getUserDisplayName(user, profile);
  const initials = getUserInitials(user, profile);
  const isAdmin = user?.app_metadata?.role === "admin" || profile?.role === "admin";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <>
      {user ? (
        <div className="relative shrink-0" data-nav-menu>
          <button
            type="button"
            onClick={toggleMenu}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Menu akun ${resolvedName}`}
            title={resolvedName}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border bg-[#FFFFFF] p-0.5 transition-colors duration-150 ${focusRing} ${
              menuOpen
                ? "border-[#EA580C] ring-2 ring-[#EA580C]/20"
                : "border-[#E4E4E7] hover:border-[#EA580C]/60"
            }`}
          >
            <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#F3F1ED] font-serif text-xs font-semibold text-[#EA580C]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  width={36}
                  height={36}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials || <UserRound className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              )}
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Menu akun"
              className="absolute right-0 top-full z-[60] mt-2 grid w-64 max-w-[calc(100vw-1.5rem)] gap-1 rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] p-2 shadow-[0_12px_32px_-8px_rgba(24,24,27,0.08),0_2px_6px_-2px_rgba(24,24,27,0.04)]"
            >
              <div className="border-b border-[#E4E4E7] px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-[#18181B]">{resolvedName}</p>
                <p className="truncate text-xs text-[#71717A]">
                  {isAdmin ? "Administrator ViciTech" : user?.email || "Anggota ViciTech"}
                </p>
              </div>

              <Link
                role="menuitem"
                href="/profile"
                onClick={closeMenu}
                className={`group flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-[#18181B] transition-colors hover:bg-[#F3F1ED] hover:text-[#EA580C] ${focusRing}`}
              >
                <UserRound
                  className="h-4 w-4 shrink-0 text-[#71717A] transition-colors group-hover:text-[#EA580C]"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>Profil &amp; Akun</span>
              </Link>

              {isAdmin && (
                <Link
                  role="menuitem"
                  href="/admin"
                  onClick={closeMenu}
                  className={`group flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#18181B] transition-colors hover:bg-[#F3F1ED] hover:text-[#EA580C] ${focusRing}`}
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck
                      className="h-4 w-4 shrink-0 text-[#EA580C]"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span>Konsol Admin</span>
                  </span>
                  <span className="rounded-md bg-[#F3F1ED] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[#EA580C]">
                    Admin
                  </span>
                </Link>
              )}

              <div className="mt-1 border-t border-[#E4E4E7] pt-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                  disabled={isSigningOut}
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-[#71717A] transition-colors hover:bg-status-danger/10 hover:text-status-danger disabled:cursor-wait disabled:opacity-50 ${focusRing}`}
                >
                  {isSigningOut ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  )}
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAuthOpen(true)}
          className={`inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-accent-cta text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-cta-hover ${focusRing} ${
            isMobile ? "px-3.5" : "px-4"
          }`}
        >
          Masuk
        </button>
      )}

      {isAuthOpen && !user && (
        <AuthModal open user={user} onClose={closeAuth} onNotify={onNotify} onNavigate={onNavigate} />
      )}
    </>
  );
}
