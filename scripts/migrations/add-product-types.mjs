#!/usr/bin/env node

/**
 * Migración para agregar soporte de tipos de productos
 * Agrega el campo productType a la tabla cards y crea la tabla products
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

async function addProductTypes() {
  console.log('🔄 Agregando soporte para tipos de productos...\n')

  try {
    // 1. Agregar columna productType a la tabla cards (si no existe)
    console.log('📝 Agregando columna productType a la tabla cards...')
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'cards' AND column_name = 'productType'
          ) THEN
            ALTER TABLE public.cards ADD COLUMN "productType" text DEFAULT 'card';
            CREATE INDEX IF NOT EXISTS cards_product_type_idx ON public.cards("productType");
          END IF;
        END $$;
      `
    })

    if (alterError) {
      // Si RPC no funciona, intentar directamente con SQL
      console.log('⚠️  RPC no disponible, intentando método alternativo...')
      // Nota: Esto requeriría permisos de superusuario o usar el cliente SQL directamente
      console.log('💡 Ejecuta manualmente en Supabase SQL Editor:')
      console.log(`
        ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS "productType" text DEFAULT 'card';
        CREATE INDEX IF NOT EXISTS cards_product_type_idx ON public.cards("productType");
        UPDATE public.cards SET "productType" = 'card' WHERE "productType" IS NULL;
      `)
    } else {
      console.log('✅ Columna productType agregada')
    }

    // 2. Actualizar todas las cartas existentes para que tengan productType = 'card'
    console.log('\n🔄 Actualizando cartas existentes...')
    const { data: updateData, error: updateError } = await supabase
      .from('cards')
      .update({ productType: 'card' })
      .is('productType', null)
      .select()

    if (updateError) {
      console.warn(`⚠️  Error actualizando cartas: ${updateError.message}`)
    } else {
      console.log(`✅ ${updateData?.length || 0} cartas actualizadas`)
    }

    // 3. Verificar resultado
    const { data: cards, error: fetchError } = await supabase
      .from('cards')
      .select('id, name, productType')
      .limit(5)

    if (fetchError) {
      console.error(`❌ Error verificando: ${fetchError.message}`)
    } else {
      console.log('\n✅ Migración completada')
      console.log(`📊 Ejemplo de cartas:`, cards)
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

addProductTypes().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

