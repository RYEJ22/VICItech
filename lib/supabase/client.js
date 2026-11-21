import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseAuthConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("your-project") &&
    supabaseUrl.startsWith("http")
);

let browserClient;

export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("The Supabase browser client can only be used in the browser.");
  }
  if (!isSupabaseAuthConfigured) {
    throw new Error(
      "Supabase authentication is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  browserClient ??= createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return browserClient;
}

/**
 * Purges local Supabase auth sessions, browser storage tokens, and sb-* cookies
 * to recover from expired or corrupted JWT / PKCE verifier caches.
 */
export async function forceResetAuthSession(client = null) {
  if (typeof window === "undefined") return;

  try {
    const activeClient =
      client || (isSupabaseAuthConfigured ? getSupabaseBrowserClient() : null);
    if (activeClient?.auth) {
      await activeClient.auth.signOut({ scope: "local" }).catch(() => {});
    }
  } catch {
    // Ignore errors from corrupted clients while purging caches.
  }

  const shouldPurgeKey = (key) =>
    key.startsWith("sb-") ||
    key.startsWith("supabase.") ||
    key.startsWith("vicitech_pending_") ||
    key.startsWith("vicitech_auth_");

  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const keysToRemove = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key && shouldPurgeKey(key)) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => storage.removeItem(key));
    } catch {
      // Ignore storage access restrictions.
    }
  }

  try {
    document.cookie
      .split(";")
      .map((entry) => entry.trim().split("=")[0])
      .filter((name) => name && (name.startsWith("sb-") || name.includes("supabase")))
      .forEach((name) => {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      });
  } catch {
    // Ignore cookie clearing issues.
  }

  browserClient = undefined;
}
