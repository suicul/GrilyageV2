/** @type {import('next').NextConfig} */
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const nextConfig = {
  output: 'standalone',
  images: {
    // Images now served from /public/ — no remote patterns needed
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
