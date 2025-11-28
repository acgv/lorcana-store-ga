import { NextResponse } from 'next/server'
import { createPaymentPreference, type CardItem } from '@/lib/mercadopago'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, shipping, customerEmail, origin, userEmail } = body as {
      items: CardItem[]
      shipping?: any
      customerEmail?: string
      origin?: string
      userEmail?: string // Email del usuario autenticado (enviado desde el frontend)
    }
    
    // Extraer flags de guardado del shipping data
    const saveAddress = shipping?.saveAddress || false
    const savePhone = shipping?.savePhone || false
    const phone = shipping?.phone || undefined

    // ✅ Verificar que se proporcione el email del usuario (indica que está autenticado)
    if (!userEmail) {
      console.error('❌ No user email provided - user not authenticated')
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión para realizar una compra' },
        { status: 401 }
      )
    }

    console.log('📝 Creating payment preference with items:', items)
    console.log('📦 Shipping data:', shipping)
    console.log('🌐 Origin domain:', origin)
    console.log('👤 User:', userEmail)

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
      shipping, // Pasar datos de envío
      customerEmail,
      origin, // Pasar el dominio de origen
      saveAddress, // Pasar flag de guardar dirección
      savePhone, // Pasar flag de guardar teléfono
      phone, // Pasar teléfono
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

