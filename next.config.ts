import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for container environments; Vercel packages serverless functions natively
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
