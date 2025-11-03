import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'

/**
 * Endpoint especial para el desafío de certificación de Mercado Pago
 * Crea una preferencia con las especificaciones exactas del desafío
 */
export async function POST(request: Request) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    const integratorId = process.env.MERCADOPAGO_INTEGRATOR_ID
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'MERCADOPAGO_ACCESS_TOKEN not configured' },
        { status: 500 }
      )
    }

    const client = new MercadoPagoConfig({ accessToken })
    const preferenceApi = new Preference(client)

    const isDev = process.env.NODE_ENV === 'development'
    const baseUrl = isDev ? 'http://localhost:3002' : (process.env.NEXT_PUBLIC_APP_URL || 'https://lorcana-store-ga.vercel.app')

    // Especificaciones EXACTAS del desafío de certificación
    const preferenceBody: any = {
      items: [
        {
          id: '1234', // 4 dígitos numéricos
          title: 'Dispositivo Punto de Venta',
          description: 'Dispositivo de tienda móvil de comercio electrónico', // EXACTO del desafío
          picture_url: 'https://http2.mlstatic.com/resources/frontend/statics/growth-sellers-landings/device-mlb-point-i_medium@2x.png',
          category_id: 'electronics',
          quantity: 1,
          unit_price: 1500, // > $1 USD en CLP
          currency_id: 'CLP',
        }
      ],
      back_urls: {
        success: `${baseUrl}/payment/success`,
        failure: `${baseUrl}/payment/failure`,
        pending: `${baseUrl}/payment/pending`,
      },
      auto_return: 'approved' as const,
      payment_methods: {
        excluded_payment_methods: [
          { id: 'visa' }
        ],
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'atm' }
        ],
        installments: 6
      },
      statement_descriptor: 'GA Company',
      external_reference: `certification-test-${Date.now()}`,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    }

    // Agregar Integrator ID
    if (integratorId) {
      preferenceBody.integrator_id = integratorId
      // También en metadata para asegurar que MP lo detecte
      preferenceBody.metadata = {
        integrator_id: integratorId
      }
    }

    console.log('🎓 CERTIFICATION TEST - Creating preference with specs:')
    console.log(JSON.stringify(preferenceBody, null, 2))
    console.log('🔍 Integrator ID being sent:', integratorId)
    console.log('🔍 Variable value:', process.env.MERCADOPAGO_INTEGRATOR_ID)

    const preference = await preferenceApi.create({
      body: preferenceBody
    })

    console.log('✅ Certification preference created:', preference.id)
    console.log('📊 Full preference response:', JSON.stringify(preference, null, 2))

    return NextResponse.json({
      success: true,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      specs: {
        itemId: '1234',
        description: 'Dispositivo de tienda móvil de comercio electrónico',
        installments: 6,
        excludedVisa: true,
        integratorId: integratorId || 'NOT SET',
      }
    })
  } catch (error) {
    console.error('❌ Error creating certification preference:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create preference',
        details: JSON.stringify(error, null, 2)
      },
      { status: 500 }
    )
  }
}

