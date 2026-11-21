import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getCleanRedirectUrl(request) {
  return new URL("/", request.nextUrl.origin);
}

function getRedirectUrl(request, status, message) {
  const requestedPath = request.nextUrl.searchParams.get("next");
  const origin = request.nextUrl.origin;
  const defaultPath = status === "success" ? "/community" : "/";
  let redirectUrl = new URL(defaultPath, origin);
  if (requestedPath?.startsWith("/") && !requestedPath.startsWith("//")) {
    const resolvedTarget =
      status === "success" && requestedPath === "/" ? "/community" : requestedPath;
    const candidateUrl = new URL(resolvedTarget, origin);
    if (candidateUrl.origin === origin) redirectUrl = candidateUrl;
  }
  redirectUrl.searchParams.set("auth", status);
  if (message) redirectUrl.searchParams.set("auth_error", String(message).slice(0, 300));
  return redirectUrl;
}

function isMissingPkceVerifier(error) {
  return (
    error?.name === "AuthPKCECodeVerifierMissingError" ||
    error?.code === "pkce_code_verifier_not_found" ||
    /pkce code verifier/i.test(error?.message || "")
  );
}

export async function GET(request) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    const providerError =
      request.nextUrl.searchParams.get("error_description") ||
      request.nextUrl.searchParams.get("error");
    return NextResponse.redirect(
      getRedirectUrl(
        request,
        "error",
        providerError || "Authentication callback did not include a code."
      )
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (
    !supabaseUrl ||
    !supabaseKey ||
    !supabaseUrl.startsWith("http") ||
    supabaseUrl.includes("your-project")
  ) {
    return NextResponse.redirect(
      getRedirectUrl(request, "error", "Supabase authentication is not configured.")
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (!data?.session?.user) {
      throw new Error("Supabase did not return a user session for the callback code.");
    }

    return NextResponse.redirect(getRedirectUrl(request, "success"));
  } catch (error) {
    if (isMissingPkceVerifier(error)) {
      const cookieStore = cookies();
      cookieStore.getAll()
        .filter(({ name }) => name.includes("code-verifier"))
        .forEach(({ name }) => cookieStore.delete(name));
      return NextResponse.redirect(getCleanRedirectUrl(request));
    }

    return NextResponse.redirect(
      getRedirectUrl(
        request,
        "error",
        (error.message || "Could not complete sign-in. Please try again.").slice(0, 300)
      )
    );
  }
}
