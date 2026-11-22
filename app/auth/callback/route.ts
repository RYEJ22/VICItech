import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function failureRedirect(request: NextRequest): NextResponse {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));

  if (!code) return failureRedirect(request);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) return failureRedirect(request);

    const target = new URL(next, request.nextUrl.origin);
    target.searchParams.set("auth", "success");
    return NextResponse.redirect(target);
  } catch {
    return failureRedirect(request);
  }
}
