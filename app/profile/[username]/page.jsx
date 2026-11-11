import ViciTechApp from "@/components/vicitech/ViciTechApp";
import PublicProfilePage from "@/components/vicitech/PublicProfilePage";

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
