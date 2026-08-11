export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (Auth.js endpoints must be publicly accessible)
     * - api/cron (Vercel Cron sends a CRON_SECRET bearer, never a session
     *   cookie — the proxy would bounce it to /login and the job would
     *   silently never run. Each cron route verifies CRON_SECRET itself.)
     * - api/settings/exchange-rate (read-only header badge value)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    "/((?!api/auth|api/cron|api/settings/exchange-rate|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
