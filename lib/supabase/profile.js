const PROFILE_COLUMNS =
  "id, username, full_name, display_name, avatar_url, bio, role, updated_at";

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolves the user's real display name, prioritizing the persisted `profiles`
 * table row over auth metadata and email fallback.
 */
export function getUserDisplayName(user, profile = null) {
  const resolvedProfile = profile || user?.profile || null;
  const profileName =
    cleanString(resolvedProfile?.display_name) ||
    cleanString(resolvedProfile?.full_name) ||
    cleanString(resolvedProfile?.username);
  if (profileName) return profileName;

  const metadata = user?.user_metadata || {};
  const metadataName =
    cleanString(metadata.full_name) ||
    cleanString(metadata.display_name) ||
    cleanString(metadata.name) ||
    cleanString(metadata.username) ||
    cleanString(metadata.user_name) ||
    cleanString(metadata.preferred_username);
  if (metadataName) return metadataName;

  const emailName = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (emailName) {
    return emailName.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return "ViciTech member";
}

export function getUserInitials(user, profile = null) {
  return getUserDisplayName(user, profile)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function getUserOrganization(user) {
  const metadata = user?.user_metadata || {};
  const organization = metadata.organization || metadata.company;
  return typeof organization === "string" ? organization.trim() : "";
}

/**
 * Detects expired, revoked, or malformed Supabase auth tokens so the UI can
 * cleanly prompt for or trigger a session reset.
 */
export function isExpiredOrInvalidTokenError(error) {
  if (!error) return false;
  const code = String(error.code || "").toLowerCase();
  const name = String(error.name || "").toLowerCase();
  const message = String(error.message || "").toLowerCase();
  const status = Number(error.status || 0);

  if (
    code === "refresh_token_not_found" ||
    code === "invalid_grant" ||
    code === "session_not_found" ||
    code === "bad_jwt"
  ) {
    return true;
  }

  if (
    name.includes("authinvalidjwterror") ||
    name.includes("authsessionmissingerror")
  ) {
    return true;
  }

  if (
    status === 401 ||
    /jwt expired|invalid jwt|refresh token|token is expired|session_not_found|invalid claim|bad_jwt/i.test(
      message
    )
  ) {
    return true;
  }

  return false;
}

function buildFallbackUsername(user, withIdSuffix = false) {
  const emailPrefix = String(user?.email || "").split("@")[0] || "user";
  const cleaned = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
  const idTail = String(user?.id || "")
    .replace(/-/g, "")
    .slice(0, 8);
  if (withIdSuffix) {
    return `${cleaned.slice(0, 11)}${idTail || "001"}`.slice(0, 20);
  }
  const base = cleaned.slice(0, 20);
  return base.length >= 3 ? base : `${base}${idTail}`.slice(0, 20);
}

/**
 * Loads the user's `public.profiles` row, automatically provisioning it if an
 * existing account predates the `handle_new_user` trigger.
 */
export async function fetchOrEnsureUserProfile(supabase, user) {
  if (!supabase || !user?.id) {
    return { profile: null, error: null };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { profile: null, error: fetchError };
  }
  if (existing) {
    return { profile: existing, error: null };
  }

  const metadata = user.user_metadata || {};
  const fullName =
    cleanString(metadata.full_name) || cleanString(metadata.name) || null;
  const displayName =
    cleanString(metadata.display_name) ||
    fullName ||
    cleanString(metadata.preferred_username) ||
    cleanString(user.email?.split("@")[0]) ||
    "ViciTech member";

  const candidateUsername = buildFallbackUsername(user, false);
  const insertPayload = {
    id: user.id,
    username: candidateUsername,
    full_name: fullName,
    display_name: displayName,
    avatar_url: cleanString(metadata.avatar_url) || null,
  };

  let { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert(insertPayload)
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (insertError?.code === "23505") {
    const retryPayload = {
      ...insertPayload,
      username: buildFallbackUsername(user, true),
    };
    const retryResult = await supabase
      .from("profiles")
      .insert(retryPayload)
      .select(PROFILE_COLUMNS)
      .maybeSingle();
    created = retryResult.data;
    insertError = retryResult.error;
  }

  if (insertError) {
    const { data: refetch } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();
    if (refetch) {
      return { profile: refetch, error: null };
    }
    return { profile: null, error: insertError };
  }

  return { profile: created || null, error: null };
}
