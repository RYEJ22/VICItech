"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminSignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  const signOut = async () => {
    setIsSigningOut(true);
    setError("");
    try {
      const { error: signOutError } = await getSupabaseBrowserClient().auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/admin/login");
      router.refresh();
    } catch (signOutError) {
      setError(signOutError.message || "Could not sign out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {error && <span role="alert" className="max-w-48 text-xs text-red-700 dark:text-red-300">{error}</span>}
      <button
        type="button"
        onClick={signOut}
        disabled={isSigningOut}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:border-red-400/40 hover:text-red-700 dark:hover:text-red-300 disabled:cursor-wait disabled:opacity-50"
      >
        {isSigningOut ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign out
      </button>
    </div>
  );
}
