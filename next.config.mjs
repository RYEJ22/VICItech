/** @type {import('next').NextConfig} */
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : '';
const supabaseSocket = supabaseOrigin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
  'https://app.sandbox.midtrans.com',
  'https://app.midtrans.com',
].join(' ');
const csp = [
  "default-src 'self'",
  `script-src ${scriptSources}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin} https://media.giphy.com https://i.giphy.com`,
  `connect-src 'self' ${supabaseOrigin} ${supabaseSocket} https://api.giphy.com https://generativelanguage.googleapis.com https://app.sandbox.midtrans.com https://app.midtrans.com https://api.sandbox.midtrans.com https://api.midtrans.com`,
  "font-src 'self' data:",
  "frame-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://app.sandbox.midtrans.com https://app.midtrans.com",
  "frame-ancestors 'self'",
].join('; ');

const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.giphy.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};

export default nextConfig;
