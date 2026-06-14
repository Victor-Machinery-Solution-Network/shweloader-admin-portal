import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  images: {
    // Vercel Image Optimization is OFF — same as the public web app. Uploads are
    // already re-encoded to WebP via sharp before hitting R2 (see
    // src/lib/actions/upload-helpers.ts / bulk-upload.ts), so the optimizer was
    // only re-compressing WebP→WebP. Disabling it stops burning the account's
    // shared 5k/month transformation quota — admins browse the whole catalog, so
    // this project generates a lot of unique transformations despite low traffic.
    // next/image still handles CLS / lazy-load / fill for free while unoptimized.
    // (sharp below stays — it's the upload pipeline, not the optimizer.)
    unoptimized: true,

    // Explicit R2 asset hosts only (prod + staging). NOT a wildcard: a broad
    // `**.shweloader.com.mm` would let the image optimizer proxy-fetch from the
    // authenticated API subdomains (api./app-api.) too — an SSRF surface.
    remotePatterns: [
      { protocol: "https", hostname: "asset.shweloader.com.mm" },
      { protocol: "https", hostname: "asset-staging.shweloader.com.mm" },
    ],
  },
  cacheComponents: true,
  reactCompiler: true,
  serverExternalPackages: ["sharp"],
  headers: async () => [
    { source: "/(.*)", headers: securityHeaders },
  ],
  turbopack: {},
  webpack: (config) => {
    // Suppress warnings for sharp's optional platform-specific dependencies.
    // On Vercel Linux, sharp uses @img/sharp-linux-x64 — the dev/WASM modules
    // are not needed and their absence is expected.
    config.resolve ??= {};
    config.resolve.alias ??= {};
    Object.assign(config.resolve.alias, {
      "@img/sharp-libvips-dev": false,
      "@img/sharp-wasm32": false,
    });
    return config;
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
    serverActions: {
      bodySizeLimit: "100mb",
    },
    proxyClientMaxBodySize: "100mb",
    optimizePackageImports: [
      "lucide-react",
      "@hugeicons/core-free-icons",
      "@hugeicons/react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@tanstack/react-table",
      "radix-ui",
      "@tiptap/react",
      "@tiptap/starter-kit",
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
