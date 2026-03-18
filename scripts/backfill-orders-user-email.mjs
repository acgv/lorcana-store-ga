/**
 * Backfill de user_email en public.orders
 *
 * Objetivo:
 * - Completar orders.user_email usando:
 *   1) orders.user_id -> auth.users.id
 *   2) si no hay user_id, orders.customer_email -> auth.users.email (mejor esfuerzo)
 *
 * Requisitos env:
 * - SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE (o SUPABASE_SERVICE_ROLE_KEY)
 *
 * Uso:
 *   DRY_RUN=1 LIMIT=200 node scripts/backfill-orders-user-email.mjs
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true"
const LIMIT = Number(process.env.LIMIT || 200)

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  console.log("🔧 Backfill orders.user_email from auth.users")
  console.log(`🧪 DRY_RUN=${DRY_RUN ? "ON" : "OFF"}`)
  console.log(`📦 LIMIT=${LIMIT}`)

  // 1. Cargar usuarios de auth (email + id) una sola vez
  let allUsers = []
  try {
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) {
      console.error("❌ Error fetching auth users:", error.message)
      process.exit(1)
    }
    allUsers = data?.users || []
    console.log(`👤 Loaded ${allUsers.length} auth users`)
  } catch (err) {
    console.error("❌ Error listing auth users:", err?.message || err)
    process.exit(1)
  }

  // Helpers
  const findUserById = (id) => allUsers.find((u) => u.id === id)
  const findUserByEmail = (email) =>
    allUsers.find(
      (u) => (u.email || "").toLowerCase() === String(email || "").toLowerCase()
    )

  // 2. Traer órdenes sin user_email
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id,user_id,user_email,customer_email,created_at")
    .is("user_email", null)
    .order("created_at", { ascending: false })
    .limit(LIMIT)

  if (ordersError) {
    console.error("❌ Error fetching orders:", ordersError.message)
    process.exit(1)
  }

  if (!orders || orders.length === 0) {
    console.log("✅ No orders with missing user_email")
    return
  }

  console.log(`🧾 Found ${orders.length} orders missing user_email`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const o of orders) {
    let targetEmail = null

    // 1) Si hay user_id, usamos email del usuario
    if (o.user_id) {
      const u = findUserById(o.user_id)
      if (u?.email) {
        targetEmail = u.email
      }
    }

    // 2) Si no hay user_id o no se encontró, intentamos customer_email
    if (!targetEmail && o.customer_email) {
      const u = findUserByEmail(o.customer_email)
      if (u?.email) {
        targetEmail = u.email
      }
    }

    if (!targetEmail) {
      skipped++
      continue
    }

    if (DRY_RUN) {
      console.log(
        `🧪 DRY_RUN order ${o.id} -> user_email: ${targetEmail} (user_id=${o.user_id ||
          "null"}, customer_email=${o.customer_email || "null"})`
      )
      updated++
      continue
    }

    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ user_email: targetEmail })
        .eq("id", o.id)

      if (updateError) {
        console.error(
          `❌ Failed updating order ${o.id}:`,
          updateError.message
        )
        failed++
      } else {
        updated++
        console.log(`✅ Updated order ${o.id} -> user_email=${targetEmail}`)
      }
    } catch (err) {
      console.error(`❌ Error updating order ${o.id}:`, err?.message || err)
      failed++
    }
  }

  console.log("\n" + "=".repeat(60))
  console.log("📋 RESUMEN backfill user_email")
  console.log("=".repeat(60))
  console.log(`✅ Updated: ${updated}`)
  console.log(`⏭️ Skipped (no match): ${skipped}`)
  console.log(`❌ Failed:  ${failed}`)
  console.log("")
}

main().catch((e) => {
  console.error("❌ Fatal:", e)
  process.exit(1)
})

