import ViciTechApp from "@/components/vicitech/ViciTechApp";
import DirectMessageDrawer from "@/components/vicitech/DirectMessageDrawer";

export default function MessagesRoute({ searchParams }) {
  const initialMessageUsername = typeof searchParams?.to === "string" ? searchParams.to : "";
  return (
    <ViciTechApp
      components={{ messages: DirectMessageDrawer }}
      initialModule="messages"
      initialMessageUsername={initialMessageUsername}
    />
  );
}
