import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig = (phase: string): NextConfig => ({
  // Keep `next dev` from reading files replaced by a concurrent production build.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  serverExternalPackages: ["pdf-parse", "@xenova/transformers"],
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
