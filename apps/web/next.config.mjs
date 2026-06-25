import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { withSentryConfig } from '@sentry/nextjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const nextConfig = {
  output: 'standalone',
  images: {},
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: 'grilyage',
  project: 'grilyage-web',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
