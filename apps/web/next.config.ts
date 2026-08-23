import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@theclutch/engine"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
