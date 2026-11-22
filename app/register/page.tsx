import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { sanitizeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Daftar | ViciTech",
  robots: { index: false, follow: false },
};

interface RegisterPageProps {
  readonly searchParams?: { readonly next?: string };
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  return (
    <AuthPageShell
      eyebrow="Daftar"
      title="Buat akun ViciTech"
      description="Bergabung dengan ekosistem Circular IT ViciTech dan mulai berbagi rakitan Anda."
    >
      <AuthForm mode="register" next={sanitizeNextPath(searchParams?.next)} />
    </AuthPageShell>
  );
}
