import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';
import { fetchOrEnsureUserProfile } from '@/lib/supabase/profile';
import {
  normalizeProfileRecord,
  validateProfileDraft,
} from './profile-types';
import type {
  ProfileAuthFallback,
  ProfileCommunityPost,
  ProfileFormDraft,
  ProfileOrderRecord,
  ProfileQcReportRecord,
  ProfileSavedPreset,
  ProfileSharedBuild,
  ProfileWorkspaceData,
  UnifiedProfile,
} from './profile-types';

const EXTENDED_PROFILE_COLUMNS =
  'id, username, display_name, full_name, avatar_url, banner_url, bio, status_text, accent_color, featured_rig, role, created_at, updated_at';

const BASE_PROFILE_COLUMNS =
  'id, username, display_name, full_name, avatar_url, bio, role, updated_at';

function isMissingColumnError(error: { readonly code?: string; readonly message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42703' || /column .* does not exist/i.test(error.message ?? '');
}

function toRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const map: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    map[k] = v;
  }
  return map;
}

function strVal(rec: Readonly<Record<string, unknown>>, key: string, fallback = ''): string {
  const val = rec[key];
  return typeof val === 'string' ? val : fallback;
}

function numVal(rec: Readonly<Record<string, unknown>>, key: string, fallback = 0): number {
  const val = Number(rec[key]);
  return Number.isFinite(val) ? val : fallback;
}

export async function fetchOwnProfile(
  authUser: { readonly id: string; readonly email?: string | undefined; readonly created_at?: string | undefined; readonly user_metadata?: unknown },
): Promise<{ readonly profile: UnifiedProfile | null; readonly error: string | null }> {
  if (!isSupabaseAuthConfigured) {
    return {
      profile: normalizeProfileRecord({}, {
        id: authUser.id,
        email: authUser.email,
        createdAt: authUser.created_at,
        metadata: authUser.user_metadata,
      }),
      error: null,
    };
  }

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('profiles')
      .select(EXTENDED_PROFILE_COLUMNS)
      .eq('id', authUser.id)
      .maybeSingle();

    if (error && isMissingColumnError(error)) {
      const ensured = await fetchOrEnsureUserProfile(supabase, authUser);
      if (ensured.error) {
        return { profile: null, error: `Gagal memuat profil: ${ensured.error.message}` };
      }
      return {
        profile: normalizeProfileRecord(ensured.profile ?? {}, {
          id: authUser.id,
          email: authUser.email,
          createdAt: authUser.created_at,
          metadata: authUser.user_metadata,
        }),
        error: null,
      };
    }

    if (error) {
      return { profile: null, error: `Gagal memuat profil: ${error.message}` };
    }

    if (!data) {
      const ensured = await fetchOrEnsureUserProfile(supabase, authUser);
      if (ensured.error) {
        return { profile: null, error: `Gagal membuat profil awal: ${ensured.error.message}` };
      }
      return {
        profile: normalizeProfileRecord(ensured.profile ?? {}, {
          id: authUser.id,
          email: authUser.email,
          createdAt: authUser.created_at,
          metadata: authUser.user_metadata,
        }),
        error: null,
      };
    }

    return {
      profile: normalizeProfileRecord(data, {
        id: authUser.id,
        email: authUser.email,
        createdAt: authUser.created_at,
        metadata: authUser.user_metadata,
      }),
      error: null,
    };
  } catch (err: unknown) {
    return {
      profile: null,
      error: err instanceof Error ? err.message : 'Gagal memuat data profil Anda.',
    };
  }
}

export async function fetchPublicProfileByUsername(
  username: string,
  authFallback?: ProfileAuthFallback,
): Promise<{ readonly profile: UnifiedProfile | null; readonly error: string | null }> {
  const cleaned = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) {
    return { profile: null, error: null };
  }

  if (!isSupabaseAuthConfigured) {
    return { profile: null, error: 'Konfigurasi Supabase belum tersedia.' };
  }

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('profiles')
      .select(EXTENDED_PROFILE_COLUMNS)
      .eq('username', cleaned)
      .maybeSingle();

    if (error && isMissingColumnError(error)) {
      const legacyRes = await supabase
        .from('profiles')
        .select(BASE_PROFILE_COLUMNS)
        .eq('username', cleaned)
        .maybeSingle();

      if (legacyRes.error) {
        return { profile: null, error: `Gagal memuat profil anggota: ${legacyRes.error.message}` };
      }
      if (!legacyRes.data) {
        return { profile: null, error: null };
      }
      return {
        profile: normalizeProfileRecord(legacyRes.data, authFallback),
        error: null,
      };
    }

    if (error) {
      return { profile: null, error: `Gagal memuat profil anggota: ${error.message}` };
    }
    if (!data) {
      return { profile: null, error: null };
    }

    return {
      profile: normalizeProfileRecord(data, authFallback),
      error: null,
    };
  } catch (err: unknown) {
    return {
      profile: null,
      error: err instanceof Error ? err.message : 'Gagal memuat profil anggota.',
    };
  }
}

export async function fetchProfileWorkspaceData(
  profileUserId: string,
  isOwner: boolean,
): Promise<ProfileWorkspaceData> {
  if (!isSupabaseAuthConfigured || !profileUserId) {
    return {
      posts: [],
      sharedBuilds: [],
      presets: [],
      orders: [],
      qcReports: [],
      stats: { communityPosts: 0, savedPresets: 0, sharedBuilds: 0 },
    };
  }

  const supabase = getSupabaseBrowserClient();

  const [postsRes, buildsRes, statsRes, presetsRes, ordersRes, qcRes] = await Promise.all([
    supabase
      .from('community_posts')
      .select('id, title, category, likes_count, media_urls, created_at')
      .eq('user_id', profileUserId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('shared_builds')
      .select('id, title, created_at')
      .eq('user_id', profileUserId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.rpc('get_public_profile_stats', { profile_user_id: profileUserId }),
    isOwner
      ? supabase
          .from('user_presets')
          .select('id, user_id, name, role, parts, qty, unit_total, created_at')
          .eq('user_id', profileUserId)
          .order('created_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [], error: null }),
    isOwner
      ? supabase
          .from('orders')
          .select('id, order_number, product_name, status, total_price, base_price, jit_buffer, serial_number, created_at')
          .eq('user_id', profileUserId)
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [], error: null }),
    isOwner
      ? supabase
          .from('qc_test_reports')
          .select('id, overall_status, environment, created_at')
          .eq('user_id', profileUserId)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const rawPosts: readonly unknown[] = Array.isArray(postsRes.data) ? postsRes.data : [];
  const posts: ProfileCommunityPost[] = [];
  for (const row of rawPosts) {
    const rec = toRecord(row);
    const id = strVal(rec, 'id');
    if (!id) continue;
    const mediaRaw = rec.media_urls;
    const mediaUrls = Array.isArray(mediaRaw)
      ? mediaRaw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
    posts.push({
      id,
      title: strVal(rec, 'title', 'Diskusi Komunitas'),
      category: strVal(rec, 'category', 'general'),
      likesCount: Math.max(0, numVal(rec, 'likes_count', 0)),
      mediaUrls,
      createdAt: strVal(rec, 'created_at'),
    });
  }

  const rawBuilds: readonly unknown[] = Array.isArray(buildsRes.data) ? buildsRes.data : [];
  const sharedBuilds: ProfileSharedBuild[] = [];
  for (const row of rawBuilds) {
    const rec = toRecord(row);
    const id = strVal(rec, 'id');
    if (!id) continue;
    sharedBuilds.push({
      id,
      title: strVal(rec, 'title', 'Rakitan Dibagikan'),
      createdAt: strVal(rec, 'created_at'),
    });
  }

  const rawPresets: readonly unknown[] = Array.isArray(presetsRes.data) ? presetsRes.data : [];
  const presets: ProfileSavedPreset[] = [];
  for (const row of rawPresets) {
    const rec = toRecord(row);
    const id = strVal(rec, 'id');
    if (!id) continue;
    const parts = Array.isArray(rec.parts) ? rec.parts.length : 0;
    presets.push({
      id,
      name: strVal(rec, 'name', 'Preset Kustom'),
      role: strVal(rec, 'role', 'b2c'),
      qty: Math.max(1, numVal(rec, 'qty', 1)),
      unitTotal: Math.max(0, numVal(rec, 'unit_total', 0)),
      partsCount: parts,
      createdAt: strVal(rec, 'created_at'),
    });
  }

  const rawOrders: readonly unknown[] = Array.isArray(ordersRes.data) ? ordersRes.data : [];
  const orders: ProfileOrderRecord[] = [];
  for (const row of rawOrders) {
    const rec = toRecord(row);
    const id = strVal(rec, 'id');
    if (!id) continue;
    const basePlusJit = numVal(rec, 'base_price', 0) + numVal(rec, 'jit_buffer', 0);
    orders.push({
      id,
      orderNumber: strVal(rec, 'order_number') || null,
      productName: strVal(rec, 'product_name', 'Pesanan ViciTech'),
      status: strVal(rec, 'status', 'Diproses'),
      totalPrice: Math.max(0, numVal(rec, 'total_price', basePlusJit)),
      serialNumber: strVal(rec, 'serial_number') || null,
      createdAt: strVal(rec, 'created_at'),
    });
  }

  const rawQc: readonly unknown[] = Array.isArray(qcRes.data) ? qcRes.data : [];
  const qcReports: ProfileQcReportRecord[] = [];
  for (const row of rawQc) {
    const rec = toRecord(row);
    const id = strVal(rec, 'id');
    if (!id) continue;
    qcReports.push({
      id,
      overallStatus: strVal(rec, 'overall_status', 'pass'),
      environment: strVal(rec, 'environment', 'simulated'),
      createdAt: strVal(rec, 'created_at'),
    });
  }

  const rpcFirst = Array.isArray(statsRes.data) ? toRecord(statsRes.data[0]) : {};
  const rpcSavedPresets = numVal(rpcFirst, 'saved_presets', 0);
  const rpcSharedBuilds = numVal(rpcFirst, 'shared_builds', 0);

  return {
    posts,
    sharedBuilds,
    presets,
    orders,
    qcReports,
    stats: {
      communityPosts: posts.length,
      savedPresets: isOwner ? presets.length : rpcSavedPresets,
      sharedBuilds: Math.max(sharedBuilds.length, rpcSharedBuilds),
    },
  };
}

export type SaveProfileResult =
  | {
      readonly ok: true;
      readonly profile: UnifiedProfile;
      readonly usedMetadataFallback: boolean;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export async function saveProfileCustomization(
  userId: string,
  draft: ProfileFormDraft,
  authFallback?: ProfileAuthFallback,
): Promise<SaveProfileResult> {
  if (!userId.trim()) {
    return { ok: false, error: 'Anda harus masuk untuk menyimpan perubahan profil.' };
  }

  const validation = validateProfileDraft(draft);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const clean = validation.normalized;
  if (!isSupabaseAuthConfigured) {
    return { ok: false, error: 'Konfigurasi Supabase belum aktif.' };
  }

  const supabase = getSupabaseBrowserClient();
  const nowIso = new Date().toISOString();
  let usedMetadataFallback = false;

  const fullPayload = {
    id: userId,
    username: clean.username,
    display_name: clean.displayName,
    full_name: clean.displayName,
    avatar_url: clean.avatarUrl || null,
    banner_url: clean.bannerUrl || null,
    bio: clean.bio || null,
    status_text: clean.statusText || null,
    accent_color: clean.accentColor,
    featured_rig: clean.featuredRig || null,
    updated_at: nowIso,
  };

  let savedRow: unknown = null;
  const extendedUpsert = await supabase
    .from('profiles')
    .upsert(fullPayload, { onConflict: 'id' })
    .select(EXTENDED_PROFILE_COLUMNS)
    .maybeSingle();

  if (extendedUpsert.error && isMissingColumnError(extendedUpsert.error)) {
    usedMetadataFallback = true;
    const baseUpsert = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          username: clean.username,
          display_name: clean.displayName,
          full_name: clean.displayName,
          avatar_url: clean.avatarUrl || null,
          bio: clean.bio || null,
          updated_at: nowIso,
        },
        { onConflict: 'id' },
      )
      .select(BASE_PROFILE_COLUMNS)
      .maybeSingle();

    if (baseUpsert.error) {
      if (baseUpsert.error.code === '23505') {
        return { ok: false, error: 'Username tersebut sudah dipakai pengguna lain. Pilih username lain.' };
      }
      return { ok: false, error: `Gagal menyimpan profil: ${baseUpsert.error.message}` };
    }
    savedRow = baseUpsert.data;
  } else if (extendedUpsert.error) {
    if (extendedUpsert.error.code === '23505') {
      return { ok: false, error: 'Username tersebut sudah dipakai pengguna lain. Pilih username lain.' };
    }
    return { ok: false, error: `Gagal menyimpan profil: ${extendedUpsert.error.message}` };
  } else {
    savedRow = extendedUpsert.data;
  }

  const authMetaPayload = {
    username: clean.username,
    full_name: clean.displayName,
    avatar_url: clean.avatarUrl || null,
    banner_url: clean.bannerUrl || null,
    bio: clean.bio || null,
    status_text: clean.statusText || null,
    accent_color: clean.accentColor,
    featured_rig: clean.featuredRig || null,
  };

  const { error: authError } = await supabase.auth.updateUser({
    data: authMetaPayload,
  });
  if (authError) {
    return { ok: false, error: `Profil tersimpan, namun sinkronisasi sesi gagal: ${authError.message}` };
  }

  const normalized = normalizeProfileRecord(savedRow ?? fullPayload, {
    ...authFallback,
    id: userId,
    metadata: authMetaPayload,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vicitech:profile-updated', { detail: normalized }));
  }

  return {
    ok: true,
    profile: normalized,
    usedMetadataFallback,
  };
}
