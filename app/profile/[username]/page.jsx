import { ProfileAccountHub } from "@/components/features/profile/profile-account-hub";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const username = typeof resolvedParams?.username === "string" ? resolvedParams.username.trim() : "";
  const handle = username ? `@${username}` : "Anggota ViciTech";
  const description = `Profil publik ${handle}: showcase rakitan PC, postingan komunitas, dan perangkat utama di ViciTech.`;
  const canonicalPath = username ? `/profile/${encodeURIComponent(username)}` : "/profile";

  return {
    title: `${handle} | Profil ViciTech`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${handle} | Profil ViciTech`,
      description,
      url: canonicalPath,
      images: ["/images/hero/pc-rig.jpg"],
    },
  };
}

export default async function ProfileRoute({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const username = typeof resolvedParams?.username === "string" ? resolvedParams.username : "";
  const rawTab = Array.isArray(resolvedSearchParams?.tab)
    ? resolvedSearchParams.tab[0]
    : resolvedSearchParams?.tab;

  return (
    <ProfileAccountHub
      mode="public"
      targetUsername={username}
      initialTab={typeof rawTab === "string" ? rawTab : undefined}
    />
  );
}
