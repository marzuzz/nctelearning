import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Admin pages use dynamic features (searchParams, route params)
  // They are marked with export const dynamic = 'force-dynamic' to prevent prerendering errors
};

export default nextConfig;
