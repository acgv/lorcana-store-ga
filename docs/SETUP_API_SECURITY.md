# 🔒 Configuración de Seguridad de APIs

Esta guía explica cómo configurar y usar las APIs con autenticación.

## 📋 Autenticación en APIs

### Para Frontend (Client Components)

Cuando necesites hacer peticiones autenticadas desde el frontend:

```typescript
import { supabase } from "@/lib/db"

// Obtener token de sesión
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

if (!token) {
  // Usuario no autenticado
  return
}

// Hacer petición con token
const response = await fetch('/api/payment/create-preference', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // ✅ Token de sesión
  },
  body: JSON.stringify({
    // ... datos
  }),
})
```

### Para API Routes (Server Components)

En los API routes, usa los helpers de autenticación:

```typescript
import { verifySupabaseSession, verifyAdminSession } from "@/lib/auth-helpers"

// Verificar sesión de usuario
export async function POST(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )
  }
  
  // Usar auth.user, auth.userId, auth.email
}

// Verificar sesión de admin
export async function POST(request: NextRequest) {
  const auth = await verifyAdminSession(request)
  
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )
  }
  
  // Usuario es admin autenticado
}
```

## 🔑 Helpers Disponibles

### `verifySupabaseSession(request)`
Verifica que el request tiene un token de sesión válido de Supabase.

**Retorna:**
- `{ success: true, user, userId, email }` si es válido
- `{ success: false, error, status }` si no es válido

### `verifyAdminSession(request)`
Verifica que el request tiene un token de sesión válido Y que el usuario tiene rol admin.

**Retorna:**
- `{ success: true, user, userId, email }` si es admin
- `{ success: false, error, status }` si no es admin o no está autenticado

### `verifyAdminRole(userId)`
Verifica si un usuario tiene rol admin.

**Retorna:** `boolean`

## 📝 Ejemplos de Uso

### Endpoint que requiere autenticación

```typescript
// app/api/user/profile/route.ts
import { verifySupabaseSession } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )
  }
  
  // auth.userId contiene el ID del usuario autenticado
  // Usar auth.userId para consultar datos del usuario
}
```

### Endpoint que requiere admin

```typescript
// app/api/admin/users/route.ts
import { verifyAdminSession } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request)
  
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )
  }
  
  // Usuario es admin, puede acceder a datos de admin
}
```

## ⚠️ Notas Importantes

1. **Nunca confíes en datos del body**: Siempre usa el `userId` del token autenticado, no del body
2. **Rate limiting**: Agrega rate limiting a todos los endpoints públicos
3. **RLS en Supabase**: Las APIs de usuario dependen de RLS en Supabase para seguridad adicional
4. **Tokens expiran**: Los tokens de sesión expiran, el frontend debe manejar la renovación

## 🔄 Migración de API Keys a Sesiones

Si tienes endpoints que usan API keys y quieres migrarlos:

**Antes (API Key):**
```typescript
const apiKey = request.headers.get("x-api-key")
if (apiKey !== process.env.ADMIN_API_KEY) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

**Después (Sesión):**
```typescript
import { verifyAdminSession } from "@/lib/auth-helpers"

const auth = await verifyAdminSession(request)
if (!auth.success) {
  return NextResponse.json({ error: auth.error }, { status: auth.status })
}
// Usar auth.userId, auth.email, etc.
```

