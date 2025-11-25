#!/usr/bin/env node

/**
 * Script para eliminar todas las cartas promocionales del Set 8 (reignOfJafar)
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

async function removeSet8Promos() {
  console.log('🔍 Buscando cartas promocionales del Set 8 (reignOfJafar)...\n')

  try {
    // Obtener todas las cartas promocionales del Set 8
    const { data: cards, error: fetchError } = await supabase
      .from('cards')
      .select('id, name, number, cardNumber')
      .eq('set', 'reignOfJafar')
      .or('id.like.%-promo,cardNumber.like.P%,image.ilike.%/promo%')

    if (fetchError) {
      throw new Error(`Error al obtener cartas: ${fetchError.message}`)
    }

    if (!cards || cards.length === 0) {
      console.log('✅ No hay cartas promocionales en el Set 8')
      return
    }

    console.log(`📋 Se encontraron ${cards.length} cartas promocionales para eliminar:\n`)
    cards.forEach(card => {
      console.log(`  - ${card.name} (Número ${card.number}, ID: ${card.id})`)
    })

    // Eliminar referencias en user_collections primero
    const cardIds = cards.map(c => c.id)
    console.log('\n🔄 Eliminando referencias en user_collections...')
    
    const { error: deleteCollectionsError } = await supabase
      .from('user_collections')
      .delete()
      .in('card_id', cardIds)

    if (deleteCollectionsError) {
      console.warn(`  ⚠️  Error eliminando referencias: ${deleteCollectionsError.message}`)
    } else {
      console.log(`  ✅ Referencias eliminadas`)
    }

    // Eliminar las cartas
    console.log('\n🔄 Eliminando cartas...\n')

    let deleted = 0
    let errors = 0

    for (const card of cards) {
      try {
        const { error: deleteError } = await supabase
          .from('cards')
          .delete()
          .eq('id', card.id)

        if (deleteError) {
          console.error(`  ❌ Error eliminando ${card.id}: ${deleteError.message}`)
          errors++
        } else {
          deleted++
          console.log(`  ✅ Eliminada: ${card.name}`)
        }
      } catch (error) {
        console.error(`  ❌ Error procesando ${card.id}:`, error.message)
        errors++
      }
    }

    console.log(`\n✅ Proceso completado:`)
    console.log(`   - Eliminadas: ${deleted}`)
    console.log(`   - Errores: ${errors}`)

    // Verificar estado final
    const { data: remaining } = await supabase
      .from('cards')
      .select('id, name, number')
      .eq('set', 'reignOfJafar')
      .or('id.like.%-promo,cardNumber.like.P%,image.ilike.%/promo%')

    if (remaining && remaining.length > 0) {
      console.log(`\n⚠️  Aún quedan ${remaining.length} cartas promocionales:`)
      remaining.forEach(c => console.log(`  - ${c.name} (${c.id})`))
    } else {
      console.log(`\n✅ Todas las cartas promocionales del Set 8 fueron eliminadas correctamente`)
    }

    // Mostrar resumen del Set 8
    const { data: set8Cards } = await supabase
      .from('cards')
      .select('id')
      .eq('set', 'reignOfJafar')
      .not('id', 'like', '%-promo')
      .not('cardNumber', 'like', 'P%')

    console.log(`\n📊 Set 8 (reignOfJafar) ahora tiene ${set8Cards?.length || 0} cartas normales`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

removeSet8Promos().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

