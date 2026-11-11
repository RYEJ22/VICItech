"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, MessageSquare, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-cyan-700 dark:text-cyan-300">{value}</p>
    </div>
  );
}

function formatActivityDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)
    : "";
}

export default function PublicProfilePage({ username, user, isAuthLoading }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ presets: 0, builds: 0 });
  const [savedPresets, setSavedPresets] = useState([]);
  const [activity, setActivity] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (isAuthLoading) {
      setStatus("loading");
      return () => { active = false; };
    }
    if (!user?.id) {
      setStatus("signed-out");
      return () => { active = false; };
    }

    const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
    if (!/^[a-z0-9]{3,20}$/.test(normalizedUsername)) {
      setStatus("not-found");
      return () => { active = false; };
    }

    const loadProfile = async () => {
      setStatus("loading");
      setError("");
      try {
        const client = getSupabaseBrowserClient();
        const { data: result, error: profileError } = await client
          .from("profiles")
          .select("id, username, display_name, full_name, avatar_url, bio, updated_at")
          .eq("username", normalizedUsername)
          .maybeSingle();
        if (profileError) throw new Error(`Could not load this profile: ${profileError.message}`);
        if (!result) {
          if (active) setStatus("not-found");
          return;
        }

        const [statsResponse, activityResponse, presetResponse] = await Promise.all([
          client.rpc("get_public_profile_stats", { profile_user_id: result.id }),
          client
            .from("shared_builds")
            .select("id, title, created_at")
            .eq("user_id", result.id)
            .order("created_at", { ascending: false })
            .limit(10),
          result.id === user.id
            ? client
              .from("user_presets")
              .select("id, name, role, parts, qty, unit_total, created_at")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(50)
            : Promise.resolve({ data: [], error: null }),
        ]);
        const { data: statsResult, error: statsError } = statsResponse;
        if (statsError) throw new Error(`Could not load public profile statistics: ${statsError.message}`);
        if (activityResponse.error) throw new Error(`Could not load public activity: ${activityResponse.error.message}`);
        if (presetResponse.error) throw new Error(`Could not load saved presets: ${presetResponse.error.message}`);
        const publicStats = Array.isArray(statsResult) ? statsResult[0] : null;
        if (!active) return;
        setProfile(result);
        setActivity(Array.isArray(activityResponse.data) ? activityResponse.data : []);
        setSavedPresets(Array.isArray(presetResponse.data) ? presetResponse.data : []);
        setStats({
          presets: Number(publicStats?.saved_presets || 0),
          builds: Number(publicStats?.shared_builds || 0),
        });
        setStatus("ready");
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Could not load this profile.");
          setStatus("error");
        }
      }
    };

    void loadProfile();
    return () => { active = false; };
  }, [username, user?.id, isAuthLoading]);

  const isOwner = Boolean(profile?.id && user?.id === profile.id);
  const name = profile?.full_name || profile?.display_name || `@${profile?.username || "member"}`;

  return (
    <main className="mx-auto min-h-[65vh] w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-600/40 dark:hover:border-emerald-400/40 hover:text-cyan-800 dark:hover:text-cyan-200">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      {status === "loading" && (
        <section aria-label="Loading profile" className="mt-6 animate-pulse rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-6 sm:p-8">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800" />
            <div className="space-y-3"><div className="h-5 w-48 rounded bg-zinc-100 dark:bg-zinc-800" /><div className="h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-800" /></div>
          </div>
          <div className="mt-6 h-16 rounded bg-zinc-100/70 dark:bg-zinc-800/70" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="h-24 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/70" /><div className="h-24 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/70" /></div>
        </section>
      )}

      {status === "signed-out" && (
        <section className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-cyan-700 dark:text-cyan-300" />
          <h1 className="mt-4 text-2xl font-semibold">Sign in to view profiles</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Public member profiles are available to authenticated ViciTech users.</p>
        </section>
      )}

      {status === "not-found" && (
        <section className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-10 text-center">
          <UserRound className="mx-auto h-12 w-12 text-zinc-600" />
          <h1 className="mt-4 text-2xl font-semibold">User Not Found</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">This ViciTech profile does not exist or is no longer available.</p>
        </section>
      )}

      {status === "error" && (
        <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-200">{error}</p>
      )}

      {status === "ready" && profile && (
        <>
          <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
            <div className="h-28 bg-gradient-to-r from-cyan-500/20 via-slate-800 to-zinc-950 sm:h-36" />
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pb-7">
              <div className="-mt-14 flex min-w-0 items-end gap-4 sm:-mt-16">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-24 w-24 shrink-0 rounded-full border-4 border-zinc-200 dark:border-zinc-950 bg-white dark:bg-zinc-900 object-cover sm:h-28 sm:w-28" />
                ) : (
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-zinc-200 dark:border-zinc-950 bg-emerald-600/15 dark:bg-emerald-400/15 text-3xl font-semibold text-cyan-800 dark:text-cyan-200 sm:h-28 sm:w-28">
                    {(name.trim().charAt(0) || "V").toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 pb-1">
                  <h1 className="truncate text-2xl font-semibold text-zinc-900 dark:text-zinc-50 sm:text-3xl">{name}</h1>
                  <p className="mt-1 truncate font-mono text-sm text-cyan-700 dark:text-cyan-300">@{profile.username}</p>
                </div>
              </div>
              {isOwner ? (
                <Link href="/#account" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:border-emerald-600/50 dark:hover:border-emerald-400/50 hover:text-cyan-800 dark:hover:text-cyan-200">
                  Edit profile
                </Link>
              ) : (
                <Link href={`/messages?to=${encodeURIComponent(profile.username)}`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 dark:bg-emerald-400 px-5 py-3 text-sm font-semibold text-white dark:text-zinc-950 transition hover:bg-emerald-500 dark:hover:bg-emerald-300">
                  <MessageSquare className="h-4 w-4" /> Send Message
                </Link>
              )}
            </div>
          </section>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-5 sm:p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-400">About</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {profile.bio?.trim() || "This member has not added a bio yet."}
                </p>
              </section>
              <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-5 sm:p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-400">Recent public activity</h2>
                {activity.length ? (
                  <ul className="mt-4 divide-y divide-zinc-800">
                    {activity.map((item) => item?.id && (
                      <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <span className="min-w-0 truncate text-sm text-zinc-800 dark:text-zinc-200">{item.title || "Shared a build"}</span>
                        <time className="shrink-0 text-xs text-zinc-500" dateTime={item.created_at}>{formatActivityDate(item.created_at)}</time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">No public activity yet.</p>
                )}
              </section>
            </div>
            <div className="space-y-3">
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Stat label="Saved Presets" value={stats.presets} />
                <Stat label="Shared Builds" value={stats.builds} />
              </section>
              {isOwner && (
                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-5 sm:p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-400">Your saved presets</h2>
                  {savedPresets.length ? (
                    <ul className="mt-3 space-y-2">
                      {savedPresets.map((preset) => preset?.id && (
                        <li key={preset.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 p-3">
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{preset.name || "Untitled preset"}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {(preset.role || "b2c").toUpperCase()} · {Array.isArray(preset.parts) ? preset.parts.length : 0} parts · {preset.qty || 1} unit(s)
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500">You have not saved any presets yet.</p>
                  )}
                  <p className="mt-3 text-xs text-zinc-600">Preset details are private and only visible to you.</p>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
