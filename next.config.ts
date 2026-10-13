import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.mlstatic.com' },
      { protocol: 'https', hostname: '*.susercontent.com' },
      { protocol: 'https', hostname: 'cf.shopee.com.br' },
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
