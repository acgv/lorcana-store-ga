import { NextResponse } from 'next/server'

/**
 * Endpoint de certificación usando FETCH directo (sin SDK)
 * Para tener control total sobre el request
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lorcana-store-ga.vercel.app'

    // Body con especificaciones exactas del desafío
    const preferenceBody = {
      items: [
        {
          id: '1234',
          title: 'Dispositivo Punto de Venta',
          description: 'Dispositivo de tienda móvil de comercio electrónico',
          picture_url: 'https://http2.mlstatic.com/resources/frontend/statics/growth-sellers-landings/device-mlb-point-i_medium@2x.png',
          category_id: 'electronics',
          quantity: 1,
          unit_price: 1500,
          currency_id: 'CLP',
        }
      ],
      back_urls: {
        success: `${baseUrl}/payment/success`,
        failure: `${baseUrl}/payment/failure`,
        pending: `${baseUrl}/payment/pending`,
      },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_methods: [{ id: 'visa' }],
        excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
        installments: 6
      },
      statement_descriptor: 'GA Company',
      external_reference: `cert-direct-${Date.now()}`,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      // INTEGRATOR ID - campo directo
      integrator_id: integratorId,
    }

    console.log('🎓 DIRECT FETCH - Sending to Mercado Pago:')
    console.log(JSON.stringify(preferenceBody, null, 2))

    // Enviar directo a MP API con fetch
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preferenceBody)
    })

    const mpData = await mpResponse.json()

    console.log('📊 MP Response Status:', mpResponse.status)
    console.log('📊 MP Response Body:', JSON.stringify(mpData, null, 2))

    if (!mpResponse.ok) {
      throw new Error(`MP API Error: ${JSON.stringify(mpData)}`)
    }

    return NextResponse.json({
      success: true,
      preferenceId: mpData.id,
      initPoint: mpData.init_point,
      sandboxInitPoint: mpData.sandbox_init_point,
      debug: {
        integratorIdSent: integratorId,
        integratorIdInResponse: mpData.integrator_id || 'NOT IN RESPONSE',
        metadataInResponse: mpData.metadata,
      }
    })
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed',
        details: String(error)
      },
      { status: 500 }
    )
  }
}

