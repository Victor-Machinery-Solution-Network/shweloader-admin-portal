export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (Auth.js endpoints must be publicly accessible)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    "/((?!api/auth|firebase-sms-test|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
