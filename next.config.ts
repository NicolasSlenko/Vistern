import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig = (phase: string): NextConfig => ({
  // Keep `next dev` from reading files replaced by a concurrent production build.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  serverExternalPackages: ["pdf-parse", "@xenova/transformers"],
  async headers() {
    // A baseline that needs nothing from Clerk, Supabase or the AI providers.
    // No Content-Security-Policy yet: Clerk's scripts and frames need a
    // reviewed allow-list, so frame-ancestors alone covers clickjacking.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    // The resume feedback page is gone; keep old links and bookmarks working.
    return [{ source: "/dashboard", destination: "/home", permanent: true }];
  },
  async rewrites() {
    return [
      {
        source: "/architecture-plan",
        destination: "/architecture-plan.html",
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'sharp$': false,
      'onnxruntime-node$': false,
    }
    return config
  }
});

export default nextConfig;
