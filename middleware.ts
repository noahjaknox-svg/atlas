import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const INTERNAL_PREFIXES = [
  "/dashboard",
  "/pipeline",
  "/proposals",
  "/settings",
  "/data",
  "/proposal-design",
  "/help",
  "/api/proposals",
  "/api/prospects",
  "/api/aircraft",
  "/api/users",
  "/api/data",
  "/api/portal-content",
  "/api/airports",
  "/api/fbos",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isInternal =
    INTERNAL_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !pathname.startsWith("/api/portal");

  if (!isInternal) {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pipeline/:path*",
    "/proposals/:path*",
    "/proposal-design/:path*",
    "/api/proposals/:path*",
    "/api/prospects/:path*",
    "/api/aircraft-instances/:path*",
    "/api/aircraft-master/:path*",
    "/api/airports/:path*",
    "/api/fbos/:path*",
    "/settings/:path*",
    "/data/:path*",
    "/help/:path*",
    "/api/users/:path*",
    "/api/data/:path*",
    "/api/portal-content/:path*",
  ],
};
