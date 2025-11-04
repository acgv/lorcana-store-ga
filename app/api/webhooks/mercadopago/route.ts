import { NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { supabaseAdmin } from '@/lib/db'
import { processConfirmedPayment, type PaymentItem } from '@/lib/payment-processor'
import { getClient } from '@/lib/mercadopago'

/**
 * Webhook de Mercado Pago
 * 
 * Recibe notificaciones cuando un pago cambia de estado
 * Documentación: https://www.mercadopago.com.cl/developers/es/docs/checkout-pro/configure-notifications
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    console.log('📬 Webhook Mercado Pago recibido:', JSON.stringify(body, null, 2))
    console.log('🔍 Request headers:', Object.fromEntries(request.headers.entries()))

    // Mercado Pago envía diferentes tipos de notificaciones
    const { type, action, data } = body

    // Solo procesar notificaciones de pago
    if (type === 'payment' || action === 'payment.created' || action === 'payment.updated') {
      const paymentId = data?.id

      if (!paymentId) {
        console.log('⚠️ No payment ID in webhook')
        return NextResponse.json({ success: true, message: 'No payment ID' })
      }

      console.log(`💳 Consultando detalles del pago: ${paymentId}`)

      // Obtener detalles completos del pago desde Mercado Pago
      try {
        // Usar el sistema dual de credenciales (test/prod)
        const client = getClient()
        
        if (!client) {
          console.error('❌ Mercado Pago client not configured')
          return NextResponse.json({ success: false, error: 'Not configured' }, { status: 200 })
        }

        const paymentClient = new Payment(client)
        
        const payment = await paymentClient.get({ id: paymentId })

        console.log(`📊 Payment status: ${payment.status}`)
        console.log(`💰 Amount: $${payment.transaction_amount} CLP`)
        console.log(`📧 Email: ${payment.payer?.email}`)

        // Solo procesar si el pago está aprobado
        if (payment.status === 'approved') {
          console.log('✅ Payment approved, processing...')
          
          // Parsear items desde external_reference o metadata
          // Por ahora, loguear para ver qué datos vienen
          const externalRef = payment.external_reference || 'unknown'
          const items = payment.additional_info?.items || []
          
          // Convertir items de Mercado Pago a nuestro formato
          const paymentItems: PaymentItem[] = items.map((item: any) => ({
            id: item.id || 'unknown',
            name: item.title || 'Unknown',
            quantity: item.quantity || 1,
            version: item.title?.includes('Foil') ? 'foil' : 'normal',
            price: item.unit_price || 0,
          }))

          if (paymentItems.length > 0) {
            const result = await processConfirmedPayment({
              paymentId: String(paymentId),
              externalReference: externalRef,
              items: paymentItems,
              customerEmail: payment.payer?.email,
              status: payment.status || 'unknown',
            })

            console.log('📦 Stock update result:', result)
          } else {
            console.log('⚠️ No items found in payment')
          }
        } else {
          console.log(`⏭️ Payment status: ${payment.status} - no action needed`)
        }
      } catch (mpError) {
        console.error('❌ Error fetching payment from Mercado Pago:', mpError)
      }
      
      // Log del evento en base de datos
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from('logs').insert({
            action: 'payment_webhook',
            details: {
              type,
              action,
              paymentId,
              timestamp: new Date().toISOString(),
            }
          })
        } catch (err) {
          console.error('Error logging webhook:', err)
        }
      }
    }

    // Mercado Pago espera un 200 OK
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    // Aún así devolver 200 para que Mercado Pago no reintente
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 200 })
  }
}

// GET para verificar que el endpoint existe
export async function GET() {
  return NextResponse.json({ 
    message: 'Mercado Pago Webhook Endpoint',
    status: 'active'
  })
}

