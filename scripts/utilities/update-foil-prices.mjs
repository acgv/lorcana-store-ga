/**
 * Script para actualizar todos los precios foil en la base de datos
 * para que sigan el estándar según rangos de precio
 * 
 * Uso: node scripts/utilities/update-foil-prices.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar variables de entorno manualmente
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../../.env.local')
    const envFile = readFileSync(envPath, 'utf-8')
    const envVars = {}
    
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          envVars[key.trim()] = value.trim()
        }
      }
    })
    
    Object.assign(process.env, envVars)
  } catch (error) {
    console.warn('⚠️  Could not load .env.local, using process.env')
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Calcula el precio foil estándar basado en el precio normal
 * 
 * Fórmula basada en rangos de precio del mercado:
 * - Precios muy bajos (< $10): 2.0x
 * - Precios bajos ($10 - $100): 1.8x
 * - Precios medios ($100 - $500): 1.7x
 * - Precios altos ($500 - $1000): 1.6x
 * - Precios muy altos (>= $1000): 1.7x
 */
function calculateStandardFoilPrice(normalPrice) {
  if (normalPrice <= 0) {
    return 0
  }
  
  // Precios muy bajos (< $10): 2.0x
  if (normalPrice < 10) {
    return Math.round(normalPrice * 2.0)
  }
  
  // Precios bajos ($10 - $100): 1.8x
  if (normalPrice < 100) {
    return Math.round(normalPrice * 1.8)
  }
  
  // Precios medios ($100 - $500): 1.7x
  if (normalPrice < 500) {
    return Math.round(normalPrice * 1.7)
  }
  
  // Precios altos ($500 - $1000): 1.6x
  if (normalPrice < 1000) {
    return Math.round(normalPrice * 1.6)
  }
  
  // Precios muy altos (>= $1000): 1.7x
  return Math.round(normalPrice * 1.7)
}

async function updateFoilPrices(dryRun = false) {
  console.log(`\n${dryRun ? '🔍 DRY RUN - ' : ''}Actualizando precios foil según estándar...\n`)
  
  try {
    // Obtener todas las cartas con paginación
    let allCards = []
    let page = 0
    const pageSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1
      
      const { data, error, count } = await supabase
        .from('cards')
        .select('id, name, price, foilPrice', { count: 'exact' })
        .range(from, to)
      
      if (error) {
        console.error(`❌ Error obteniendo cartas (página ${page}):`, error)
        break
      }
      
      if (data && data.length > 0) {
        allCards = [...allCards, ...data]
      }
      
      hasMore = data && data.length === pageSize && (count === null || allCards.length < count)
      page++
      
      if (page >= 10) break // Safety limit
    }
    
    console.log(`📊 Total de cartas encontradas: ${allCards.length}\n`)
    
    // Analizar y actualizar precios
    let updated = 0
    let unchanged = 0
    let errors = 0
    const updates = []
    
    for (const card of allCards) {
      const normalPrice = Number(card.price) || 0
      const currentFoilPrice = Number(card.foilPrice) || 0
      const standardFoilPrice = calculateStandardFoilPrice(normalPrice)
      
      // Solo actualizar si el precio foil actual no coincide con el estándar
      if (normalPrice > 0 && currentFoilPrice !== standardFoilPrice) {
        updates.push({
          id: card.id,
          name: card.name,
          normalPrice,
          currentFoilPrice,
          standardFoilPrice,
          needsUpdate: true
        })
      } else {
        unchanged++
      }
    }
    
    console.log(`📈 Análisis:`)
    console.log(`   - Cartas que necesitan actualización: ${updates.length}`)
    console.log(`   - Cartas que ya están correctas: ${unchanged}\n`)
    
    if (updates.length === 0) {
      console.log('✅ Todas las cartas ya tienen precios foil correctos según el estándar.\n')
      return
    }
    
    // Mostrar algunos ejemplos
    console.log('📋 Ejemplos de cartas que se actualizarán:')
    updates.slice(0, 10).forEach((update, idx) => {
      console.log(`   ${idx + 1}. ${update.name}`)
      console.log(`      Normal: $${update.normalPrice} → Foil: $${update.currentFoilPrice} → $${update.standardFoilPrice}`)
    })
    if (updates.length > 10) {
      console.log(`   ... y ${updates.length - 10} más\n`)
    } else {
      console.log()
    }
    
    if (dryRun) {
      console.log('🔍 DRY RUN: No se realizaron cambios. Ejecuta sin --dry-run para aplicar los cambios.\n')
      return
    }
    
    // Actualizar en lotes
    console.log('💾 Actualizando precios foil...\n')
    const batchSize = 50
    let batch = []
    
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i]
      batch.push({
        id: update.id,
        foilPrice: update.standardFoilPrice
      })
      
      if (batch.length >= batchSize || i === updates.length - 1) {
        // Actualizar lote
        for (const item of batch) {
          const { error } = await supabase
            .from('cards')
            .update({ foilPrice: item.foilPrice })
            .eq('id', item.id)
          
          if (error) {
            console.error(`❌ Error actualizando ${item.id}:`, error.message)
            errors++
          } else {
            updated++
            if (updated % 10 === 0) {
              process.stdout.write(`\r   Progreso: ${updated}/${updates.length} actualizadas...`)
            }
          }
        }
        
        batch = []
      }
    }
    
    console.log(`\n\n✅ Actualización completada:`)
    console.log(`   - Cartas actualizadas: ${updated}`)
    console.log(`   - Cartas sin cambios: ${unchanged}`)
    console.log(`   - Errores: ${errors}\n`)
    
  } catch (error) {
    console.error('❌ Error general:', error)
    process.exit(1)
  }
}

// Ejecutar
const dryRun = process.argv.includes('--dry-run')
updateFoilPrices(dryRun)
  .then(() => {
    console.log('✅ Script completado\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })

