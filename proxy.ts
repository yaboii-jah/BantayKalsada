import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const authRoutes = ["/login", "/register", "/reset-password"];
const protectedRoutes = ["/submit", "/my-reports", "/admin"];

export async function proxy(request: NextRequest) {
  const supabaseResponse = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isAuthRoute = authRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const isProtectedRoute = protectedRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/browse", request.url));
  }

  if (!user && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && !user.email_confirmed_at && pathname.startsWith("/submit")) {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
