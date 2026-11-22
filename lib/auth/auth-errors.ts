const FALLBACK_MESSAGE = "Terjadi kesalahan saat autentikasi. Silakan coba lagi.";

function readField(source: unknown, key: string): string {
  if (typeof source !== "object" || source === null) return "";
  const value = Object.getOwnPropertyDescriptor(source, key)?.value;
  return typeof value === "string" ? value : "";
}

function readStatus(source: unknown): number {
  if (typeof source !== "object" || source === null) return 0;
  const value = Object.getOwnPropertyDescriptor(source, "status")?.value;
  return typeof value === "number" ? value : 0;
}

/** Memetakan error Supabase Auth (atau kode query) ke pesan Bahasa Indonesia yang ramah. */
export function mapAuthErrorMessage(error: unknown): string {
  const raw = typeof error === "string" ? error : "";
  const code = (typeof error === "string" ? error : readField(error, "code")).toLowerCase();
  const message = (raw || readField(error, "message")).toLowerCase();
  const status = readStatus(error);

  if (code === "auth_callback_failed") {
    return "Proses masuk gagal diselesaikan. Silakan coba lagi.";
  }
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "Email atau kata sandi salah. Periksa kembali lalu coba lagi.";
  }
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("user already registered") ||
    message.includes("already been registered")
  ) {
    return "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.";
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Email Anda belum dikonfirmasi. Periksa kotak masuk atau folder spam untuk tautan verifikasi.";
  }
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("security purposes") ||
    status === 429
  ) {
    return "Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi.";
  }
  if (code === "weak_password" || message.includes("password should be at least")) {
    return "Kata sandi terlalu lemah. Gunakan minimal 6 karakter.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Koneksi bermasalah. Periksa jaringan Anda lalu coba lagi.";
  }
  if (message.includes("not configured")) {
    return "Autentikasi belum dikonfigurasi. Hubungi administrator ViciTech.";
  }
  return FALLBACK_MESSAGE;
}
