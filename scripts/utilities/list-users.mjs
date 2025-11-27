#!/usr/bin/env node

/**
 * Script para listar usuarios y sus IDs
 * Uso: node scripts/utilities/list-users.mjs
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar variables de entorno manualmente
function loadEnv() {
  try {
    const envPath = resolve(__dirname, "../../.env.local")
    const envFile = readFileSync(envPath, "utf-8")
    const envVars = {}
    
    envFile.split("\n").forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=")
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "")
          envVars[key.trim()] = value.trim()
        }
      }
    })
    
    Object.assign(process.env, envVars)
  } catch (error) {
    console.warn("⚠️  Could not load .env.local, using process.env")
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  console.log("🔍 Fetching users from auth.users...\n")

  try {
    // Obtener usuarios desde auth.users usando Admin API
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error("❌ Error fetching users:", error)
      process.exit(1)
    }

    if (!users || users.length === 0) {
      console.log("⚠️  No users found")
      process.exit(0)
    }

    console.log(`✅ Found ${users.length} users:\n`)
    console.log("=".repeat(80))

    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User:`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email || "N/A"}`)
      console.log(`   Created: ${user.created_at}`)
      if (user.user_metadata) {
        console.log(`   Name: ${user.user_metadata.name || user.user_metadata.full_name || "N/A"}`)
      }
    })

    console.log("\n" + "=".repeat(80))
    console.log("\n💡 To check a user's collection, run:")
    console.log(`   node scripts/utilities/check-collection-ids.mjs <userId>`)
    console.log(`\n   Example:`)
    if (users.length > 0) {
      console.log(`   node scripts/utilities/check-collection-ids.mjs ${users[0].id}`)
    }

  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

main()

