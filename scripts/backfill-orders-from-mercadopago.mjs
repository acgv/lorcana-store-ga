/**
 * Backfill de órdenes desde Mercado Pago
 *
 * Objetivo:
 * - Completar en public.orders: user_id, shipping_method, shipping_cost, shipping_address, shipping_phone
 * - Para órdenes antiguas donde no se guardó metadata en BD
 *
 * Requisitos (env):
 * - SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE (o SUPABASE_SERVICE_ROLE_KEY)
 * - MERCADOPAGO_MODE: "test" | "production" (default: production)
 * - MERCADOPAGO_ACCESS_TOKEN_TEST / MERCADOPAGO_ACCESS_TOKEN_PROD
 *
 * Uso:
 *  DRY_RUN=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... MERCADOPAGO_ACCESS_TOKEN_PROD=... node scripts/backfill-orders-from-mercadopago.mjs
 */

import { createClient } from "@supabase/supabase-js"
import { MercadoPagoConfig, Payment } from "mercadopago"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

const mode = process.env.MERCADOPAGO_MODE || "production"
const isTestMode = mode === "test"
const mpAccessToken = isTestMode
  ? process.env.MERCADOPAGO_ACCESS_TOKEN_TEST
  : process.env.MERCADOPAGO_ACCESS_TOKEN_PROD

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true"
const LIMIT = Number(process.env.LIMIT || 200)
const INSPECT_PAYMENT_ID = process.env.INSPECT_PAYMENT_ID || null

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

if (!mpAccessToken) {
  console.error("❌ Missing Mercado Pago access token env variable")
  console.error(
    isTestMode
      ? "   Expected MERCADOPAGO_ACCESS_TOKEN_TEST"
      : "   Expected MERCADOPAGO_ACCESS_TOKEN_PROD"
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

const mpClient = new MercadoPagoConfig({
  accessToken: mpAccessToken,
  options: { timeout: 8000 },
})
const paymentClient = new Payment(mpClient)

function parseMaybeJson(value) {
  if (!value) return null
  if (typeof value === "object") return value
  if (typeof value === "string") {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return null
}

async function getUserIdByEmail(email) {
  if (!email) return null
  try {
    // Buscar por email en auth.users vía Admin API (service role)
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) return null
    const user = data?.users?.find((u) => (u.email || "").toLowerCase() === String(email).toLowerCase())
    return user?.id || null
  } catch {
    return null
  }
}

async function main() {
  console.log(`🔧 Backfill orders from Mercado Pago (${mode})`)
  console.log(`🧪 DRY_RUN=${DRY_RUN ? "ON" : "OFF"}`)
  console.log(`📦 LIMIT=${LIMIT}`)

  // Modo inspección: imprimir payload de un pago específico (sin escribir en BD)
  if (INSPECT_PAYMENT_ID) {
    console.log(`\n🔎 INSPECT_PAYMENT_ID=${INSPECT_PAYMENT_ID}\n`)
    try {
      const payment = await paymentClient.get({ id: String(INSPECT_PAYMENT_ID) })
      if (!payment || !payment.id) {
        console.error("❌ Payment not found")
        return
      }

      const out = {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        transaction_amount: payment.transaction_amount,
        currency_id: payment.currency_id,
        date_created: payment.date_created,
        date_approved: payment.date_approved,
        external_reference: payment.external_reference,
        payer: payment.payer,
        // Algunos flujos incluyen identificación aquí
        identification: payment.payer?.identification || payment.identification || null,
        // Telefono a veces viene en payer.phone
        payer_phone: payment.payer?.phone || null,
        additional_info: payment.additional_info || null,
        metadata: payment.metadata || null,
        shipping: payment.shipping || null,
      }

      console.log(JSON.stringify(out, null, 2))
    } catch (err) {
      console.error("❌ Inspect error:", err?.message || err)
    }
    return
  }

  // Traer órdenes que necesiten backfill
  // - user_id NULL OR shipping_address NULL OR shipping_method NULL (cualquiera de esas)
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id,payment_id,customer_email,user_id,shipping_method,shipping_cost,shipping_address,shipping_phone,created_at")
    .or("user_id.is.null,shipping_address.is.null,shipping_method.is.null,shipping_phone.is.null")
    .order("created_at", { ascending: false })
    .limit(LIMIT)

  if (error) {
    console.error("❌ Error fetching orders:", error.message)
    process.exit(1)
  }

  if (!orders || orders.length === 0) {
    console.log("✅ No orders need backfill.")
    return
  }

  console.log(`🧾 Found ${orders.length} orders needing backfill.`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const o of orders) {
    const paymentId = o.payment_id
    if (!paymentId) {
      skipped++
      continue
    }

    try {
      const payment = await paymentClient.get({ id: String(paymentId) })
      if (!payment || !payment.id) {
        console.warn(`⚠️ Payment not found in MP: ${paymentId}`)
        skipped++
        continue
      }

      const metadata = payment.metadata || {}

      // Shipping info desde metadata
      const shipping_method = metadata.shipping_method || null
      const shipping_cost = metadata.shipping_cost !== undefined ? Number(metadata.shipping_cost) : null
      const shipping_phone = metadata.phone ? String(metadata.phone) : null
      const shipping_address = parseMaybeJson(metadata.shipping_address)

      // user_id ideal: viene en metadata.user_id en compras nuevas; en antiguas puede faltar
      const metaUserId = metadata.user_id ? String(metadata.user_id) : null

      // Email: preferimos el customer_email ya guardado; como fallback MP payer email
      const emailForMatch = o.customer_email || payment.payer?.email || null
      const matchedUserId = metaUserId || (await getUserIdByEmail(emailForMatch))

      const updates = {}

      // Solo completar campos vacíos (no pisar data existente)
      if (!o.user_id && matchedUserId) updates.user_id = matchedUserId
      if (!o.shipping_method && shipping_method) updates.shipping_method = shipping_method
      if ((o.shipping_cost === null || o.shipping_cost === undefined) && shipping_cost !== null && !Number.isNaN(shipping_cost)) {
        updates.shipping_cost = shipping_cost
      }
      if (!o.shipping_phone && shipping_phone) updates.shipping_phone = shipping_phone
      if (!o.shipping_address && shipping_address) updates.shipping_address = shipping_address

      if (Object.keys(updates).length === 0) {
        skipped++
        continue
      }

      if (DRY_RUN) {
        console.log(`🧪 DRY_RUN update order ${o.id} (payment ${paymentId}):`, updates)
        updated++
        continue
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", o.id)

      if (updateError) {
        console.error(`❌ Failed updating order ${o.id}:`, updateError.message)
        failed++
      } else {
        updated++
        console.log(`✅ Updated order ${o.id} (payment ${paymentId})`)
      }
    } catch (err) {
      console.error(`❌ Error processing payment ${paymentId}:`, err?.message || err)
      failed++
    }
  }

  console.log("\n" + "=".repeat(60))
  console.log("📋 RESUMEN")
  console.log("=".repeat(60))
  console.log(`✅ Updated: ${updated}`)
  console.log(`⏭️ Skipped: ${skipped}`)
  console.log(`❌ Failed:  ${failed}`)
  console.log("")
}

main().catch((e) => {
  console.error("❌ Fatal:", e)
  process.exit(1)
})

