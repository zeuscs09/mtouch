import { clearAuthCookies } from "@/lib/auth";

export async function POST() {
  await clearAuthCookies();
  return Response.json({ success: true });
}
