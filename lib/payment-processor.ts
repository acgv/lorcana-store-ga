/**
 * Payment Processor
 * 
 * Maneja la lógica de negocio después de un pago confirmado
 */

import { supabaseAdmin } from './db'

export interface PaymentItem {
  id: string
  name: string
  quantity: number
  version: 'normal' | 'foil'
  price: number
}

export interface ProcessPaymentParams {
  paymentId: string
  externalReference: string
  items: PaymentItem[]
  customerEmail?: string
  status: string
  // Datos reales de Mercado Pago
  mpFeeAmount?: number
  netReceivedAmount?: number
  totalPaidAmount?: number
}

/**
 * Procesar pago confirmado y actualizar stock
 */
export async function processConfirmedPayment(params: ProcessPaymentParams) {
  const { 
    paymentId, 
    externalReference, 
    items, 
    customerEmail, 
    status,
    mpFeeAmount,
    netReceivedAmount,
    totalPaidAmount 
  } = params

  if (status !== 'approved') {
    console.log(`⏭️ Payment ${paymentId} not approved (${status}), skipping stock update`)
    return { success: false, reason: 'Payment not approved' }
  }

  console.log(`✅ Processing approved payment: ${paymentId}`)

  // Si no hay Supabase, solo loguear
  if (!supabaseAdmin) {
    console.log('⚠️ Supabase not configured, cannot update stock')
    return { success: false, reason: 'Database not configured' }
  }

  try {
    // Actualizar stock para cada item
    const updates = []
    
    for (const item of items) {
      const stockField = item.version === 'normal' ? 'normalStock' : 'foilStock'
      
      // Obtener stock actual
      const { data: card, error: fetchError } = await supabaseAdmin
        .from('cards')
        .select('id, name, normalStock, foilStock')
        .eq('id', item.id)
        .single()

      if (fetchError || !card) {
        console.error(`❌ Card ${item.id} not found:`, fetchError)
        updates.push({ 
          cardId: item.id, 
          success: false, 
          error: 'Card not found' 
        })
        continue
      }

      // Calcular nuevo stock
      const currentStock = item.version === 'normal' ? card.normalStock : card.foilStock
      const newStock = Math.max(0, (currentStock || 0) - item.quantity)

      // Actualizar stock
      const updateData = {
        [stockField]: newStock,
        updatedAt: new Date().toISOString(),
      }

      const { error: updateError } = await supabaseAdmin
        .from('cards')
        .update(updateData)
        .eq('id', item.id)

      if (updateError) {
        console.error(`❌ Error updating stock for ${item.id}:`, updateError)
        updates.push({ 
          cardId: item.id, 
          success: false, 
          error: updateError.message 
        })
      } else {
        console.log(`✅ Stock updated: ${item.name} (${item.version}) ${currentStock} → ${newStock}`)
        updates.push({ 
          cardId: item.id, 
          success: true, 
          oldStock: currentStock,
          newStock 
        })
      }
    }

    // Crear registro de orden en la tabla orders
    try {
      const totalAmount = totalPaidAmount || items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      
      await supabaseAdmin.from('orders').insert({
        payment_id: paymentId,
        external_reference: externalReference,
        status: 'approved',
        customer_email: customerEmail,
        items: items,
        total_amount: totalAmount,
        mp_fee_amount: mpFeeAmount || 0, // ⭐ Fee real de MP
        net_received_amount: netReceivedAmount || totalAmount, // ⭐ Monto neto real
        currency: 'CLP',
        paid_at: new Date().toISOString(),
      })
      
      console.log(`✅ Order created: ${externalReference}`)
      console.log(`   Total paid: $${totalAmount}`)
      console.log(`   MP Fee: $${mpFeeAmount || 0}`)
      console.log(`   Net received: $${netReceivedAmount || totalAmount}`)
    } catch (orderError) {
      console.error('Error creating order:', orderError)
    }

    // Crear registro en logs
    try {
      await supabaseAdmin.from('logs').insert({
        action: 'payment_confirmed',
        details: {
          paymentId,
          externalReference,
          customerEmail,
          items,
          updates,
          timestamp: new Date().toISOString(),
        }
      })
    } catch (logError) {
      console.error('Error creating payment log:', logError)
    }

    const allSuccess = updates.every(u => u.success)
    
    return {
      success: allSuccess,
      updates,
      message: allSuccess 
        ? 'Stock updated successfully and order created' 
        : 'Some items failed to update',
    }
  } catch (error) {
    console.error('Error processing payment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

