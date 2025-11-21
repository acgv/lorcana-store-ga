import { MetadataRoute } from 'next'

// Función auxiliar para obtener la URL base
function getBaseUrl(): string {
  // En producción, usar NEXT_PUBLIC_APP_URL si está configurado
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
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
