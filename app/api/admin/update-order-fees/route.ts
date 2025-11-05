import { NextRequest, NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { supabaseAdmin } from '@/lib/db'
import { getClient } from '@/lib/mercadopago'

/**
 * Endpoint para actualizar las órdenes existentes con datos reales de fees de Mercado Pago
 * Útil para órdenes creadas antes de agregar las columnas mp_fee_amount y net_received_amount
 * 
 * Usage: POST /api/admin/update-order-fees
 * Body: { updateAll: true } o { paymentId: "131919510493" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { updateAll, paymentId } = body

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const client = getClient()
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Mercado Pago not configured' },
        { status: 500 }
      )
    }

    const paymentClient = new Payment(client)

    let ordersToUpdate = []

    // Obtener órdenes a actualizar
    if (updateAll) {
      // Actualizar todas las órdenes que no tienen mp_fee_amount
      const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select('id, payment_id, total_amount')
        .or('mp_fee_amount.is.null,mp_fee_amount.eq.0')

      if (error) {
        throw new Error(`Error fetching orders: ${error.message}`)
      }

      ordersToUpdate = orders || []
      console.log(`📋 Found ${ordersToUpdate.length} orders to update`)
    } else if (paymentId) {
      // Actualizar solo una orden específica
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select('id, payment_id, total_amount')
        .eq('payment_id', paymentId)
        .single()

      if (error || !order) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        )
      }

      ordersToUpdate = [order]
    } else {
      return NextResponse.json(
        { success: false, error: 'Either updateAll or paymentId is required' },
        { status: 400 }
      )
    }

    const results = []

    // Actualizar cada orden
    for (const order of ordersToUpdate) {
      try {
        console.log(`🔍 Fetching payment ${order.payment_id} from Mercado Pago...`)

        // Obtener datos del pago desde MP
        const payment = await paymentClient.get({ id: order.payment_id })

        // Extraer fees reales
        const mpFeeAmount = (payment as any).fee_details?.[0]?.amount || 0
        const netReceivedAmount = payment.transaction_details?.net_received_amount || 0
        const totalPaidAmount = payment.transaction_details?.total_paid_amount || payment.transaction_amount

        console.log(`💰 Payment ${order.payment_id}:`)
        console.log(`   Total: $${totalPaidAmount}`)
        console.log(`   Fee: $${mpFeeAmount}`)
        console.log(`   Net: $${netReceivedAmount}`)

        // Actualizar orden en Supabase
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            mp_fee_amount: mpFeeAmount,
            net_received_amount: netReceivedAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)

        if (updateError) {
          console.error(`❌ Error updating order ${order.id}:`, updateError)
          results.push({
            paymentId: order.payment_id,
            success: false,
            error: updateError.message,
          })
        } else {
          console.log(`✅ Updated order ${order.id}`)
          results.push({
            paymentId: order.payment_id,
            success: true,
            mpFeeAmount,
            netReceivedAmount,
          })
        }
      } catch (error) {
        console.error(`❌ Error processing order ${order.payment_id}:`, error)
        results.push({
          paymentId: order.payment_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Updated ${successCount} orders. ${failCount} failed.`,
      results,
      summary: {
        total: ordersToUpdate.length,
        updated: successCount,
        failed: failCount,
      }
    })

  } catch (error) {
    console.error('❌ Error updating order fees:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Update Order Fees Endpoint',
    usage: 'POST with { updateAll: true } or { paymentId: "xxx" }'
  })
}

