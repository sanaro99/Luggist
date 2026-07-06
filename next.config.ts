import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle (.next/standalone/server.js) so the
  // Docker runtime image can be small and dependency-light.
  output: "standalone",
};

export default nextConfig;
