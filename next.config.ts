import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  headers: async () => [
    { source: "/(.*)", headers: securityHeaders },
  ],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@hugeicons/core-free-icons",
      "@hugeicons/react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@tanstack/react-table",
      "radix-ui",
    ],
  },
};

export default nextConfig;
