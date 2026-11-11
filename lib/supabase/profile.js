export function getUserDisplayName(user) {
  const metadata = user?.user_metadata || {};
  const metadataName =
    metadata.username ||
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    metadata.user_name ||
    metadata.preferred_username;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  const emailName = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (emailName) {
    return emailName.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return "ViciTech member";
}

export function getUserInitials(user) {
  return getUserDisplayName(user)
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
