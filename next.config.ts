import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Tesseract.js uses Node.js APIs that shouldn't be bundled on the server.
  // We only use it client-side via dynamic import, but this prevents
  // any accidental server-side resolution during build.
  serverExternalPackages: ["tesseract.js"],
  allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000", "http://21.0.12.29:3000"],
};

export default nextConfig;