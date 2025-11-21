import { MetadataRoute } from 'next'

// Función auxiliar para obtener la URL base
function getBaseUrl(): string {
  // Prioridad 1: NEXT_PUBLIC_SITE_URL (estándar para SEO)
  // Prioridad 2: NEXT_PUBLIC_APP_URL (compatibilidad hacia atrás)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL
  
  if (siteUrl) {
    return siteUrl
  }
  
  // En Vercel, usar VERCEL_URL si está disponible
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // En desarrollo, usar localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3002'
  }
  
  // Fallback por defecto (ajusta según tu dominio)
  return 'https://gacompany.cl'
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/payment/',
          '/my-collection',
          '/my-submissions',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/payment/',
          '/my-collection',
          '/my-submissions',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
