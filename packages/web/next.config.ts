import type { NextConfig } from "next";
import path from "path";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${apiUrl}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
