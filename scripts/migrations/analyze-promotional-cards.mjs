#!/usr/bin/env node

/**
 * Script de análisis para revisar todas las cartas promocionales
 * y detectar posibles problemas o conflictos
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

async function analyzePromotionalCards() {
  console.log('🔍 Analizando cartas promocionales en la base de datos...\n')

  try {
    // 1. Buscar todas las cartas con imágenes promocionales
    console.log('📋 1. Buscando cartas con imágenes promocionales...\n')
    
    const { data: promoByImage, error: imageError } = await supabase
      .from('cards')
      .select('id, name, number, cardNumber, image, set')
      .or('image.ilike.%/promo%,image.ilike.%/promo2/%,image.ilike.%/promo3/%')

    if (imageError) {
      throw new Error(`Error al obtener cartas: ${imageError.message}`)
    }

    console.log(`   Encontradas ${promoByImage?.length || 0} cartas con imágenes promocionales\n`)

    // 2. Buscar cartas con ID que termine en -promo
    console.log('📋 2. Buscando cartas con ID que termine en "-promo"...\n')
    
    const { data: promoById, error: idError } = await supabase
      .from('cards')
      .select('id, name, number, cardNumber, image, set')
      .like('id', '%-promo')

    if (idError) {
      throw new Error(`Error al obtener cartas: ${idError.message}`)
    }

    console.log(`   Encontradas ${promoById?.length || 0} cartas con ID terminado en "-promo"\n`)

    // 3. Buscar cartas con cardNumber que empiece con "P"
    console.log('📋 3. Buscando cartas con cardNumber que empiece con "P"...\n')
    
    const { data: promoByCardNumber, error: cardNumError } = await supabase
      .from('cards')
      .select('id, name, number, cardNumber, image, set')
      .like('cardNumber', 'P%')

    if (cardNumError) {
      throw new Error(`Error al obtener cartas: ${cardNumError.message}`)
    }

    console.log(`   Encontradas ${promoByCardNumber?.length || 0} cartas con cardNumber que empieza con "P"\n`)

    // 4. Combinar todas las promocionales únicas
    const allPromos = new Map()
    
    ;[...(promoByImage || []), ...(promoById || []), ...(promoByCardNumber || [])].forEach(card => {
      if (!allPromos.has(card.id)) {
        allPromos.set(card.id, card)
      }
    })

    console.log(`📊 Total de cartas promocionales únicas: ${allPromos.size}\n`)

    // 5. Analizar por set
    console.log('📋 4. Análisis por set:\n')
    const bySet = {}
    allPromos.forEach(card => {
      if (!bySet[card.set]) {
        bySet[card.set] = []
      }
      bySet[card.set].push(card)
    })

    Object.entries(bySet).forEach(([set, cards]) => {
      console.log(`   ${set}: ${cards.length} cartas promocionales`)
    })
    console.log('')

    // 6. Buscar conflictos: cartas normales y promocionales con mismo número y set
    console.log('📋 5. Buscando conflictos (normal + promo con mismo número y set)...\n')
    
    const conflicts = []
    const promoNumbers = new Map()
    
    allPromos.forEach(card => {
      const key = `${card.set}-${card.number}`
      if (!promoNumbers.has(key)) {
        promoNumbers.set(key, [])
      }
      promoNumbers.get(key).push(card)
    })

    for (const [key, promoCards] of promoNumbers.entries()) {
      const [set, number] = key.split('-')
      
      // Buscar cartas normales con el mismo número y set
      const { data: normalCards } = await supabase
        .from('cards')
        .select('id, name, number, cardNumber, image, set')
        .eq('set', set)
        .eq('number', parseInt(number))
        .not('id', 'like', '%-promo')
        .not('cardNumber', 'like', 'P%')

      if (normalCards && normalCards.length > 0) {
        conflicts.push({
          set,
          number: parseInt(number),
          normal: normalCards,
          promo: promoCards
        })
      }
    }

    if (conflicts.length > 0) {
      console.log(`   ⚠️  Se encontraron ${conflicts.length} conflictos:\n`)
      conflicts.forEach(conflict => {
        console.log(`   Set: ${conflict.set}, Número: ${conflict.number}`)
        console.log(`     Normal: ${conflict.normal.map(c => c.name).join(', ')}`)
        console.log(`     Promo: ${conflict.promo.map(c => c.name).join(', ')}`)
        console.log('')
      })
    } else {
      console.log('   ✅ No se encontraron conflictos\n')
    }

    // 7. Analizar patrones de imágenes
    console.log('📋 6. Análisis de patrones de imágenes:\n')
    const imagePatterns = {
      '/promo/': 0,
      '/promo2/': 0,
      '/promo3/': 0,
      'otro': 0
    }

    allPromos.forEach(card => {
      if (card.image?.includes('/promo3/')) {
        imagePatterns['/promo3/']++
      } else if (card.image?.includes('/promo2/')) {
        imagePatterns['/promo2/']++
      } else if (card.image?.includes('/promo/')) {
        imagePatterns['/promo/']++
      } else {
        imagePatterns['otro']++
      }
    })

    Object.entries(imagePatterns).forEach(([pattern, count]) => {
      if (count > 0) {
        console.log(`   ${pattern}: ${count} cartas`)
      }
    })
    console.log('')

    // 8. Verificar consistencia de IDs y cardNumbers
    console.log('📋 7. Verificando consistencia de IDs y cardNumbers:\n')
    
    const inconsistencies = []
    allPromos.forEach(card => {
      const hasPromoId = card.id.endsWith('-promo')
      const hasPromoCardNumber = card.cardNumber?.startsWith('P')
      const hasPromoImage = card.image?.includes('/promo')

      if (!hasPromoId && hasPromoImage) {
        inconsistencies.push({
          card,
          issue: 'Tiene imagen promocional pero ID no termina en -promo',
          id: card.id,
          cardNumber: card.cardNumber,
          image: card.image?.substring(50, 100)
        })
      }

      if (!hasPromoCardNumber && hasPromoImage) {
        inconsistencies.push({
          card,
          issue: 'Tiene imagen promocional pero cardNumber no empieza con P',
          id: card.id,
          cardNumber: card.cardNumber,
          image: card.image?.substring(50, 100)
        })
      }
    })

    if (inconsistencies.length > 0) {
      console.log(`   ⚠️  Se encontraron ${inconsistencies.length} inconsistencias:\n`)
      inconsistencies.forEach(inc => {
        console.log(`   ${inc.card.name} (${inc.card.set}, #${inc.card.number})`)
        console.log(`     Problema: ${inc.issue}`)
        console.log(`     ID: ${inc.id}`)
        console.log(`     CardNumber: ${inc.cardNumber}`)
        console.log('')
      })
    } else {
      console.log('   ✅ Todas las cartas promocionales son consistentes\n')
    }

    // 9. Resumen final
    console.log('📊 RESUMEN FINAL:\n')
    console.log(`   Total cartas promocionales: ${allPromos.size}`)
    console.log(`   Conflictos encontrados: ${conflicts.length}`)
    console.log(`   Inconsistencias encontradas: ${inconsistencies.length}`)
    console.log(`   Sets afectados: ${Object.keys(bySet).length}`)
    
    if (conflicts.length === 0 && inconsistencies.length === 0) {
      console.log('\n   ✅ Todo parece estar correcto!')
    } else {
      console.log('\n   ⚠️  Se encontraron problemas que requieren atención')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

analyzePromotionalCards().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

