/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "30mb" }, // room photo uploads (several images per save)
  },
};

export default nextConfig;
