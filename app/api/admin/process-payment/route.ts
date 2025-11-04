import { NextRequest, NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { supabaseAdmin } from '@/lib/db'
import { processConfirmedPayment, type PaymentItem } from '@/lib/payment-processor'
import { getClient } from '@/lib/mercadopago'

/**
 * Endpoint temporal para procesar pagos manualmente
 * Útil cuando el webhook no se ejecutó correctamente
 * 
 * Usage: POST /api/admin/process-payment
 * Body: { paymentId: "131919510493" }
 */
export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    console.log(`🔧 MANUAL: Processing payment ${paymentId}`)

    // Usar el sistema dual de credenciales
    const client = getClient()
    
    if (!client) {
      console.error('❌ Mercado Pago client not configured')
      return NextResponse.json(
        { success: false, error: 'Mercado Pago not configured' },
        { status: 500 }
      )
    }

    const paymentClient = new Payment(client)
    
    // Obtener detalles del pago
    const payment = await paymentClient.get({ id: paymentId })

    console.log(`📊 Payment status: ${payment.status}`)
    console.log(`💰 Amount: $${payment.transaction_amount} CLP`)
    console.log(`📧 Email: ${payment.payer?.email}`)
    console.log(`📦 Items:`, payment.additional_info?.items)

    // Solo procesar si el pago está aprobado
    if (payment.status !== 'approved') {
      return NextResponse.json({
        success: false,
        error: `Payment status is ${payment.status}, not approved`,
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.transaction_amount,
        }
      })
    }

    // Parsear items
    const externalRef = payment.external_reference || 'unknown'
    const items = payment.additional_info?.items || []
    
    console.log(`🔍 External reference: ${externalRef}`)
    console.log(`🔍 Items count: ${items.length}`)

    // Convertir items de Mercado Pago a nuestro formato
    const paymentItems: PaymentItem[] = items.map((item: any) => {
      console.log(`  - Item: ${item.id} | ${item.title} | Qty: ${item.quantity} | Price: ${item.unit_price}`)
      
      return {
        id: item.id || 'unknown',
        name: item.title || 'Unknown',
        quantity: item.quantity || 1,
        version: item.title?.includes('Foil') ? 'foil' : 'normal',
        price: item.unit_price || 0,
      }
    })

    if (paymentItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No items found in payment',
        payment: {
          id: payment.id,
          status: payment.status,
          externalReference: externalRef,
        }
      })
    }

    console.log('✅ Processing payment with items:', paymentItems)

    // Procesar el pago confirmado
    const result = await processConfirmedPayment({
      paymentId: String(paymentId),
      externalReference: externalRef,
      items: paymentItems,
      customerEmail: payment.payer?.email,
      status: payment.status || 'approved',
    })

    console.log('📦 Processing result:', result)

    return NextResponse.json({
      success: true,
      message: 'Payment processed manually',
      result,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.transaction_amount,
        email: payment.payer?.email,
        items: paymentItems,
      }
    })

  } catch (error) {
    console.error('❌ Error processing payment manually:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET para verificar que el endpoint existe
export async function GET() {
  return NextResponse.json({ 
    message: 'Manual Payment Processing Endpoint',
    status: 'active',
    usage: 'POST with { paymentId: "xxx" }'
  })
}

