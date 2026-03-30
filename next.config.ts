import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_HAS_API_KEY: process.env.ANTHROPIC_API_KEY ? "1" : "",
  },
};

export default nextConfig;
