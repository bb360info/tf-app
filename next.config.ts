import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';
import createNextIntlPlugin from 'next-intl/plugin';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
});

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default withSerwist(withNextIntl(nextConfig));
