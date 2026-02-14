/**
 * Auth layout - centered layout for login page
 * Route group (auth) doesn't affect URLs
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Preconnect to Cloudflare so Turnstile script loads faster */}
      <link rel="preconnect" href="https://challenges.cloudflare.com" />
      <div className="grid min-h-screen place-items-center bg-muted/30 px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </>
  );
}
