/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizeCss: true,
    esmExternals: true,
    // Nota: legacyBrowsers y css.inlining no están disponibles en Next.js 16
    // Next.js 16 ya optimiza CSS automáticamente
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Next.js 16 usa Turbopack por defecto (más rápido que webpack)
  // Turbopack ya hace tree-shaking y optimizaciones automáticamente
  // No necesitamos configuración de webpack
  turbopack: {},
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
