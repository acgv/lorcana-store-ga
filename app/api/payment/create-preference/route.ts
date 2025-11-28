import { NextRequest, NextResponse } from 'next/server'
import { createPaymentPreference, type CardItem } from '@/lib/mercadopago'
import { verifySupabaseSession } from '@/lib/auth-helpers'
import { rateLimitApi, RateLimitPresets } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitApi(request, RateLimitPresets.api)
    if (!rateLimitResult.success) {
      return rateLimitResult.response
    }

    // ✅ VALIDACIÓN DE SEGURIDAD: Verificar sesión real de Supabase
    const auth = await verifySupabaseSession(request)
    
    if (!auth.success) {
      console.error('❌ Authentication failed:', auth.error)
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión para realizar una compra' },
        { status: auth.status }
      )
    }

    const body = await request.json()
    const { items, shipping, customerEmail, origin } = body as {
      items: CardItem[]
      shipping?: any
      customerEmail?: string
      origin?: string
    }
    
    // Extraer flags de guardado del shipping data
    const saveAddress = shipping?.saveAddress || false
    const savePhone = shipping?.savePhone || false
    const phone = shipping?.phone || undefined

    // ✅ Usar el email del usuario autenticado (no confiar en el del body)
    const userEmail = auth.email
    const userId = auth.userId

    console.log('✅ Authenticated user:', userEmail)
    console.log('✅ User ID:', userId)

    console.log('📝 Creating payment preference with items:', items)
    console.log('📦 Shipping data:', shipping)
    console.log('🌐 Origin domain:', origin)
    console.log('👤 Authenticated user:', userEmail)

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

