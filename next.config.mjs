/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  /** node-ical uses BigInt; must not be webpack-bundled for API routes. */
  experimental: {
    serverComponentsExternalPackages: ["node-ical"],
  },
};

export default nextConfig;
