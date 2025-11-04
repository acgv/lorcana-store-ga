#!/usr/bin/env node

/**
 * Script de Verificación de Configuración
 * 
 * Verifica que tengas todo configurado correctamente antes de usar el sistema de auth
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

console.log('\n🔍 Verificando Configuración de Seguridad...\n')

let allGood = true
const warnings = []
const errors = []

// ============================================
// 1. Verificar .env.local existe
// ============================================
const envPath = join(rootDir, '.env.local')
if (!existsSync(envPath)) {
  errors.push('❌ Archivo .env.local no existe')
  errors.push('   → Créalo: touch .env.local')
  allGood = false
} else {
  console.log('✅ Archivo .env.local existe')
  
  const envContent = readFileSync(envPath, 'utf-8')
  
  // 2. Verificar SUPABASE_URL
  if (envContent.includes('NEXT_PUBLIC_SUPABASE_URL=')) {
    const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim()
    if (url && url !== 'https://tu-proyecto.supabase.co' && url.includes('supabase.co')) {
      console.log('✅ NEXT_PUBLIC_SUPABASE_URL configurado')
    } else {
      warnings.push('⚠️  NEXT_PUBLIC_SUPABASE_URL no configurado correctamente')
    }
  } else {
    errors.push('❌ NEXT_PUBLIC_SUPABASE_URL faltante en .env.local')
    allGood = false
  }
  
  // 3. Verificar ANON_KEY
  if (envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    const key = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim()
    if (key && key.startsWith('eyJ')) {
      console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY configurado')
    } else {
      warnings.push('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY no configurado correctamente')
    }
  } else {
    errors.push('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY faltante en .env.local')
    allGood = false
  }
  
  // 4. Verificar SERVICE_ROLE_KEY
  if (envContent.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
    const key = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()
    if (key && key.startsWith('eyJ')) {
      console.log('✅ SUPABASE_SERVICE_ROLE_KEY configurado')
    } else {
      errors.push('❌ SUPABASE_SERVICE_ROLE_KEY no configurado correctamente')
      errors.push('   → Obtener de: Supabase → Settings → API → service_role')
      allGood = false
    }
  } else {
    errors.push('❌ SUPABASE_SERVICE_ROLE_KEY faltante en .env.local')
    errors.push('   → Agregar: SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...')
    allGood = false
  }
}

// ============================================
// 5. Verificar archivos de código
// ============================================
const filesToCheck = [
  'lib/db.ts',
  'app/api/auth/login/route.ts',
  'hooks/use-auth.ts',
  'components/auth-guard.tsx',
  'proxy.ts',
  'app/admin/login/page.tsx',
]

for (const file of filesToCheck) {
  if (existsSync(join(rootDir, file))) {
    console.log(`✅ ${file} existe`)
  } else {
    errors.push(`❌ ${file} faltante`)
    allGood = false
  }
}

// ============================================
// 6. Verificar scripts SQL
// ============================================
const sqlScripts = [
  'scripts/secure-rls-policies.sql',
  '../scripts/create-admin-user.sql',
]

for (const script of sqlScripts) {
  if (existsSync(join(rootDir, script))) {
    console.log(`✅ ${script} existe`)
  } else {
    errors.push(`❌ ${script} faltante`)
    allGood = false
  }
}

// ============================================
// 7. Verificar que supabaseAdmin esté en lib/db.ts
// ============================================
const dbPath = join(rootDir, 'lib/db.ts')
if (existsSync(dbPath)) {
  const dbContent = readFileSync(dbPath, 'utf-8')
  if (dbContent.includes('export const supabaseAdmin')) {
    console.log('✅ supabaseAdmin exportado en lib/db.ts')
  } else {
    errors.push('❌ supabaseAdmin no encontrado en lib/db.ts')
    allGood = false
  }
}

// ============================================
// Resumen
// ============================================
console.log('\n' + '='.repeat(60))
console.log('\n📊 RESUMEN\n')

if (errors.length > 0) {
  console.log('🔴 ERRORES CRÍTICOS:\n')
  errors.forEach(err => console.log(err))
  console.log('')
}

if (warnings.length > 0) {
  console.log('🟡 ADVERTENCIAS:\n')
  warnings.forEach(warn => console.log(warn))
  console.log('')
}

if (allGood && warnings.length === 0) {
  console.log('🎉 ¡TODO CONFIGURADO CORRECTAMENTE!\n')
  console.log('Próximos pasos:')
  console.log('1. Habilitar Email Auth en Supabase (Authentication → Providers)')
  console.log('2. Crear usuario admin en Supabase (Authentication → Users → Add User)')
  console.log('3. Ejecutar scripts/secure-rls-policies.sql en Supabase SQL Editor')
  console.log('4. Reiniciar servidor: pnpm dev')
  console.log('5. Probar login: http://localhost:3002/admin\n')
} else if (allGood) {
  console.log('✅ Código implementado correctamente\n')
  console.log('⚠️  Hay algunas advertencias menores (revisar arriba)\n')
  console.log('Próximos pasos:')
  console.log('1. Habilitar Email Auth en Supabase')
  console.log('2. Crear usuario admin en Supabase')
  console.log('3. Ejecutar scripts/secure-rls-policies.sql')
  console.log('4. Reiniciar servidor\n')
} else {
  console.log('❌ HAY ERRORES CRÍTICOS QUE RESOLVER\n')
  console.log('Revisa los errores arriba y corrígelos antes de continuar.\n')
  process.exit(1)
}

console.log('='.repeat(60) + '\n')
console.log('📖 Documentación completa: docs/security/CHECKLIST.md\n')

