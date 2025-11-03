# 🔐 Variables de Entorno - Ejemplo

Copia este contenido a `.env.local` en la raíz del proyecto y completa con tus valores reales.

⚠️ **NUNCA hagas commit de `.env.local`** (está en `.gitignore`)

---

## 📝 Contenido de `.env.local`

```bash
# ============================================
# VARIABLES DE ENTORNO - LORCANA STORE
# ============================================

# --------------------------------------------
# SUPABASE - Base de Datos
# --------------------------------------------
# Obtén estos valores de: https://app.supabase.com → Project Settings → API

# URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co

# Anon key (pública) - Usada en frontend para lectura
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role key (PRIVADA) - Usada solo en API routes (server-side)
# ⚠️ CRÍTICO: Esta key bypassa RLS - NUNCA exponerla en frontend
# ⚠️ Solo accesible desde app/api/** (server-side)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔑 Cómo Obtener las Keys de Supabase

### 1. URL del Proyecto
1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Settings → API
4. Copia **Project URL**

### 2. Anon Key (Pública)
1. En la misma página (Settings → API)
2. Sección **Project API keys**
3. Copia `anon` `public`

### 3. Service Role Key (PRIVADA) 🔒
1. En la misma página (Settings → API)
2. Sección **Project API keys**
3. Copia `service_role` **⚠️ SECRETA**

**IMPORTANTE:**
- ✅ `anon` key es segura para frontend
- ❌ `service_role` key **NUNCA** exponerla en frontend
- ❌ `service_role` key **NUNCA** hacer commit
- ✅ `service_role` key solo en server-side (API routes)

---

## 📋 Pasos de Configuración

### 1. Crear archivo `.env.local`
```bash
cd /Users/aliciagonzalez/GitHub/lorcana-store-ga
touch .env.local
```

### 2. Copiar contenido
Copia el template de arriba y completa con tus keys reales.

### 3. Verificar que está en .gitignore
```bash
cat .gitignore | grep env
# Debe mostrar: .env*
```

### 4. Reiniciar servidor
```bash
# Detén el servidor (Ctrl + C)
pnpm dev
```

### 5. Verificar configuración
```bash
# Test lectura (anon key)
curl http://localhost:3002/api/cards | jq '.meta.source'
# → "supabase"

# Test escritura (service role key)
curl -X POST http://localhost:3002/api/inventory \
  -H "Content-Type: application/json" \
  -d '{"cardId":"fab-0","normalStock":10}' | jq '.success'
# → true
```

---

## ⚠️ Seguridad

### Keys que van en `.env.local`:
| Variable | Tipo | Expuesta | Dónde se usa |
|----------|------|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | ✅ Sí | Frontend y Backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública | ✅ Sí | Frontend (solo lectura) |
| `SUPABASE_SERVICE_ROLE_KEY` | **PRIVADA** | ❌ NO | Backend (API routes) |

### En Producción (Vercel):
1. Ve a: Project Settings → Environment Variables
2. Agrega las 3 variables
3. Marca `SUPABASE_SERVICE_ROLE_KEY` como **Encrypted**
4. NO marques `SUPABASE_SERVICE_ROLE_KEY` como expuesta

---

## 🚀 Para Producción

Cuando despliegues a Vercel/Railway:

1. **Vercel Dashboard**:
   - Settings → Environment Variables
   - Add: `NEXT_PUBLIC_SUPABASE_URL`
   - Add: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Add: `SUPABASE_SERVICE_ROLE_KEY` (marcada como sensible)

2. **Railway/Render**:
   - Similar proceso en su dashboard de variables

3. **Redeploy**:
   - Trigger un nuevo deploy para cargar las variables

---

## 📚 Referencias

- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

