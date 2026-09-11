import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["qrcode", "pngjs"],
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      pngjs: "./node_modules/pngjs/lib/png.js",
    },
  },
  images: {
    localPatterns: [
      { pathname: "/brand/**" },
      { pathname: "/api/media/**" },
    ],
  },
};

export default nextConfig;
