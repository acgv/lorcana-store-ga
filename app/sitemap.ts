import { MetadataRoute } from 'next'
import { supabase } from '@/lib/db'

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

// Función para obtener todas las cartas aprobadas
async function getAllApprovedCards(): Promise<Array<{ id: string; updatedAt?: string }>> {
  try {
    if (!supabase) {
      console.warn('⚠️ Supabase not configured, skipping dynamic card URLs in sitemap')
      return []
    }

    // Obtener todas las cartas aprobadas con paginación
    let allCards: Array<{ id: string; updatedAt?: string }> = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1

      const { data, error } = await supabase
        .from('cards')
        .select('id, updatedAt')
        .eq('status', 'approved')
        .range(from, to)

      if (error) {
        console.error('Error fetching cards for sitemap:', error)
        break
      }

      if (data && data.length > 0) {
        allCards = [
          ...allCards,
          ...data.map((card: any) => ({
            id: card.id,
            updatedAt: card.updatedAt || card.updatedat,
          })),
        ]
      }

      // Verificar si hay más páginas
      hasMore = data && data.length === pageSize
      page++

      // Safety limit: no más de 10 páginas (10,000 cartas máximo)
      if (page >= 10) break
    }

    return allCards
  } catch (error) {
    console.error('Exception fetching cards for sitemap:', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const currentDate = new Date()

  // Rutas estáticas públicas
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/submit-card`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]

  // Obtener todas las cartas aprobadas para rutas dinámicas
  const cards = await getAllApprovedCards()

  // Crear rutas dinámicas para cada carta
  const cardRoutes: MetadataRoute.Sitemap = cards.map((card) => ({
    url: `${baseUrl}/card/${card.id}`,
    lastModified: card.updatedAt ? new Date(card.updatedAt) : currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Combinar todas las rutas
  return [...staticRoutes, ...cardRoutes]
}
