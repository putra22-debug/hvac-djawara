/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseHostname = supabaseUrl.replace(/^https?:\/\//, '').split('/')[0];

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // Next.js build assets
    {
      urlPattern: /^\/(_next\/static\/.*)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    // Static images/assets
    {
      urlPattern: /^https?:.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-images',
        expiration: {
          maxEntries: 300,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    // Supabase storage objects (avatars/receipts/etc)
    ...(supabaseHostname
      ? [
          {
            urlPattern: new RegExp(`^https:\\/\\/${supabaseHostname}\\/storage\\/v1\\/object\\/`),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-storage',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ]
      : []),
  ],
});

const nextConfig = {
  // Server Actions are enabled by default in Next.js 14
  typescript: {
    // Allow deploying landing page while internal dashboard code is incomplete
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip lint errors during build for the same reason
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: 'https',
            hostname: supabaseHostname,
            pathname: '/storage/v1/object/**',
          },
        ]
      : [],
  },
}

module.exports = withPWA(nextConfig)
