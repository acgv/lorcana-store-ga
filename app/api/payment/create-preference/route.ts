import { NextResponse } from 'next/server'
import { createPaymentPreference, type CardItem } from '@/lib/mercadopago'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, customerEmail } = body as {
      items: CardItem[]
      customerEmail?: string
    }

    console.log('📝 Creating payment preference with items:', items)

    // Validar items
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ No items provided')
      return NextResponse.json(
        { success: false, error: 'Items are required' },
        { status: 400 }
      )
    }

    // Validar que todos los items tengan los campos necesarios
    for (const item of items) {
      if (!item.id || !item.name || !item.price || !item.quantity) {
        console.error('❌ Invalid item data:', item)
        return NextResponse.json(
          { success: false, error: 'Invalid item data', details: item },
          { status: 400 }
        )
      }
    }

    console.log('✅ Items validated, creating preference...')

    // Crear preferencia en Mercado Pago
    const preference = await createPaymentPreference({
      items,
      customerEmail,
    })

    console.log('✅ Preference created:', preference.preferenceId)

    return NextResponse.json({
      success: true,
      preferenceId: preference.preferenceId,
      initPoint: preference.initPoint,
    })
  } catch (error) {
    console.error('❌ Error in create-preference:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create payment preference',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}

