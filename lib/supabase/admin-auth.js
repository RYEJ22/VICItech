export async function verifyAdminRole(supabase, user) {
  if (!user || user.app_metadata?.role !== "admin") {
    return { isAdmin: false, error: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { isAdmin: false, error };
  }

  return { isAdmin: profile?.role === "admin", error: null };
}
