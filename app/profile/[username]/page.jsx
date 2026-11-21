import ViciTechApp from "@/components/vicitech/ViciTechApp";
import PublicProfilePage from "@/components/vicitech/PublicProfilePage";

export async function generateMetadata({ params }) {
  const username = typeof params?.username === "string" ? params.username.trim() : "";
  const handle = username ? `@${username}` : "Anggota ViciTech";
  const description = `Profil publik ${handle}: showcase rakitan PC, preset tersimpan, dan rekam jejak kontribusi di ViciTech.`;
  const canonicalPath = username ? `/profile/${encodeURIComponent(username)}` : "/community";

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

export default function ProfileRoute({ params }) {
  const username = typeof params?.username === "string" ? params.username : "";
  return (
    <ViciTechApp
      components={{ profile: PublicProfilePage }}
      initialModule="profile"
      initialProfileUsername={username}
    />
  );
}
