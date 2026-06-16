import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

// Keep CI/build output clean until Serwist has full Turbopack support.
process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING ??= "1";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // Disable PWA in development and non-production (Serwist doesn't support Turbopack yet)
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // Empty turbopack config to silence Next 16 warning about webpack config from Serwist
  turbopack: {},
};

export default withSerwist(nextConfig);
