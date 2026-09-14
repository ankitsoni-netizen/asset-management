import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["nodemailer"],
  turbopack: {
    root: process.cwd(),
  },
  images: {
    localPatterns: [
      { pathname: "/brand/**" },
      { pathname: "/api/media/**" },
    ],
  },
};

export default nextConfig;
