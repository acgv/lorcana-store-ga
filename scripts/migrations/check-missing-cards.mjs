#!/usr/bin/env node

/**
 * Script para verificar cartas faltantes en la base de datos
 * Compara las cartas en imported-cards.json con las que están en Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar variables de entorno
try {
  const envPath = join(__dirname, '..', '..', '.env.local')
  const envFile = readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch (error) {
  console.warn('⚠️  No se pudo cargar .env.local')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkMissingCards() {
  console.log('🔍 Verificando cartas faltantes en Set 9 (fabled)...\n')

  try {
    // 1. Cargar cartas del archivo imported-cards.json
    const importedCardsPath = join(__dirname, '..', '..', 'lib', 'imported-cards.json')
    const importedCards = JSON.parse(readFileSync(importedCardsPath, 'utf-8'))
    
    // Filtrar Set 9, excluyendo promocionales
    const set9Imported = importedCards.filter(c => 
      c.set === 'fabled' && 
      !c.image?.includes('/promo') &&
      !c.id?.endsWith('-promo')
    )

    console.log(`📦 Cartas en imported-cards.json (Set 9, sin promocionales): ${set9Imported.length}`)

    // 2. Obtener cartas de Supabase (Set 9, sin promocionales)
    const { data: set9Db, error: dbError } = await supabase
      .from('cards')
      .select('id, name, number, cardNumber, image')
      .eq('set', 'fabled')
      .eq('status', 'approved')
      .not('image', 'ilike', '%/promo%')
      .not('id', 'like', '%-promo')
      .order('number', { ascending: true })

    if (dbError) {
      throw new Error(`Error al obtener cartas de DB: ${dbError.message}`)
    }

    console.log(`💾 Cartas en Supabase (Set 9, sin promocionales): ${set9Db?.length || 0}\n`)

    // 3. Crear mapas por número
    const importedByNum = new Map()
    set9Imported.forEach(c => {
      if (!importedByNum.has(c.number)) {
        importedByNum.set(c.number, [])
      }
      importedByNum.get(c.number).push(c)
    })

    const dbByNum = new Map()
    set9Db?.forEach(c => {
      if (!dbByNum.has(c.number)) {
        dbByNum.set(c.number, [])
      }
      dbByNum.get(c.number).push(c)
    })

    // 4. Encontrar números faltantes
    const importedNumbers = Array.from(importedByNum.keys()).sort((a, b) => a - b)
    const dbNumbers = Array.from(dbByNum.keys()).sort((a, b) => a - b)

    console.log('📊 Análisis de números:\n')
    console.log(`Números en imported-cards.json: ${importedNumbers.length}`)
    console.log(`  Rango: ${importedNumbers[0]} - ${importedNumbers[importedNumbers.length - 1]}`)
    console.log(`  Primeros 20: ${importedNumbers.slice(0, 20).join(', ')}\n`)

    console.log(`Números en Supabase: ${dbNumbers.length}`)
    console.log(`  Rango: ${dbNumbers[0] || 'N/A'} - ${dbNumbers[dbNumbers.length - 1] || 'N/A'}`)
    console.log(`  Primeros 20: ${dbNumbers.slice(0, 20).join(', ')}\n`)

    // 5. Encontrar faltantes
    const missing = importedNumbers.filter(num => !dbNumbers.includes(num))
    
    if (missing.length > 0) {
      console.log(`❌ Cartas faltantes en Supabase (${missing.length}):\n`)
      
      missing.slice(0, 30).forEach(num => {
        const cards = importedByNum.get(num)
        cards?.forEach(card => {
          console.log(`  Número ${num}: ${card.name}`)
          console.log(`    ID: ${card.id}`)
          console.log(`    CardNumber: ${card.cardNumber}`)
          console.log(`    Image: ${card.image?.substring(0, 80)}...`)
          console.log('')
        })
      })

      if (missing.length > 30) {
        console.log(`  ... y ${missing.length - 30} más\n`)
      }

      console.log(`\n💡 Estas cartas están en imported-cards.json pero no en Supabase.`)
      console.log(`   Pueden haberse perdido durante la importación inicial o haber sido sobrescritas por promocionales.\n`)
    } else {
      console.log('✅ No hay cartas faltantes. Todas las cartas de imported-cards.json están en Supabase.\n')
    }

    // 6. Verificar números que están en DB pero no en imported
    const extra = dbNumbers.filter(num => !importedNumbers.includes(num))
    if (extra.length > 0) {
      console.log(`⚠️  Números en Supabase que no están en imported-cards.json (${extra.length}):`)
      extra.slice(0, 10).forEach(num => {
        const cards = dbByNum.get(num)
        cards?.forEach(card => {
          console.log(`  Número ${num}: ${card.name} (ID: ${card.id})`)
        })
      })
      console.log('')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkMissingCards().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

