import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Allow the dev server network host to request _next assets from the local server.
  // Prevents the Cross origin request detected warning during development when
  // accessing the app via the network IP (e.g. 10.4.2.2).
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
