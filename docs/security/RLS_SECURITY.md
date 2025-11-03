# 🔒 Seguridad RLS (Row Level Security)

## ⚠️ ADVERTENCIA DE SEGURIDAD CRÍTICA

### Problema Identificado

Las políticas RLS actuales (`fix-inventory-update-permissions.sql`) permiten que **usuarios anónimos** puedan:
- ✅ Ver todas las cartas (OK)
- ❌ **MODIFICAR precios** (PELIGROSO)
- ❌ **CAMBIAR stock** (PELIGROSO)
- ❌ **Alterar cualquier dato** (PELIGROSO)

```sql
-- ❌ POLÍTICA INSEGURA (ACTUAL)
create policy "Allow update stock"
  on public.cards
  for update
  to anon, authenticated  -- ← Permite a usuarios anónimos
  using (true)            -- ← Sin restricciones
  with check (true);      -- ← Sin validación
```

**Impacto:**
- Cualquier persona puede abrir la consola del navegador y ejecutar:
  ```javascript
  fetch('/api/inventory', {
    method: 'POST',
    body: JSON.stringify({
      cardId: 'fab-0',
      price: 0.01,        // ← Cambiar precio a $0.01
      normalStock: 9999   // ← Stock infinito
    })
  })
  ```
- **Resultado**: Modificación no autorizada de tu inventario

---

## ✅ Solución: Políticas RLS Seguras

### Opción 1: Con Autenticación (Recomendado para Producción) 🔐

**Características:**
- ✅ Solo usuarios autenticados pueden modificar datos
- ✅ Usuarios anónimos solo pueden VER cartas aprobadas
- ✅ Protección completa del inventario
- ⚠️ Requiere implementar Supabase Auth

**Script:** `scripts/secure-rls-policies.sql`

**Pasos:**
1. Ejecuta `scripts/secure-rls-policies.sql` en Supabase SQL Editor
2. Implementa Supabase Auth en tu app
3. Protege rutas `/admin` con middleware de autenticación

**Estado actual:**
- ❌ No tienes Supabase Auth configurado
- ❌ `/admin` es accesible sin login
- ❌ API endpoints no verifican autenticación

---

### Opción 2: Service Role Key (Temporal para Desarrollo) 🛠️

**Características:**
- ✅ API backend usa `service_role` key (bypass RLS)
- ✅ Frontend solo puede VER, no modificar
- ⚠️ Requiere separar cliente Supabase admin/público

**Ventajas:**
- Funciona sin implementar auth completa
- Backend controla las actualizaciones
- Más seguro que políticas abiertas a `anon`

**Desventajas:**
- Service role key debe mantenerse **SECRETA**
- Solo funciona en server-side (API routes)

**Implementación:**
```typescript
// lib/db.ts
import { createClient } from "@supabase/supabase-js"

// Cliente público (solo lectura)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Cliente admin (con service_role) - SOLO SERVIDOR
export const supabaseAdmin = supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })
  : null
```

---

### Opción 3: Workaround Temporal (SOLO Desarrollo Local) ⚠️

**ADVERTENCIA:** Solo usar en desarrollo local, **NUNCA en producción**

Si necesitas seguir trabajando sin auth:
1. Mantén las políticas abiertas a `anon`
2. Protege con IP whitelisting en Supabase
3. O desactiva RLS completamente (muy inseguro)

---

## 🎯 Recomendación

Para **GA Company**, te recomiendo la **Opción 2** (Service Role Key) porque:

1. ✅ **Funciona ahora** sin implementar auth completa
2. ✅ **Más seguro** que políticas abiertas
3. ✅ **Fácil de migrar** a auth completa después
4. ✅ **No expone** capacidad de actualización al frontend

---

## 🚀 Siguiente Paso Recomendado

¿Quieres que implemente la **Opción 2** (Service Role Key)?

Esto requiere:
1. Agregar `SUPABASE_SERVICE_ROLE_KEY` a `.env.local`
2. Crear cliente admin en `lib/db.ts`
3. Actualizar API routes para usar cliente admin
4. Implementar políticas RLS seguras (solo lectura para anon)

**Tiempo estimado:** 5-10 minutos
**Impacto:** Ninguno en funcionalidad, solo mejora seguridad

---

## 📚 Recursos

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Service Role vs Anon Key](https://supabase.com/docs/guides/api/api-keys)
- [Best Practices for RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

