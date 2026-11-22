"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChevronDown,
  Gauge,
  LoaderCircle,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  ShieldCheck,
  Swords,
  User,
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
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60";

function sourceBadgeClass(tone) {
  if (tone === "live") return "vt-badge-live";
  if (tone === "simulated") return "vt-badge-simulated";
  return "vt-badge-sample";
}

function MoreToolIcon({ iconKey }) {
  const cls = "h-4 w-4 shrink-0 text-accent-primary";
  switch (iconKey) {
    case "qc":
      return <Activity className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case "messages":
      return <MessageSquare className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case "bottleneck":
      return <Gauge className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case "versus":
      return <Swords className={cls} strokeWidth={1.75} aria-hidden="true" />;
    default:
      return <User className={cls} strokeWidth={1.75} aria-hidden="true" />;
  }
}

/**
 * @param {{
 *   onAuthState?: (payload: any) => void,
 *   onNotify?: (message: string) => void,
 *   onNavigate?: (moduleId: string) => void,
 *   onNavigateHref?: (href: string, moduleId?: string, view?: string) => void,
 *   onSignOut?: () => Promise<void>,
 *   isMenuOpen?: boolean,
 *   onToggleMenu?: () => void,
 *   onCloseMenu?: () => void,
 *   dataSources?: readonly any[],
 *   moreItems?: readonly any[],
 *   dmBadgeLabel?: string | null,
 *   variant?: "desktop" | "mobile",
 * }} props
 */
export default function AuthNavigation({
  onAuthState,
  onNotify,
  onNavigate,
  onNavigateHref,
  onSignOut,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  dataSources,
  moreItems,
  dmBadgeLabel,
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

  const navigateTarget = useCallback(
    (href, moduleId, view) => {
      closeMenu();
      if (onNavigateHref) {
        onNavigateHref(href, moduleId, view);
      } else if (moduleId && onNavigate) {
        onNavigate(moduleId);
      } else {
        router.push(href);
      }
    },
    [closeMenu, onNavigate, onNavigateHref, router]
  );

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
        className={`grid shrink-0 place-items-center rounded-full border border-default bg-surface text-secondary ${
          isMobile ? "h-11 w-11" : "h-10 w-10"
        }`}
        aria-label="Memeriksa sesi masuk"
      >
        <LoaderCircle className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  const profileUsername = profile?.username || user?.user_metadata?.username;
  const resolvedName = getUserDisplayName(user, profile);
  const initials = getUserInitials(user, profile);
  const isAdmin = user?.app_metadata?.role === "admin" || profile?.role === "admin";
  const resolvedSources = Array.isArray(dataSources) ? dataSources : [];
  const resolvedMoreItems = Array.isArray(moreItems) ? moreItems : [];
  const toolItems = user
    ? resolvedMoreItems.filter((entry) => entry.id !== "messages" && entry.id !== "account")
    : resolvedMoreItems;

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
            className={`relative inline-flex items-center justify-center rounded-full border transition-colors duration-150 ${focusRing} ${
              menuOpen
                ? "border-accent-primary bg-accent-subtle text-primary"
                : "border-default bg-surface text-primary hover:bg-subtle"
            } ${
              isMobile
                ? "h-11 w-11"
                : "h-10 max-w-[11.5rem] gap-2 pl-1.5 pr-2.5 text-xs font-medium"
            }`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-subtle font-serif text-xs font-semibold text-accent-primary">
              {initials || <UserRound className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
            </span>
            {!isMobile && (
              <>
                <span className="hidden min-w-0 truncate lg:inline">{resolvedName}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-secondary transition-transform duration-200 ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </>
            )}
            {dmBadgeLabel && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent-primary"
              />
            )}
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Menu akun dan sistem"
              className="absolute right-0 top-full z-[60] mt-2 grid max-h-[calc(100dvh-5.5rem)] w-[min(21rem,calc(100vw-1.5rem))] gap-1 overflow-y-auto rounded-xl border border-default bg-surface p-2 shadow-2xl"
            >
              <div className="border-b border-default px-3 py-2">
                <p className="truncate text-sm font-semibold text-primary">{resolvedName}</p>
                <p className="truncate text-xs text-secondary">
                  {isAdmin ? "Administrator ViciTech" : user?.email || "Anggota ViciTech"}
                </p>
              </div>

              {typeof profileUsername === "string" && profileUsername && (
                <Link
                  role="menuitem"
                  href={`/profile/${encodeURIComponent(profileUsername)}`}
                  onClick={closeMenu}
                  className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-primary transition hover:bg-subtle ${focusRing}`}
                >
                  <UserRound className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                  <span>Profil</span>
                </Link>
              )}

              <Link
                role="menuitem"
                href="/messages"
                onClick={closeMenu}
                className={`flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-primary transition hover:bg-subtle ${focusRing}`}
              >
                <span className="flex items-center gap-2.5">
                  <MessageSquare className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                  <span>Pesan Langsung</span>
                </span>
                {dmBadgeLabel && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent-cta px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-white">
                    {dmBadgeLabel}
                  </span>
                )}
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={() => navigateTarget("/home?tab=account", "account")}
                className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-primary transition hover:bg-subtle ${focusRing}`}
              >
                <User className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Dasbor Akun</span>
              </button>

              {isAdmin && (
                <Link
                  role="menuitem"
                  href="/admin"
                  onClick={closeMenu}
                  className={`flex min-h-11 items-center justify-between gap-2 rounded-lg border border-accent-primary/25 bg-accent-subtle/60 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-accent-subtle ${focusRing}`}
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                    <span>Konsol Admin</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-accent-primary">
                    OS
                  </span>
                </Link>
              )}

              {toolItems.length > 0 && (
                <div className="mt-1 border-t border-default pt-1.5">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                    Alat Lainnya
                  </p>
                  {toolItems.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      role="menuitem"
                      onClick={() => navigateTarget(entry.href, entry.module)}
                      className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-primary transition hover:bg-subtle ${focusRing}`}
                    >
                      <MoreToolIcon iconKey={entry.iconKey} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{entry.label}</span>
                        <span className="block truncate text-xs text-secondary">{entry.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {resolvedSources.length > 0 && (
                <div className="mt-1 border-t border-default pt-1.5">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                    Sumber Data
                  </p>
                  <div className="grid gap-1">
                    {resolvedSources.map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        role="menuitem"
                        onClick={() => navigateTarget(source.href, source.module, source.view)}
                        className={`flex min-h-11 w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left transition hover:bg-subtle ${focusRing}`}
                      >
                        <span className={sourceBadgeClass(source.tone)}>{source.label}</span>
                        <span className="text-xs font-medium text-primary">{source.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-1 border-t border-default pt-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                  disabled={isSigningOut}
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-secondary transition hover:bg-status-danger/10 hover:text-status-danger disabled:cursor-wait disabled:opacity-50 ${focusRing}`}
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
        <div className="flex shrink-0 items-center gap-1.5">
          {!isMobile && (resolvedSources.length > 0 || toolItems.length > 0) && (
            <div className="relative shrink-0" data-nav-menu>
              <button
                type="button"
                onClick={toggleMenu}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Alat dan Sumber Data"
                className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-150 ${focusRing} ${
                  menuOpen
                    ? "border-accent-primary bg-accent-subtle text-primary"
                    : "border-default bg-surface text-secondary hover:bg-subtle hover:text-primary"
                }`}
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  aria-label="Alat dan Sumber Data"
                  className="absolute right-0 top-full z-[60] mt-2 grid max-h-[calc(100dvh-5.5rem)] w-[min(21rem,calc(100vw-1.5rem))] gap-1 overflow-y-auto rounded-xl border border-default bg-surface p-2 shadow-2xl"
                >
                  {toolItems.length > 0 && (
                    <div>
                      <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                        Alat Lainnya
                      </p>
                      {toolItems.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          role="menuitem"
                          onClick={() => navigateTarget(entry.href, entry.module)}
                          className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-primary transition hover:bg-subtle ${focusRing}`}
                        >
                          <MoreToolIcon iconKey={entry.iconKey} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{entry.label}</span>
                            <span className="block truncate text-xs text-secondary">{entry.hint}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {resolvedSources.length > 0 && (
                    <div className="mt-1 border-t border-default pt-1.5">
                      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                        Sumber Data
                      </p>
                      <div className="grid gap-1">
                        {resolvedSources.map((source) => (
                          <button
                            key={source.id}
                            type="button"
                            role="menuitem"
                            onClick={() => navigateTarget(source.href, source.module, source.view)}
                            className={`flex min-h-11 w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left transition hover:bg-subtle ${focusRing}`}
                          >
                            <span className={sourceBadgeClass(source.tone)}>{source.label}</span>
                            <span className="text-xs font-medium text-primary">{source.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsAuthOpen(true)}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full bg-accent-cta text-xs font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-accent-cta-hover ${focusRing} ${
              isMobile ? "h-11 min-h-11 px-3.5" : "h-10 px-4"
            }`}
          >
            Masuk
          </button>
        </div>
      )}

      {isAuthOpen && !user && (
        <AuthModal open user={user} onClose={closeAuth} onNotify={onNotify} onNavigate={onNavigate} />
      )}
    </>
  );
}
