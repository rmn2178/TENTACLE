import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No "output: standalone" — Vercel manages its own output format
  // Strict type-checking on build — production code must not ignore TS errors
  typescript: {
    ignoreBuildErrors: false,
  },
  // Catch unsafe lifecycles and side effects during development
  reactStrictMode: true,
  // Powered-by header removal + security headers
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
