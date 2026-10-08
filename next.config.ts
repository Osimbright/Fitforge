import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Progress photos are uploaded through a server action (6 MB cap + multipart overhead).
    serverActions: { bodySizeLimit: "7mb" },
  },
  images: {
    remotePatterns: [
      // Exercise images from the open-source free-exercise-db library
      { protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/yuhonas/free-exercise-db/**" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com", pathname: "/photos/**" },
    ],
  },
};

export default nextConfig;
