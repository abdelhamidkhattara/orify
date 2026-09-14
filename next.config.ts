import type { NextConfig } from "next";

/** Keep in sync with src/lib/config.ts → OWNER_PATH */
const OWNER_PATH = "ox-orify-k7m2p9";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.blob.vercel-storage.com" },
    ],
    unoptimized: process.env.NODE_ENV === "development",
  },
  async rewrites() {
    return [
      { source: `/${OWNER_PATH}`, destination: "/owner" },
      { source: `/${OWNER_PATH}/:path*`, destination: "/owner/:path*" },
    ];
  },
};

export default nextConfig;
