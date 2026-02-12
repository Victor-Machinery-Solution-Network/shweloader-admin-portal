import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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
