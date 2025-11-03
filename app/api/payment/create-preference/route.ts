import { NextResponse } from 'next/server'
import { createPaymentPreference, type CardItem } from '@/lib/mercadopago'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, customerEmail } = body as {
      items: CardItem[]
      customerEmail?: string
    }

    // Validar items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items are required' },
        { status: 400 }
      )
    }

    // Validar que todos los items tengan los campos necesarios
    for (const item of items) {
      if (!item.id || !item.name || !item.price || !item.quantity) {
        return NextResponse.json(
          { success: false, error: 'Invalid item data' },
          { status: 400 }
        )
      }
    }

    // Crear preferencia en Mercado Pago
    const preference = await createPaymentPreference({
      items,
      customerEmail,
    })

    return NextResponse.json({
      success: true,
      preferenceId: preference.preferenceId,
      initPoint: preference.initPoint,
    })
  } catch (error) {
    console.error('Error in create-preference:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create payment preference' 
      },
      { status: 500 }
    )
  }
}

