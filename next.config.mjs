/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  /** node-ical uses BigInt; must not be webpack-bundled for API routes. */
  experimental: {
    serverComponentsExternalPackages: ["node-ical"],
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/aircraft-management/pipeline", permanent: true },
      { source: "/pipeline", destination: "/aircraft-management/pipeline", permanent: true },
      {
        source: "/proposal-design",
        destination: "/aircraft-management/proposal-design",
        permanent: true,
      },
      {
        source: "/proposals/:path*",
        destination: "/aircraft-management/proposals/:path*",
        permanent: true,
      },
      { source: "/schedule", destination: "/charter/schedule", permanent: true },
      { source: "/data", destination: "/data-warehouse/data", permanent: true },
      {
        source: "/performance-data",
        destination: "/data-warehouse/data?tab=performance-data",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
