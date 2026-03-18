import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { verifyAdmin } from '@/lib/auth'
import { getSetInfo } from '@/lib/lorcana-sets'

export async function GET(request: NextRequest) {
  try {
    // ✅ SEGURIDAD: Verificar que el usuario es admin
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || 'Unauthorized' },
        { status: adminCheck.status || 401 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin not configured' },
        { status: 500 }
      )
    }

    // Obtener todas las órdenes ordenadas por fecha (más reciente primero)
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching orders:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const rawOrders = orders || []

    // Enriquecer items con metadata de cartas para fulfillment (compatibilidad con órdenes antiguas)
    const allItemIds = new Set<string>()
    for (const o of rawOrders as any[]) {
      const items = Array.isArray(o.items) ? o.items : []
      for (const it of items) {
        const id = it?.id || it?.card_id || it?.cardId
        if (id) allItemIds.add(String(id))
      }
    }

    const metaById = new Map<string, any>()
    if (allItemIds.size > 0) {
      const { data: metaRows, error: metaError } = await supabaseAdmin
        .from("cards")
        .select("id,set,number,cardNumber,language")
        .in("id", Array.from(allItemIds))

      if (metaError) {
        console.warn("⚠️ Error fetching card metadata for orders:", metaError.message)
      } else {
        ;(metaRows || []).forEach((row: any) => metaById.set(String(row.id), row))
      }
    }

    const enrichedOrders = (rawOrders as any[]).map((o) => {
      const items = Array.isArray(o.items) ? o.items : []
      const enrichedItems = items.map((it: any) => {
        const id = String(it?.id || it?.card_id || it?.cardId || "")
        const meta = metaById.get(id)
        if (!meta) return it

        // No pisar si ya viene guardado en la orden
        const setSlug = it?.set ?? meta?.set ?? null
        const setInfo = getSetInfo(setSlug)
        return {
          ...it,
          id: it?.id ?? id,
          set: setSlug,
          setNumber: it?.setNumber ?? setInfo?.setNumber ?? null,
          setName: it?.setName ?? setInfo?.displayName ?? (setSlug ? String(setSlug) : null),
          number: it?.number ?? meta?.number ?? null,
          cardNumber: it?.cardNumber ?? meta?.cardNumber ?? null,
          language: it?.language ?? meta?.language ?? null,
        }
      })
      return { ...o, items: enrichedItems }
    })

    console.log(`✅ Retrieved ${enrichedOrders.length} orders`)

    return NextResponse.json({
      success: true,
      orders: enrichedOrders,
      count: enrichedOrders.length,
    })
  } catch (error) {
    console.error('❌ Error in GET /api/orders:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

