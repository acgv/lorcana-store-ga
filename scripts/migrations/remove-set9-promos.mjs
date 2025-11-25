#!/usr/bin/env node

/**
 * Script para eliminar todas las cartas promocionales del Set 9
 * Deja solo las cartas normales
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createInterface } from 'readline'

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

async function removeSet9Promos() {
  console.log('🔍 Buscando cartas promocionales del Set 9...\n')

  try {
    // Obtener todas las cartas promocionales del Set 9
    const { data: promoCards, error: fetchError } = await supabase
      .from('cards')
      .select('id, name, number, cardNumber, normalStock, foilStock')
      .eq('set', 'fabled')
      .or('id.like.%-promo,cardNumber.like.P%')

    if (fetchError) {
      throw new Error(`Error al obtener cartas: ${fetchError.message}`)
    }

    if (!promoCards || promoCards.length === 0) {
      console.log('✅ No hay cartas promocionales del Set 9 para eliminar')
      return
    }

    console.log(`📋 Se encontraron ${promoCards.length} cartas promocionales del Set 9:\n`)

    // Mostrar preview con stock
    promoCards.forEach(card => {
      console.log(`  ${card.id}: ${card.name}`)
      console.log(`    CardNumber: ${card.cardNumber}`)
      console.log(`    Stock: Normal=${card.normalStock || 0}, Foil=${card.foilStock || 0}\n`)
    })

    // Verificar referencias en user_collections
    const cardIds = promoCards.map(c => c.id)
    const { data: collections, error: collectionError } = await supabase
      .from('user_collections')
      .select('id, card_id')
      .in('card_id', cardIds)

    if (collectionError) {
      console.warn(`⚠️  Error al verificar referencias: ${collectionError.message}`)
    } else if (collections && collections.length > 0) {
      console.log(`⚠️  ADVERTENCIA: ${collections.length} referencias en user_collections serán eliminadas`)
      collections.forEach(c => {
        const card = promoCards.find(p => p.id === c.card_id)
        console.log(`  - ${c.card_id}: ${card?.name || 'Unknown'}`)
      })
      console.log('')
    }

    // Preguntar confirmación
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise(resolve => {
      rl.question(`⚠️  ¿Eliminar ${promoCards.length} cartas promocionales del Set 9? (s/n): `, resolve)
    })
    rl.close()

    if (answer.toLowerCase() !== 's' && answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'si' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Operación cancelada')
      return
    }

    // Eliminar referencias en user_collections primero
    if (collections && collections.length > 0) {
      console.log('\n🔄 Eliminando referencias en user_collections...')
      const { error: deleteCollectionsError } = await supabase
        .from('user_collections')
        .delete()
        .in('card_id', cardIds)

      if (deleteCollectionsError) {
        console.error(`  ❌ Error eliminando referencias: ${deleteCollectionsError.message}`)
      } else {
        console.log(`  ✅ Eliminadas ${collections.length} referencias`)
      }
    }

    // Eliminar las cartas promocionales
    console.log('\n🔄 Eliminando cartas promocionales...\n')

    const { error: deleteError } = await supabase
      .from('cards')
      .delete()
      .in('id', cardIds)

    if (deleteError) {
      throw new Error(`Error al eliminar cartas: ${deleteError.message}`)
    }

    console.log(`✅ Eliminadas ${promoCards.length} cartas promocionales del Set 9`)

    // Verificar resultado
    const { data: remainingPromos } = await supabase
      .from('cards')
      .select('id')
      .eq('set', 'fabled')
      .or('id.like.%-promo,cardNumber.like.P%')

    if (remainingPromos && remainingPromos.length > 0) {
      console.log(`\n⚠️  Aún quedan ${remainingPromos.length} cartas promocionales`)
    } else {
      console.log(`\n✅ No quedan cartas promocionales del Set 9`)
    }

    // Mostrar cartas normales restantes
    const { data: normalCards } = await supabase
      .from('cards')
      .select('id, name, number, cardNumber')
      .eq('set', 'fabled')
      .not('id', 'like', '%-promo')
      .not('cardNumber', 'like', 'P%')
      .order('number', { ascending: true })
      .limit(15)

    if (normalCards && normalCards.length > 0) {
      console.log(`\n📊 Cartas normales del Set 9 (primeras 15):`)
      normalCards.forEach(c => {
        console.log(`  ${c.number.toString().padStart(3)}: ${c.name} [${c.cardNumber}]`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

removeSet9Promos().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

