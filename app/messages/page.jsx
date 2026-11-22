import ViciTechApp from "@/components/vicitech/ViciTechApp";
import DirectMessageDrawer from "@/components/vicitech/DirectMessageDrawer";

export const metadata = {
  title: "Pesan Langsung | ViciTech OS",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MessagesRoute({ searchParams }) {
  const initialMessageUsername = typeof searchParams?.to === "string" ? searchParams.to : "";
  const initialMessagePeerId = typeof searchParams?.peer === "string" ? searchParams.peer : "";
  return (
    <ViciTechApp
      components={{ messages: DirectMessageDrawer }}
      initialModule="messages"
      initialMessageUsername={initialMessageUsername}
      initialMessagePeerId={initialMessagePeerId}
    />
  );
}
