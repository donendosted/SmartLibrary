import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = request.cookies.get("library_admin_session")?.value;
    let validAdminSession = false;
    try {
      const encodedPayload = decodeURIComponent(token || "").split(".")[1];
      const payload = JSON.parse(
        atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")),
      );
      validAdminSession = Boolean(
        payload.role &&
        payload.role !== "student" &&
        (!payload.exp || payload.exp * 1000 > Date.now()),
      );
    } catch {
      validAdminSession = false;
    }
    if (!validAdminSession) {
      return NextResponse.redirect(new URL("/librarian-login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
