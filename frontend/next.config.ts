import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CACHE_BUST: Date.now().toString(),
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
  },
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${backendUrl}/ws/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        // Static assets (JS/CSS bundles, images, fonts) — cache forever, content-hashed
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Fonts — truly immutable, cache forever
        source: "/:path*\\.(woff|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Images and videos — cache for 1 day, revalidate
        source: "/:path*\\.(jpg|jpeg|png|webp|avif|svg|mp4|webm)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, must-revalidate" },
        ],
      },
      {
        // Audio files — cache for a week
        source: "/:path*\\.(mp3|wav|ogg)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, must-revalidate" },
        ],
      },
      {
        // HTML pages and API routes — never cache, always revalidate
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
