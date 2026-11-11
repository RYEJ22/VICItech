import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { verifyAdminRole } from "@/lib/supabase/admin-auth";

function redirectToAdminLogin(request, reason, cookiesToSet = []) {
  const url = request.nextUrl.clone();
  const requestedPath = `${url.pathname}${url.search}`;
  url.pathname = "/admin/login";
  url.search = "";
  url.searchParams.set("error", reason);
  if (reason !== "configuration" && requestedPath !== "/admin/login") {
    url.searchParams.set("next", requestedPath);
  }

  const response = NextResponse.redirect(url);
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}

export async function middleware(request) {
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-admin-pathname", request.nextUrl.pathname);

  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return redirectToAdminLogin(request, "configuration");
  }

  let cookiesToSet = [];
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookiesToSet = cookies;
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        forwardedHeaders.set("cookie", request.cookies.toString());
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return redirectToAdminLogin(request, "authentication", cookiesToSet);
  }

  const { isAdmin, error: roleError } = await verifyAdminRole(supabase, user);
  if (roleError) {
    console.error("[ViciTech OS] Could not verify admin profile role:", roleError);
    return redirectToAdminLogin(request, "authorization", cookiesToSet);
  }
  if (!isAdmin) {
    return redirectToAdminLogin(request, "unauthorized", cookiesToSet);
  }

  const response = NextResponse.next({ request: { headers: forwardedHeaders } });
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
