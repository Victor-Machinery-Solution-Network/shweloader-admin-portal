import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "asset-staging.shweloader.com.mm",
      },
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

export default nextConfig;
