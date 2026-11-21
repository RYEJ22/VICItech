import ViciTechApp from "@/components/vicitech/ViciTechApp";

export const metadata = {
  title: "Workspace | ViciTech OS",
  description: "ViciTech OS main application workspace and modular hardware hub.",
};

export default function HomePage({ searchParams }) {
  const initialModule = typeof searchParams?.tab === "string" ? searchParams.tab : "home";
  return <ViciTechApp initialModule={initialModule} />;
}
