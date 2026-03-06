import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-jwt-secret"
);

const publicPaths = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

const adminPaths = ["/admin"];
const customerPaths = ["/customer"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow API routes that don't need middleware-level auth
  // (API routes handle their own auth via requireAuth/requireRole)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check access token
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(accessToken, JWT_SECRET);
    const role = payload.role as string;

    // Admin routes: only admin, leader, support
    if (adminPaths.some((p) => pathname.startsWith(p))) {
      if (!["admin", "leader", "support"].includes(role)) {
        return NextResponse.redirect(new URL("/customer", request.url));
      }
    }

    // Customer routes: accessible by all authenticated users
    if (customerPaths.some((p) => pathname.startsWith(p))) {
      // All roles can access
    }

    // Redirect root to appropriate dashboard
    if (pathname === "/") {
      if (role === "customer") {
        return NextResponse.redirect(new URL("/customer", request.url));
      }
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    // Token invalid/expired — try refresh via client-side
    // For now, redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("access_token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
