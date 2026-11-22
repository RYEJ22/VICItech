import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { sanitizeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Masuk | ViciTech OS",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  readonly searchParams?: { readonly error?: string; readonly next?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const error = typeof searchParams?.error === "string" ? searchParams.error : "";
  return (
    <AuthPageShell
      eyebrow="Masuk"
      title="Selamat datang kembali"
      description="Masuk untuk mengakses profil, preset tersimpan, dan komunitas ViciTech."
    >
      <AuthForm mode="login" next={sanitizeNextPath(searchParams?.next)} {...(error ? { initialError: error } : {})} />
    </AuthPageShell>
  );
}
