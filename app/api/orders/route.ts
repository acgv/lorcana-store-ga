import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usar Service Role para bypassear RLS
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE
    )
  : null

export async function GET() {
  try {
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

    console.log(`✅ Retrieved ${orders?.length || 0} orders`)

    return NextResponse.json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0,
    })
  } catch (error) {
    console.error('❌ Error in GET /api/orders:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

