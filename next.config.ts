import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/mahalfamily',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/mahalfamily',
        basePath: false,
        permanent: false,
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
