/**
 * Payment Processor
 * 
 * Maneja la lógica de negocio después de un pago confirmado
 */

import { supabaseAdmin } from './db'
import { sendOrderConfirmationEmail, sendAdminNotificationEmail } from './email'
import { getSetInfo } from "./lorcana-sets"

export interface PaymentItem {
  id: string
  name: string
  quantity: number
  version: 'normal' | 'foil'
  price: number
  // Metadata extra para fulfillment/envíos
  set?: string | null
  setNumber?: number | null
  setName?: string | null
  cardNumber?: string | null // "18/204"
  number?: number | null // 18
  language?: string | null
}

export interface ProcessPaymentParams {
  paymentId: string
  externalReference: string
  items: PaymentItem[]
  customerEmail?: string
  status: string
  // user_id real del usuario autenticado (si se conoce)
  userId?: string
  // Email del usuario en nuestra plataforma (si se conoce)
  userEmail?: string
  // Documento para despacho/boleta
  documentType?: string
  documentNumber?: string
  // Datos reales de Mercado Pago
  mpFeeAmount?: number
  netReceivedAmount?: number
  totalPaidAmount?: number
  // Datos de envío
  shippingMethod?: string
  shippingAddress?: any
  shippingCost?: number
  // Flags para guardar datos del usuario
  saveAddress?: boolean
  savePhone?: boolean
  phone?: string
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
    userId,
    userEmail,
    documentType,
    documentNumber,
    mpFeeAmount,
    netReceivedAmount,
    totalPaidAmount,
    shippingMethod,
    shippingAddress,
    shippingCost
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
    // Enriquecer items con metadata real de la tabla cards (set, número, etc.)
    const uniqueIds = Array.from(new Set(items.map(i => i.id).filter(Boolean)))
    const cardMetaById = new Map<string, any>()
    if (uniqueIds.length > 0) {
      const { data: metaRows, error: metaError } = await supabaseAdmin
        .from("cards")
        .select("id,set,number,cardNumber,language")
        .in("id", uniqueIds)

      if (metaError) {
        console.warn("⚠️ Could not fetch card metadata for order items:", metaError.message)
      } else {
        ;(metaRows || []).forEach((row: any) => cardMetaById.set(String(row.id), row))
      }
    }

    const enrichedItems: PaymentItem[] = items.map((item) => {
      const meta = cardMetaById.get(String(item.id))
      const setSlug = meta?.set ?? null
      const setInfo = getSetInfo(setSlug)
      return {
        ...item,
        set: setSlug,
        setNumber: setInfo?.setNumber ?? null,
        setName: setInfo?.displayName ?? (setSlug ? String(setSlug) : null),
        number: typeof meta?.number === "number" ? meta.number : (meta?.number ? Number(meta.number) : null),
        cardNumber: meta?.cardNumber ?? null,
        language: meta?.language ?? null,
      }
    })

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
      const totalAmount = totalPaidAmount || enrichedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

      const baseOrder = {
        payment_id: paymentId,
        external_reference: externalReference,
        status: 'approved',
        customer_email: customerEmail,
        user_email: userEmail || null,
        items: items,
        total_amount: totalAmount,
        mp_fee_amount: mpFeeAmount || 0, // ⭐ Fee real de MP
        net_received_amount: netReceivedAmount || totalAmount, // ⭐ Monto neto real
        currency: 'CLP',
        paid_at: new Date().toISOString(),
      }

      // Preferir guardar items enriquecidos (con set/número) para fulfillment.
      const orderWithEnrichedItems = {
        ...baseOrder,
        items: enrichedItems,
        user_id: userId || null,
        buyer_document_type: documentType || null,
        buyer_document_number: documentNumber || null,
        // Datos de envío (si tu tabla orders tiene estas columnas; si no, hacemos fallback)
        shipping_method: shippingMethod || null,
        shipping_address: shippingAddress || null,
        shipping_cost: shippingCost || 0,
        shipping_phone: params.phone || null,
      } as any

      const { error: insertError } = await supabaseAdmin.from("orders").insert(orderWithEnrichedItems)

      if (insertError) {
        // Fallback si la tabla no tiene columnas nuevas (shipping_*)
        const message = insertError.message || ""
        const looksLikeMissingColumn =
          message.includes("shipping_method") ||
          message.includes("shipping_address") ||
          message.includes("shipping_cost") ||
          message.includes("shipping_phone") ||
          message.includes("buyer_document_type") ||
          message.includes("buyer_document_number") ||
          message.includes("user_id")

        if (looksLikeMissingColumn) {
          console.warn("⚠️ Orders table missing shipping columns. Inserting without them.")
          await supabaseAdmin.from("orders").insert({
            ...baseOrder,
            items: enrichedItems,
            user_id: userId || null,
            buyer_document_type: documentType || null,
            buyer_document_number: documentNumber || null,
          })
        } else {
          throw insertError
        }
      }
      
      console.log(`✅ Order created: ${externalReference}`)
      console.log(`   Total paid: $${totalAmount}`)
      console.log(`   MP Fee: $${mpFeeAmount || 0}`)
      console.log(`   Net received: $${netReceivedAmount || totalAmount}`)

      // Guardar dirección y teléfono si el usuario lo solicitó
      if (customerEmail && (params.saveAddress || params.savePhone)) {
        try {
          // Obtener userId del email
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
          const user = authUsers?.users.find(u => u.email === customerEmail)
          
          if (user?.id) {
            // Guardar dirección si está marcado
            if (params.saveAddress && shippingAddress && shippingMethod === 'shipping') {
              try {
                // Verificar si ya existe una dirección similar
                const { data: existingAddresses } = await supabaseAdmin
                  .from('user_addresses')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('street', shippingAddress.street || '')
                  .eq('number', shippingAddress.number || '')
                  .eq('commune', shippingAddress.commune || '')

                if (!existingAddresses || existingAddresses.length === 0) {
                  // Verificar límite de direcciones
                  const { count } = await supabaseAdmin
                    .from('user_addresses')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)

                  if (count && count < 5) {
                    await supabaseAdmin.from('user_addresses').insert({
                      user_id: user.id,
                      alias: 'Dirección de compra',
                      street: shippingAddress.street || '',
                      number: shippingAddress.number || '',
                      commune: shippingAddress.commune || '',
                      city: shippingAddress.city || '',
                      region: shippingAddress.region || '',
                      postal_code: shippingAddress.postalCode || null,
                      additional_info: shippingAddress.notes || null,
                      is_default: count === 0, // Primera dirección es predeterminada
                    })
                    console.log(`✅ Address saved for user ${user.id}`)
                  }
                }
              } catch (addrError) {
                console.error('Error saving address:', addrError)
              }
            }

            // Guardar teléfono si está marcado
            if (params.savePhone && params.phone) {
              try {
                // Validar formato de teléfono
                const phoneRegex = /^\+56\s?9\s?\d{4}\s?\d{4}$/
                if (phoneRegex.test(params.phone.replace(/\s+/g, " "))) {
                  // Verificar si ya existe este teléfono
                  const { data: existingPhones } = await supabaseAdmin
                    .from('user_phones')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('phone_number', params.phone.trim())

                  if (!existingPhones || existingPhones.length === 0) {
                    // Verificar límite de teléfonos
                    const { count } = await supabaseAdmin
                      .from('user_phones')
                      .select('*', { count: 'exact', head: true })
                      .eq('user_id', user.id)

                    if (count && count < 5) {
                      await supabaseAdmin.from('user_phones').insert({
                        user_id: user.id,
                        phone_number: params.phone.trim(),
                        phone_type: 'mobile',
                        country_code: '+56',
                        is_default: count === 0, // Primer teléfono es predeterminado
                      })
                      console.log(`✅ Phone saved for user ${user.id}`)
                    }
                  }
                }
              } catch (phoneError) {
                console.error('Error saving phone:', phoneError)
              }
            }
          }
        } catch (userDataError) {
          console.error('Error saving user data:', userDataError)
          // No fallar el proceso si falla guardar datos del usuario
        }
      }

      // Enviar correos de confirmación
      if (customerEmail) {
        try {
          // Correo al cliente
          await sendOrderConfirmationEmail({
            orderId: externalReference,
            paymentId,
            customerEmail,
            items: enrichedItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              version: item.version,
              price: item.price,
            })),
            totalAmount,
            shippingMethod,
            shippingAddress,
            shippingCost,
          })

          // Correo al administrador
          await sendAdminNotificationEmail({
            orderId: externalReference,
            paymentId,
            customerEmail,
            items: enrichedItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              version: item.version,
              price: item.price,
            })),
            totalAmount,
            shippingMethod,
            shippingAddress,
            shippingCost,
          })
        } catch (emailError) {
          console.error('Error sending confirmation emails:', emailError)
          // No fallar el proceso si el correo falla
        }
      }
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

