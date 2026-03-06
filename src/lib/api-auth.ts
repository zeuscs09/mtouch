import { NextRequest } from "next/server";
import { verifyAccessToken, verifyRefreshToken, JwtPayload } from "./auth";
import { UserRole } from "@/generated/prisma/client";

/**
 * Extract and verify auth from request headers/cookies.
 * Use in API route handlers.
 */
export async function getAuthFromRequest(
  request: NextRequest
): Promise<JwtPayload | null> {
  // Check Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return verifyAccessToken(token);
  }

  // Fall back to cookies
  const accessToken = request.cookies.get("access_token")?.value;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) return payload;
  }

  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    return verifyRefreshToken(refreshToken);
  }

  return null;
}

/**
 * Require authentication. Returns payload or 401 Response.
 */
export async function requireAuth(
  request: NextRequest
): Promise<JwtPayload | Response> {
  const payload = await getAuthFromRequest(request);
  if (!payload) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return payload;
}

/**
 * Require specific role(s). Returns payload or 401/403 Response.
 */
export async function requireRole(
  request: NextRequest,
  roles: UserRole[]
): Promise<JwtPayload | Response> {
  const result = await requireAuth(request);
  if (result instanceof Response) return result;

  if (!roles.includes(result.role as UserRole)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}
