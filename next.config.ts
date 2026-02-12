import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@hugeicons/core-free-icons",
      "@hugeicons/react",
    ],
  },
};

export default nextConfig;
