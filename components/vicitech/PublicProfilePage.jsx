"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, MessageSquare, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(20,21,24,0.035)]">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777C83]">{label}</p>
      <p className="mt-2 font-serif text-3xl font-semibold tabular-nums text-[#C94300]">{value}</p>
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
      <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 px-4 py-2 text-sm font-medium text-[#5A606A] transition hover:border-[#FF5500]/30 hover:text-[#A83A00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      {status === "loading" && (
        <section aria-label="Loading profile" className="mt-6 animate-pulse rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_12px_36px_rgba(20,21,24,0.04)] sm:p-8">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-full bg-[#F0EFEC]" />
            <div className="space-y-3"><div className="h-5 w-48 rounded-lg bg-[#F0EFEC]" /><div className="h-4 w-32 rounded-lg bg-[#F0EFEC]" /></div>
          </div>
          <div className="mt-6 h-16 rounded-2xl bg-[#F6F5F2]" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="h-24 rounded-2xl bg-[#F6F5F2]" /><div className="h-24 rounded-2xl bg-[#F6F5F2]" /></div>
        </section>
      )}

      {status === "signed-out" && (
        <section className="mt-6 rounded-3xl border border-black/[0.06] bg-white p-8 text-center shadow-[0_12px_36px_rgba(20,21,24,0.04)]">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#FF5500]" />
          <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-[#141518]">Sign in to view profiles</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#5A606A]">Public member profiles are available to authenticated ViciTech users.</p>
        </section>
      )}

      {status === "not-found" && (
        <section className="mt-6 rounded-3xl border border-black/[0.06] bg-white p-10 text-center shadow-[0_12px_36px_rgba(20,21,24,0.04)]">
          <UserRound className="mx-auto h-12 w-12 text-[#A3A6AA]" />
          <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-[#141518]">User not found</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#5A606A]">This ViciTech profile does not exist or is no longer available.</p>
        </section>
      )}

      {status === "error" && (
        <p role="alert" className="mt-6 rounded-2xl border border-red-600/20 bg-red-50 p-4 text-sm text-red-800">{error}</p>
      )}

      {status === "ready" && profile && (
        <>
          <section className="mt-6 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_14px_40px_rgba(20,21,24,0.05)]">
            <div className="relative h-28 overflow-hidden bg-[linear-gradient(115deg,#FFE5D8_0%,#FFF3EA_45%,#F0EFEC_100%)] sm:h-36">
              <div className="absolute -right-8 -top-20 h-56 w-56 rounded-full border border-[#FF5500]/10" aria-hidden="true" />
              <div className="absolute -right-2 -top-14 h-44 w-44 rounded-full border border-[#FF5500]/10" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pb-7">
              <div className="-mt-14 flex min-w-0 items-end gap-4 sm:-mt-16">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-24 w-24 shrink-0 rounded-full border-4 border-white bg-white object-cover shadow-sm sm:h-28 sm:w-28" />
                ) : (
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-white bg-[#FF5500]/[0.08] text-3xl font-semibold text-[#A83A00] shadow-sm sm:h-28 sm:w-28">
                    {(name.trim().charAt(0) || "V").toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 pb-1">
                  <h1 className="truncate font-serif text-2xl font-semibold tracking-tight text-[#141518] sm:text-3xl">{name}</h1>
                  <p className="mt-1 truncate text-sm font-medium text-[#A83A00]">@{profile.username}</p>
                </div>
              </div>
              {isOwner ? (
                <Link href="/#account" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-medium text-[#30343A] transition-colors hover:border-[#FF5500]/30 hover:text-[#A83A00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60">
                  Edit profile
                </Link>
              ) : (
                <Link href={`/messages?to=${encodeURIComponent(profile.username)}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#FF5500] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#E94B00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                  <MessageSquare className="h-4 w-4" /> Send Message
                </Link>
              )}
            </div>
          </section>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
            <div className="space-y-5">
              <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(20,21,24,0.035)] sm:p-6">
                <h2 className="font-serif text-xl font-semibold text-[#141518]">About</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#5A606A]">
                  {profile.bio?.trim() || "This member has not added a bio yet."}
                </p>
              </section>
              <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(20,21,24,0.035)] sm:p-6">
                <h2 className="font-serif text-xl font-semibold text-[#141518]">Recent public activity</h2>
                {activity.length ? (
                  <ul className="mt-4 divide-y divide-black/[0.06]">
                    {activity.map((item) => item?.id && (
                      <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <span className="min-w-0 truncate text-sm text-[#30343A]">{item.title || "Shared a build"}</span>
                        <time className="shrink-0 text-xs text-[#777C83]" dateTime={item.created_at}>{formatActivityDate(item.created_at)}</time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-[#777C83]">No public activity yet.</p>
                )}
              </section>
            </div>
            <div className="space-y-3">
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Stat label="Saved Presets" value={stats.presets} />
                <Stat label="Shared Builds" value={stats.builds} />
              </section>
              {isOwner && (
                <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(20,21,24,0.035)] sm:p-6">
                  <h2 className="font-serif text-xl font-semibold text-[#141518]">Your saved presets</h2>
                  {savedPresets.length ? (
                    <ul className="mt-3 space-y-2">
                      {savedPresets.map((preset) => preset?.id && (
                        <li key={preset.id} className="rounded-2xl border border-black/[0.06] bg-[#F6F5F2]/70 p-3.5">
                          <p className="truncate text-sm font-medium text-[#30343A]">{preset.name || "Untitled preset"}</p>
                          <p className="mt-1 text-xs text-[#777C83]">
                            {(preset.role || "b2c").toUpperCase()} · {Array.isArray(preset.parts) ? preset.parts.length : 0} parts · {preset.qty || 1} unit(s)
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-[#777C83]">You have not saved any presets yet.</p>
                  )}
                  <p className="mt-3 text-xs leading-relaxed text-[#777C83]">Preset details are private and only visible to you.</p>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
