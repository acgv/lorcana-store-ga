import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db"

/**
 * API endpoint para obtener métricas de analytics
 * 
 * Nota: Los eventos de Vercel Analytics no tienen API pública,
 * pero podemos obtener métricas de la base de datos (órdenes, logs, etc.)
 * y combinarlas con información sobre el uso de la aplicación.
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status || 401 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: "Database not configured",
      }, { status: 500 })
    }

    // Obtener métricas de órdenes (conversiones)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, status, total_amount, paid_at, customer_email")
      .order("paid_at", { ascending: false })

    if (ordersError) {
      console.error("Error fetching orders:", ordersError)
    }

    // Obtener métricas de usuarios
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error("Error fetching users:", usersError)
    }

    // Obtener métricas de colecciones (con paginación para obtener todos los registros)
    let allCollections: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1

      const { data, error } = await supabaseAdmin
        .from("user_collections")
        .select("id, user_id, card_id, status, version, quantity")
        .range(from, to)

      if (error) {
        console.error("Error fetching collections page:", error)
        break
      }

      if (data && data.length > 0) {
        allCollections = [...allCollections, ...data]
        console.log(`📊 Analytics collections pagination - Page ${page + 1}: loaded ${data.length} items, total so far: ${allCollections.length}`)
      }

      // Continuar si obtuvimos exactamente pageSize items
      hasMore = data && data.length === pageSize
      
      if (!hasMore && data) {
        console.log(`✅ Analytics collections pagination complete: loaded ${allCollections.length} items (last page had ${data.length} items)`)
      }

      page++

      // Safety limit: no más de 50 páginas (50,000 items máximo)
      if (page >= 50) {
        console.log(`⚠️ Reached safety limit of 50 pages (50,000 items). Loaded ${allCollections.length} items.`)
        break
      }
    }

    const collections = allCollections

    // Obtener logs recientes para actividad
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("logs")
      .select("id, action, details, created_at")
      .order("created_at", { ascending: false })
      .limit(100)

    if (logsError) {
      console.error("Error fetching logs:", logsError)
    }

    // Calcular métricas
    const approvedOrders = orders?.filter(o => o.status === "approved") || []
    const totalRevenue = approvedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const totalOrders = approvedOrders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Métricas de usuarios
    const totalUsers = users?.users?.length || 0
    const authenticatedUsers = users?.users?.filter(u => u.email_confirmed_at)?.length || 0

    // Obtener métricas de cartas con stock (con paginación)
    let allCardsWithStock: any[] = []
    let cardsPage = 0
    const cardsPageSize = 1000
    let cardsHasMore = true

    while (cardsHasMore) {
      const from = cardsPage * cardsPageSize
      const to = from + cardsPageSize - 1

      const { data: cardsData, error: cardsError } = await supabaseAdmin
        .from("cards")
        .select("id, normalStock, foilStock, stock")
        .eq("status", "approved")
        .range(from, to)

      if (cardsError) {
        console.error("Error fetching cards page:", cardsError)
        break
      }

      if (cardsData && cardsData.length > 0) {
        allCardsWithStock = [...allCardsWithStock, ...cardsData]
        console.log(`📊 Analytics cards pagination - Page ${cardsPage + 1}: loaded ${cardsData.length} cards, total so far: ${allCardsWithStock.length}`)
      }

      cardsHasMore = cardsData && cardsData.length === cardsPageSize
      cardsPage++

      if (cardsPage >= 50) break
    }

    console.log(`📊 Total cards loaded for stock calculation: ${allCardsWithStock.length}`)

    // Calcular total de unidades disponibles (suma de normalStock + foilStock)
    let totalUnitsInStock = 0
    let cardsWithStockCount = 0

    allCardsWithStock.forEach(card => {
      // Manejar diferentes formatos de stock - convertir null/undefined a 0
      let normalStock = 0
      if (card.normalStock !== null && card.normalStock !== undefined) {
        normalStock = Number(card.normalStock) || 0
      } else if (card.stock !== null && card.stock !== undefined) {
        normalStock = Number(card.stock) || 0
      }
      
      let foilStock = 0
      if (card.foilStock !== null && card.foilStock !== undefined) {
        foilStock = Number(card.foilStock) || 0
      }
      
      const totalStock = normalStock + foilStock
      
      if (totalStock > 0) {
        cardsWithStockCount++
        totalUnitsInStock += totalStock
      }
    })

    // Log detallado para debugging
    if (allCardsWithStock.length > 0) {
      const sampleCard = allCardsWithStock[0]
      console.log(`📊 Sample card stock values:`, {
        id: sampleCard.id,
        normalStock: sampleCard.normalStock,
        foilStock: sampleCard.foilStock,
        stock: sampleCard.stock,
        normalStockType: typeof sampleCard.normalStock,
        foilStockType: typeof sampleCard.foilStock,
      })
    }
    
    console.log(`📊 Stock calculation: ${cardsWithStockCount} cards with stock, ${totalUnitsInStock} total units`)

    // Métricas de colección
    const totalCollectionItems = collections?.length || 0
    const uniqueUsersWithCollection = new Set(collections?.map(c => c.user_id) || []).size
    const ownedItems = collections?.filter(c => c.status === "owned")?.length || 0

    // Actividad reciente (últimas 24 horas)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentLogs = logs?.filter(log => {
      const logDate = new Date(log.created_at)
      return logDate >= last24Hours
    }) || []

    // Agrupar logs por acción
    const activityByAction = recentLogs.reduce((acc, log) => {
      const action = log.action || "unknown"
      acc[action] = (acc[action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Órdenes por día (últimos 7 días)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      return date
    }).reverse()

    const ordersByDay = last7Days.map(date => {
      const dayStart = date.toISOString()
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      const dayEndStr = dayEnd.toISOString()

      const dayOrders = approvedOrders.filter(o => {
        if (!o.paid_at) return false
        const paidDate = new Date(o.paid_at)
        return paidDate >= new Date(dayStart) && paidDate <= new Date(dayEndStr)
      })

      return {
        date: date.toISOString().split("T")[0],
        count: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        // Métricas de conversión
        conversion: {
          totalOrders,
          totalRevenue,
          averageOrderValue,
          ordersByDay,
        },
        // Métricas de usuarios
        users: {
          total: totalUsers,
          authenticated: authenticatedUsers,
          conversionRate: totalUsers > 0 ? (authenticatedUsers / totalUsers) * 100 : 0,
        },
        // Métricas de colección
        collection: {
          totalItems: totalCollectionItems,
          uniqueUsers: uniqueUsersWithCollection,
          ownedItems,
          averageItemsPerUser: uniqueUsersWithCollection > 0 
            ? totalCollectionItems / uniqueUsersWithCollection 
            : 0,
        },
        // Métricas de inventario
        inventory: {
          cardsWithStock: cardsWithStockCount, // Cartas únicas con stock
          totalUnitsInStock, // Total de unidades disponibles (normalStock + foilStock)
          totalCards: allCardsWithStock.length,
        },
        // Actividad reciente
        activity: {
          last24Hours: recentLogs.length,
          byAction: activityByAction,
          recentLogs: recentLogs.slice(0, 20), // Últimos 20 logs
        },
        // Nota sobre Vercel Analytics
        note: "Los eventos detallados de analytics (login, búsquedas, filtros, etc.) están disponibles en el dashboard de Vercel Analytics. Este dashboard muestra métricas basadas en datos de la base de datos.",
      },
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

