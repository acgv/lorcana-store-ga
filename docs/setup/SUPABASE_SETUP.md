# 🗄️ Supabase Setup Guide

Guía completa para configurar Supabase en el proyecto Lorcana Store.

---

## 📋 Prerequisitos

- Cuenta de Supabase ([supabase.com](https://supabase.com))
- Proyecto creado en Supabase Dashboard
- pnpm instalado (`npm install -g pnpm`)

---

## 🚀 Paso 1: Crear Proyecto en Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Clic en **"New Project"**
3. Completa:
   - **Name**: `lorcana-store` (o el nombre que prefieras)
   - **Database Password**: Guarda esto de forma segura
   - **Region**: Elige el más cercano a tus usuarios
4. Espera 2-3 minutos mientras Supabase crea el proyecto

---

## 🔑 Paso 2: Obtener Credenciales

1. En el Dashboard de tu proyecto, ve a **Settings → API**
2. Copia las siguientes credenciales:
   - **Project URL** (ejemplo: `https://xxxxxxxxx.supabase.co`)
   - **anon public** key (la API key pública)

---

## ⚙️ Paso 3: Configurar Variables de Entorno

1. Crea el archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.example .env.local
```

2. Edita `.env.local` y agrega tus credenciales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

⚠️ **Importante:** Reinicia el servidor de Next.js después de modificar `.env.local`

---

## 🏗️ Paso 4: Crear Schema de Base de Datos

1. Ve a **SQL Editor** en Supabase Dashboard
2. Clic en **"New Query"**
3. Copia y pega el contenido de `scripts/supabase-schema.sql`
4. Clic en **"Run"**

Esto creará las tablas `cards`, `submissions`, y `logs`.

---

## 🔐 Paso 5: Configurar Permisos RLS

1. En **SQL Editor**, crea una nueva query
2. Copia y pega el contenido de `scripts/fix-inventory-update-permissions.sql`
3. Clic en **"Run"**

Esto configurará las políticas de Row Level Security para permitir:
- ✅ Lectura pública de cartas aprobadas
- ✅ Actualizaciones de stock/precios desde el admin

---

## 📊 Paso 6: Importar Datos

### Opción A: Desde la API de Lorcana (Recomendado)

```bash
# 1. Importar cartas desde API pública
pnpm import:cards

# 2. Sembrar en Supabase
pnpm db:seed
```

### Opción B: Importación Manual via CSV

Si el seeding automático falla (problemas de red), puedes importar via CSV:

1. El script `db:seed` ya generó un CSV en caso de error
2. Ve a **Table Editor** → tabla `cards`
3. Clic en **"Insert"** → **"Import data from CSV"**
4. Sube el archivo `cards-compatible.csv`
5. Mapea las columnas correctamente
6. Clic en **"Import"**

---

## ✅ Paso 7: Verificar Instalación

### Desde el navegador:

1. Inicia el servidor: `pnpm dev`
2. Ve a [http://localhost:3002/catalog](http://localhost:3002/catalog)
3. Deberías ver 1,837 cartas cargadas
4. Verifica que en la consola del servidor aparezca:
   ```
   ✓ GET /api/cards - Using SUPABASE (1837 cards from 2 pages)
   ```

### Desde la terminal:

```bash
# Ver cuántas cartas hay
curl http://localhost:3002/api/cards | jq '.meta'

# Deberías ver:
# {
#   "source": "supabase",
#   "count": 1837
# }
```

### En Supabase Dashboard:

1. Ve a **Table Editor** → `cards`
2. Deberías ver 1,837 filas
3. Verifica que todas tienen `status = 'approved'`

---

## 🎛️ Paso 8: Probar el Admin

1. Ve a [http://localhost:3002/admin/inventory](http://localhost:3002/admin/inventory)
2. Deberías ver:
   - **Total Cards: 1837**
   - Filtros funcionando (Set, Type, Rarity, Stock Type)
3. Intenta editar el stock o precio de una carta
4. Haz clic en **"Save"**
5. Si funciona correctamente, verás:
   ```
   ✅ Guardado
   Stock actualizado para [Nombre Carta] (supabase)
   ```

---

## 🐛 Troubleshooting

### ❌ Error: "No rows found"

**Causa:** Las políticas RLS no están configuradas correctamente.

**Solución:**
1. Ejecuta `scripts/fix-inventory-update-permissions.sql` en Supabase SQL Editor
2. Verifica en **Authentication → Policies** que existe "Read approved cards" y "Allow update stock"

---

### ❌ Error: "Failed to fetch"

**Causa:** URL o API key incorrectas en `.env.local`

**Solución:**
1. Verifica que copiaste correctamente el **Project URL** (debe empezar con `https://` y terminar con `.supabase.co`)
2. Verifica que copiaste la **anon public** key (no la service_role key)
3. Reinicia el servidor: `Ctrl+C` → `pnpm dev`

---

### ❌ Solo se cargan 1000 cartas

**Causa:** La paginación no está funcionando

**Solución:**
1. Verifica en la consola del servidor que aparezca "from 2 pages" o más
2. Si no, verifica que el código de `/api/cards` y `/api/inventory` tenga la lógica de paginación

---

### ❌ Los cambios no se guardan

**Causa:** Falta la política de UPDATE en RLS

**Solución:**
```sql
-- Ejecuta esto en Supabase SQL Editor
drop policy if exists "Allow update stock" on public.cards;

create policy "Allow update stock"
  on public.cards
  for update
  to anon, authenticated
  using (true)
  with check (true);
```

---

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

---

## 🎉 ¡Listo!

Tu proyecto ahora está conectado a Supabase y listo para producción. Puedes:

- ✅ Ver catálogo público con 1,837 cartas
- ✅ Gestionar inventario en tiempo real desde el admin
- ✅ Editar stock y precios que se reflejan inmediatamente
- ✅ Filtrar por Normal/Foil/Ambos
- ✅ Escalar a millones de usuarios sin preocuparte por la base de datos

**Siguiente paso:** Configurar Supabase Auth para proteger el admin con login real.

