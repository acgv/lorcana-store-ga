/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.lorcana.ravensburger.com',
        pathname: '/images/**',
      },
    ],
  },
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // CORS - Permitir requests desde tu dominio
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || '*', // En producción, especifica tu dominio
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          // Seguridad
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Prevenir clickjacking
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Prevenir MIME sniffing
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
