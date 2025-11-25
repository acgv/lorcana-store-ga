#!/usr/bin/env node

/**
 * Script para validar las cartas de Lorcana en la base de datos
 * Compara con la API de Lorcana y detecta cartas faltantes (excluyendo promocionales)
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapeo de sets
const setMap = {
  'The First Chapter': 'firstChapter',
  'Rise of the Floodborn': 'riseOfFloodborn',
  'Into the Inklands': 'intoInklands',
  "Ursula's Return": 'ursulaReturn',
  'Shimmering Skies': 'shimmering',
  'Azurite Sea': 'azurite',
  "Archazia's Island": 'archazia',
  'Reign of Jafar': 'reignOfJafar',
  'Fabled': 'fabled',
}

// Detectar si es promocional
function isPromotional(lorcanaCard) {
  if (!lorcanaCard.Image) return false
  return (
    lorcanaCard.Image.includes('/promo') ||
    lorcanaCard.Image.includes('/promo2/') ||
    lorcanaCard.Image.includes('/promo3/')
  )
}

// Generar ID esperado
function getExpectedId(lorcanaCard) {
  return `${lorcanaCard.Set_ID}-${lorcanaCard.Card_Num}`.toLowerCase()
}

async function validateLorcanaCards() {
  console.log('🔍 Validando cartas de Lorcana...\n')

  try {
    // 1. Obtener todas las cartas de la API de Lorcana
    console.log('📡 Obteniendo cartas de la API de Lorcana...')
    const response = await fetch('https://api.lorcana-api.com/cards/all')
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const lorcanaCards = await response.json()
    console.log(`✅ Obtenidas ${lorcanaCards.length} cartas de la API\n`)

    // 2. Filtrar promocionales
    const normalCards = lorcanaCards.filter(card => !isPromotional(card))
    console.log(`📋 Cartas normales (sin promos): ${normalCards.length}`)
    console.log(`   Promocionales filtradas: ${lorcanaCards.length - normalCards.length}\n`)

    // 3. Obtener cartas de la base de datos
    console.log('📦 Obteniendo cartas de la base de datos...')
    const { data: dbCards, error: dbError } = await supabase
      .from('cards')
      .select('id, name, number, set, cardNumber')
      .not('id', 'like', '%-promo')
      .not('cardNumber', 'like', 'P%')

    if (dbError) {
      throw new Error(`Error al obtener cartas: ${dbError.message}`)
    }

    console.log(`✅ Obtenidas ${dbCards?.length || 0} cartas de la BD\n`)

    // 4. Crear mapa de cartas en BD por ID
    const dbCardsMap = new Map()
    dbCards?.forEach(card => {
      dbCardsMap.set(card.id, card)
    })

    // 5. Analizar por set
    console.log('📊 Análisis por set:\n')
    const bySet = {}
    
    normalCards.forEach(card => {
      const set = setMap[card.Set_Name] || card.Set_ID?.toLowerCase()
      if (!set) return
      
      if (!bySet[set]) {
        bySet[set] = {
          total: 0,
          inDb: 0,
          missing: []
        }
      }
      
      bySet[set].total++
      const expectedId = getExpectedId(card)
      
      if (dbCardsMap.has(expectedId)) {
        bySet[set].inDb++
      } else {
        bySet[set].missing.push({
          id: expectedId,
          name: card.Name + (card.Title ? ` - ${card.Title}` : ''),
          number: card.Card_Num,
          set: set,
        })
      }
    })

    // 6. Mostrar resultados
    let totalMissing = 0
    let totalInDb = 0
    let totalExpected = 0

    Object.entries(bySet).forEach(([set, data]) => {
      totalExpected += data.total
      totalInDb += data.inDb
      totalMissing += data.missing.length

      const percentage = ((data.inDb / data.total) * 100).toFixed(1)
      const status = data.missing.length === 0 ? '✅' : '⚠️'
      
      console.log(`${status} ${set}:`)
      console.log(`   Total esperado: ${data.total}`)
      console.log(`   En BD: ${data.inDb} (${percentage}%)`)
      console.log(`   Faltantes: ${data.missing.length}`)
      
      if (data.missing.length > 0 && data.missing.length <= 10) {
        console.log(`   Cartas faltantes:`)
        data.missing.forEach(c => {
          console.log(`     - #${c.number}: ${c.name} (ID: ${c.id})`)
        })
      } else if (data.missing.length > 10) {
        console.log(`   Primeras 10 cartas faltantes:`)
        data.missing.slice(0, 10).forEach(c => {
          console.log(`     - #${c.number}: ${c.name} (ID: ${c.id})`)
        })
        console.log(`     ... y ${data.missing.length - 10} más`)
      }
      console.log('')
    })

    // 7. Resumen general
    console.log('📊 RESUMEN GENERAL:\n')
    console.log(`   Total cartas normales esperadas: ${totalExpected}`)
    console.log(`   Cartas en BD: ${totalInDb}`)
    console.log(`   Cartas faltantes: ${totalMissing}`)
    console.log(`   Porcentaje completo: ${((totalInDb / totalExpected) * 100).toFixed(1)}%\n`)

    if (totalMissing === 0) {
      console.log('   ✅ ¡Todas las cartas normales están en la base de datos!')
    } else {
      console.log(`   ⚠️  Se encontraron ${totalMissing} cartas faltantes`)
      console.log('   💡 Ejecuta el script de importación para cargar las cartas faltantes')
    }

    // 8. Guardar reporte de cartas faltantes
    if (totalMissing > 0) {
      const missingCards = []
      Object.values(bySet).forEach(data => {
        missingCards.push(...data.missing)
      })

      const reportPath = join(__dirname, '..', '..', 'lib', 'missing-cards-report.json')
      const { writeFileSync, mkdirSync } = await import('fs')
      const reportDir = join(__dirname, '..', '..', 'lib')
      try {
        mkdirSync(reportDir, { recursive: true })
      } catch (e) {
        // Directory already exists
      }
      writeFileSync(reportPath, JSON.stringify(missingCards, null, 2))
      console.log(`\n   📄 Reporte guardado en: ${reportPath}`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

validateLorcanaCards().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

