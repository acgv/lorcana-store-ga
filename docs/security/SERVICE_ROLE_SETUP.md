# 🔐 Configuración de Service Role Key

## Opción Recomendada: Backend con Service Role

Esta opción es ideal para:
- ✅ Desarrollo sin auth completa
- ✅ Producción temporal antes de implementar auth
- ✅ Mantener admin funcional sin exponer permisos

---

## 📋 Pasos de Implementación

### 1️⃣ Obtener Service Role Key

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Settings → API
3. Copia `service_role` key (⚠️ SECRETA, no compartir)

### 2️⃣ Agregar a Variables de Entorno

Edita `.env.local`:

```bash
# Keys públicas (ya las tienes)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Nueva: Service Role Key (SECRETA - Solo servidor)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ← Agregar esta
```

⚠️ **IMPORTANTE:**
- Nunca expongas esta key en frontend
- Nunca hagas commit de esta key
- Solo úsala en API routes (server-side)

### 3️⃣ Actualizar `lib/db.ts`

```typescript
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cliente público (solo lectura)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })
  : null

// Cliente admin (bypass RLS) - SOLO SERVIDOR
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : null
```

### 4️⃣ Actualizar API Routes de Inventario

En `/app/api/inventory/route.ts`:

```typescript
import { supabase, supabaseAdmin } from "@/lib/db"

// En POST/PATCH, usar supabaseAdmin en lugar de supabase:
export async function POST(request: Request) {
  // ...
  
  // ❌ Antes (inseguro)
  // const { data, error } = await supabase
  
  // ✅ Ahora (seguro)
  const { data, error } = await supabaseAdmin
    ?.from("cards")
    .update(updates)
    .eq("id", cardId)
    .select()
    .single()
  
  // ...
}
```

### 5️⃣ Aplicar Políticas RLS Seguras

Ejecuta en Supabase SQL Editor:

```sql
-- Eliminar política insegura
drop policy if exists "Allow update stock" on public.cards;
drop policy if exists "DEV ONLY - Allow anonymous updates" on public.cards;

-- Solo lectura para anon (frontend)
create policy "Public read approved cards"
  on public.cards
  for select
  to anon, authenticated
  using (status = 'approved');

-- Service role bypassa RLS automáticamente
-- No necesita políticas adicionales
```

O simplemente ejecuta: `scripts/secure-rls-policies.sql`

### 6️⃣ Verificar

```bash
# Frontend (anon key) - Solo lectura
curl http://localhost:3002/api/cards | jq '.meta.source'
# → "supabase"

# Backend (service role) - Puede escribir
curl -X POST http://localhost:3002/api/inventory \
  -H "Content-Type: application/json" \
  -d '{"cardId":"fab-0","normalStock":10}' | jq
# → {"success":true, ...}
```

---

## ✅ Resultado Final

| Acción | Frontend (anon) | Backend (service_role) |
|--------|-----------------|------------------------|
| **Ver cartas** | ✅ Permitido | ✅ Permitido |
| **Modificar stock** | ❌ Bloqueado | ✅ Permitido |
| **Modificar precios** | ❌ Bloqueado | ✅ Permitido |
| **Borrar cartas** | ❌ Bloqueado | ✅ Permitido |

**Seguridad:**
- ✅ Frontend no puede modificar datos
- ✅ Solo API routes (servidor) pueden modificar
- ✅ Service role key nunca se expone al navegador
- ✅ RLS protege de acceso directo a Supabase

---

## 🎯 Ventajas de este Approach

1. **Sin autenticación necesaria** (por ahora)
2. **Seguro**: Frontend solo puede leer
3. **Funcional**: Admin puede modificar via API
4. **Migrable**: Fácil agregar auth después

---

## 🚀 Próximos Pasos (Opcional)

Cuando quieras mayor seguridad:

1. **Implementar Supabase Auth**
   - Login con email/password
   - Proteger rutas `/admin` con middleware
   - Usar `authenticated` role en vez de `service_role`

2. **Agregar roles de usuario**
   - Tabla `user_roles` (admin, user)
   - Políticas RLS basadas en rol
   - Verificación en cada request

3. **Rate limiting**
   - Prevenir abuso de API
   - Limitar requests por IP

---

## 📚 Referencias

- [Supabase Service Role](https://supabase.com/docs/guides/api/api-keys#the-servicerole-key)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

