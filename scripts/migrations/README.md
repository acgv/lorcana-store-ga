# Scripts de Migración

Este directorio contiene scripts de migración para corregir problemas en la base de datos y herramientas de análisis.

## Herramientas de Análisis

### analyze-promotional-cards.mjs

Script de análisis para revisar todas las cartas promocionales y detectar posibles problemas o conflictos.

**Uso:**
```bash
node scripts/migrations/analyze-promotional-cards.mjs
```

**Qué hace:**
- Busca todas las cartas promocionales en la base de datos
- Verifica conflictos (mismo número, mismo set, una normal y una promo)
- Analiza patrones de imágenes
- Verifica consistencia de IDs y cardNumbers
- Genera un reporte detallado

### check-missing-cards.mjs

Script para verificar cartas faltantes en la base de datos. Compara las cartas en `imported-cards.json` con las que están en Supabase.

**Uso:**
```bash
node scripts/migrations/check-missing-cards.mjs
```

## Scripts de Eliminación

### remove-set9-promos.mjs

Script para eliminar todas las cartas promocionales del Set 9 (fabled).

**Uso:**
```bash
node scripts/migrations/remove-set9-promos.mjs
```

**Nota:** Este script fue ejecutado para limpiar el Set 9 de cartas promocionales que causaban conflictos.

### remove-set8-promos.mjs

Script para eliminar todas las cartas promocionales del Set 8 (reignOfJafar).

**Uso:**
```bash
node scripts/migrations/remove-set8-promos.mjs
```

**Nota:** Este script fue ejecutado para mantener consistencia y eliminar todas las cartas promocionales.

## Migraciones de Esquema (SQL)

### add-fee-columns-to-orders.sql
Agrega columnas de fees a la tabla de órdenes.

### add-user-to-submissions.sql
Agrega columna de usuario a las submissions.

### add-version-to-collections.sql
Agrega columna de versión a las colecciones.

## Estado Actual

- ✅ Todas las cartas promocionales han sido eliminadas de la base de datos
- ✅ Solo quedan cartas normales en todos los sets
- ✅ No hay conflictos entre cartas normales y promocionales
