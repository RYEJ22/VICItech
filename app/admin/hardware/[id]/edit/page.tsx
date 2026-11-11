import HardwareEditor from "@/components/vicitech/admin/HardwareEditor";

export default function EditHardwarePage({ params }: { params: { id: string } }) {
  return <HardwareEditor componentId={params.id} />;
}
