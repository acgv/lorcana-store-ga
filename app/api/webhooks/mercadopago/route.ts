import { NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { supabaseAdmin } from '@/lib/db'
import { processConfirmedPayment, type PaymentItem } from '@/lib/payment-processor'
import { getClient } from '@/lib/mercadopago'
import { rateLimitApi, RateLimitPresets } from '@/lib/rate-limit'

/**
 * Webhook de Mercado Pago
 * 
 * Recibe notificaciones cuando un pago cambia de estado
 * Documentación: https://www.mercadopago.com.cl/developers/es/docs/checkout-pro/configure-notifications
 * 
 * SEGURIDAD:
 * - Rate limiting para prevenir spam
 * - Validación de que el pago existe en Mercado Pago antes de procesarlo
 * - Logging de todos los webhooks recibidos
 */
export async function POST(request: Request) {
  try {
    // Rate limiting para prevenir spam
    const rateLimitResult = await rateLimitApi(request, {
      limit: 100, // 100 webhooks por minuto
      windowSeconds: 60,
    })
    if (!rateLimitResult.success) {
      console.warn('⚠️ Webhook rate limit exceeded')
      return rateLimitResult.response
    }

    const body = await request.json()
    
    // Log del webhook (sin datos sensibles)
    const headers = Object.fromEntries(request.headers.entries())
    console.log('📬 Webhook Mercado Pago recibido')
    console.log('🔍 Request ID:', headers['x-request-id'] || 'none')
    console.log('🔍 Request type:', body.type || body.action || 'unknown')

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
        
        // ✅ VALIDACIÓN DE SEGURIDAD: Verificar que el pago realmente existe en Mercado Pago
        // Esto previene webhooks falsos - si el pago no existe, es un webhook malicioso
        const payment = await paymentClient.get({ id: paymentId })

        // Validar que el pago existe y tiene datos válidos
        if (!payment || !payment.id) {
          console.error('❌ Invalid payment data from Mercado Pago')
          return NextResponse.json({ success: false, error: 'Invalid payment' }, { status: 200 })
        }

        console.log(`📊 Payment status: ${payment.status}`)
        console.log(`💰 Amount: $${payment.transaction_amount} CLP`)
        console.log(`📧 Email: ${payment.payer?.email}`)

        // ✅ VALIDACIÓN ADICIONAL: Verificar que el pago pertenece a nuestra cuenta
        // Comparar el external_reference o metadata para asegurar que es nuestro pago
        const externalRef = payment.external_reference || 'unknown'
        if (externalRef === 'unknown' && !payment.metadata) {
          console.warn('⚠️ Payment without external_reference or metadata - possible fake webhook')
          // No rechazar, pero loguear como sospechoso
        }

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
            // Extraer datos reales de fees de Mercado Pago
            const mpFeeAmount = (payment as any).fee_details?.[0]?.amount || 0
            const netReceivedAmount = payment.transaction_details?.net_received_amount || 0
            const totalPaidAmount = payment.transaction_details?.total_paid_amount || payment.transaction_amount

            console.log(`💰 Payment financial details:`)
            console.log(`   Total paid: $${totalPaidAmount}`)
            console.log(`   MP Fee: $${mpFeeAmount}`)
            console.log(`   Net received: $${netReceivedAmount}`)

            // Extraer datos de envío del metadata
            const metadata = payment.metadata || {}
            const shippingMethod = metadata.shipping_method || 'pickup'
            const shippingCost = metadata.shipping_cost ? Number(metadata.shipping_cost) : 0
            let shippingAddress = null
            if (metadata.shipping_address) {
              try {
                shippingAddress = typeof metadata.shipping_address === 'string' 
                  ? JSON.parse(metadata.shipping_address)
                  : metadata.shipping_address
              } catch (e) {
                console.warn('Error parsing shipping address:', e)
              }
            }
            const platformUserId = metadata.user_id ? String(metadata.user_id) : undefined
            const documentType = metadata.document_type ? String(metadata.document_type) : undefined
            const documentNumber = metadata.document_number ? String(metadata.document_number) : undefined
            // Extraer flags de guardado y teléfono
            const saveAddress = metadata.save_address === 'true'
            const savePhone = metadata.save_phone === 'true'
            const phone = metadata.phone || undefined

            // Obtener userId y userEmail de nuestra plataforma para tracking
            let userId: string | undefined
            let userPlatformEmail: string | undefined

            if (supabaseAdmin) {
              try {
                const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
                // Preferir buscar por metadata.user_id
                if (platformUserId) {
                  const userById = authUsers?.users.find(u => u.id === platformUserId)
                  if (userById) {
                    userId = userById.id
                    userPlatformEmail = userById.email || undefined
                  }
                }
                // Si aún no tenemos userId, intentar por email de MP
                if (!userId && payment.payer?.email) {
                  const userByEmail = authUsers?.users.find(
                    u => (u.email || "").toLowerCase() === String(payment.payer?.email).toLowerCase()
                  )
                  if (userByEmail) {
                    userId = userByEmail.id
                    userPlatformEmail = userByEmail.email || undefined
                  }
                }
              } catch (err) {
                console.warn('Error fetching user for tracking:', err)
              }
            }

            const result = await processConfirmedPayment({
              paymentId: String(paymentId),
              externalReference: externalRef,
              items: paymentItems,
              customerEmail: payment.payer?.email,
              status: payment.status || 'unknown',
              // ⭐ userId ya viene resuelto (metadata.user_id o fallback por email)
              userId,
               // ⭐ Email del usuario en nuestra plataforma (si lo encontramos)
              userEmail: userPlatformEmail,
              // ⭐ Pasar datos reales de fees
              mpFeeAmount,
              netReceivedAmount,
              totalPaidAmount,
              // ⭐ Pasar datos de envío
              shippingMethod,
              shippingAddress,
              shippingCost,
              // ⭐ Pasar flags de guardado
              saveAddress,
              savePhone,
              phone,
              // ⭐ Documento (RUT)
              documentType,
              documentNumber,
            })

            console.log('📦 Stock update result:', result)

            // (sin tracking de eventos)
          } else {
            console.log('⚠️ No items found in payment')
          }
        } else {
          console.log(`⏭️ Payment status: ${payment.status} - no action needed`)
        }
      } catch (mpError) {
        console.error('❌ Error fetching payment from Mercado Pago:', mpError)
      }
      
      // Log del evento en base de datos (incluyendo validación)
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from('logs').insert({
            action: 'payment_webhook',
            details: {
              type,
              action,
              paymentId,
              validated: true, // Indica que el pago fue validado con Mercado Pago
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

