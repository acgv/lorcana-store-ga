# 🔐 Configuración de Autenticación

## Sistema de Autenticación Implementado

El proyecto ahora tiene **protección básica de autenticación** para el panel de admin.

---

## 🎯 Características

### ✅ Implementado:
- Login page en `/admin/login`
- Middleware que protege rutas `/admin/*`
- AuthGuard component para páginas protegidas
- Hook `useAuth` para manejo de sesión
- API endpoint `/api/auth/login`
- Logout functionality
- Redirección automática a login si no autenticado

### ⚠️ Estado Actual:
- **Modo desarrollo**: Credenciales hardcodeadas
- **Sin Supabase Auth**: No usa auth de Supabase aún
- **Token simple**: No validación JWT real

---

## 🚀 Cómo Usar (Desarrollo)

### 1. Acceder al Admin

1. Ve a: http://localhost:3002/admin
2. Serás redirigido a: http://localhost:3002/admin/login
3. Usa estas credenciales de desarrollo:
   ```
   Email: admin@gacompany.com
   Password: admin123
   ```
4. Click "Login"
5. Serás redirigido al dashboard admin

### 2. Logout

Desde cualquier página de admin:
```javascript
// En consola del navegador:
localStorage.removeItem('admin_token')
location.href = '/admin/login'
```

O implementa un botón de logout en el Header.

---

## 🔧 Componentes

### 1. `/app/admin/login/page.tsx`
Página de login con:
- Form de email/password
- Validación
- Spinners de carga
- Mensajes de error

### 2. `/proxy.ts`
Proxy de Next.js 16 que:
- Intercepta todas las requests
- Verifica autenticación en rutas `/admin`
- Redirige a login si no autenticado
- Retorna 401 para API routes protegidas

### 3. `/components/auth-guard.tsx`
Component que envuelve páginas protegidas:
- Verifica autenticación
- Muestra spinner mientras carga
- Redirige a login si no autenticado

### 4. `/hooks/use-auth.ts`
Hook para manejo de autenticación:
```typescript
const { user, loading, login, logout, isAuthenticated } = useAuth()
```

### 5. `/app/api/auth/login/route.ts`
Endpoint de login que:
- Valida credenciales
- Genera token
- Retorna usuario

---

## 🚀 Para Producción: Supabase Auth

### Paso 1: Habilitar Email Auth en Supabase

1. Ve a Supabase Dashboard
2. Authentication → Providers
3. Habilita "Email"
4. Configura:
   - Confirm email: ✅ (opcional)
   - Secure email change: ✅
   - Secure password change: ✅

### Paso 2: Crear Usuario Admin

```sql
-- En Supabase SQL Editor:

-- Crear usuario admin (reemplaza con tu email real)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@gacompany.com',
  crypt('tu-password-seguro', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- O usa Supabase Dashboard → Authentication → Add User
```

### Paso 3: Actualizar API de Login

Descomentar en `/app/api/auth/login/route.ts`:

```typescript
// Opción 1: Usar Supabase Auth (cuando esté configurado)
if (supabaseAdmin) {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  })
  
  if (data.user) {
    return NextResponse.json({
      success: true,
      token: data.session?.access_token,
      user: data.user
    })
  }
}
```

### Paso 4: Eliminar Credenciales Hardcodeadas

En `/app/api/auth/login/route.ts`, **eliminar**:
```typescript
// ❌ Eliminar esto en producción:
const ADMIN_EMAIL = "admin@gacompany.com"
const ADMIN_PASSWORD = "admin123"
```

### Paso 5: Validar Token en useAuth

En `/hooks/use-auth.ts`, reemplazar `checkAuth`:

```typescript
const checkAuth = async () => {
  const token = localStorage.getItem("admin_token")
  
  if (!token) {
    setUser(null)
    setLoading(false)
    return
  }

  // Validar token con Supabase
  try {
    const { data, error } = await supabase.auth.getUser(token)
    
    if (error || !data.user) {
      localStorage.removeItem("admin_token")
      setUser(null)
    } else {
      setUser({
        id: data.user.id,
        email: data.user.email!
      })
    }
  } catch (err) {
    localStorage.removeItem("admin_token")
    setUser(null)
  }
  
  setLoading(false)
}
```

---

## 🔒 Mejoras de Seguridad Adicionales

### 1. Roles de Usuario

Crear tabla de roles:

```sql
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  role text not null check (role in ('admin', 'user')),
  created_at timestamp with time zone default now(),
  unique(user_id)
);

-- RLS
alter table public.user_roles enable row level security;

create policy "Users can view own role"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);
```

### 2. Verificar Rol en Middleware

```typescript
// En middleware.ts
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single()

if (data?.role !== 'admin') {
  return NextResponse.redirect('/unauthorized')
}
```

### 3. Rate Limiting

Instalar:
```bash
pnpm add @upstash/ratelimit @upstash/redis
```

Implementar en API routes:
```typescript
import { Ratelimit } from "@upstash/ratelimit"

const ratelimit = new Ratelimit({
  redis: ...,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
})

const { success } = await ratelimit.limit(ip)
if (!success) return 429
```

---

## 📝 Checklist de Seguridad

Antes de producción:

- [ ] Habilitar Supabase Auth
- [ ] Crear usuarios admin en Supabase
- [ ] Eliminar credenciales hardcodeadas
- [ ] Validar tokens con Supabase
- [ ] Implementar roles de usuario
- [ ] Aplicar `scripts/secure-rls-policies.sql`
- [ ] Agregar `SUPABASE_SERVICE_ROLE_KEY` a variables de entorno
- [ ] Probar que usuarios anónimos no puedan modificar datos
- [ ] Agregar rate limiting a API routes sensibles
- [ ] Implementar HTTPS en producción
- [ ] Configurar CORS apropiadamente
- [ ] Agregar logging de intentos de acceso
- [ ] Implementar 2FA (opcional pero recomendado)

---

## 🎯 Estado Actual

### ✅ Listo:
- Sistema básico de autenticación
- Protección de rutas frontend
- Middleware funcional
- Login page
- AuthGuard component

### ⚠️ Desarrollo (eliminar en producción):
- Credenciales hardcodeadas
- Token sin validación real
- Políticas RLS permisivas para anon

### 📋 Pendiente:
- Supabase Auth integration
- Validación de tokens
- Roles de usuario
- Service Role Key en API routes

---

## 📚 Próximos Pasos Recomendados

1. **Agregar Service Role Key** (más fácil)
   - Ver: `docs/security/SERVICE_ROLE_SETUP.md`
   - Tiempo: ~10 minutos
   - No requiere cambios en frontend

2. **Implementar Supabase Auth** (más robusto)
   - Tiempo: ~1-2 horas
   - Requiere configuración en Supabase
   - Mejor para producción a largo plazo

---

## 🆘 Troubleshooting

### No puedo hacer login
- Verifica que el servidor esté corriendo
- Usa email: `admin@gacompany.com`
- Usa password: `admin123`
- Abre DevTools → Console para ver errores

### Me redirige constantemente a login
- Limpia localStorage: `localStorage.clear()`
- Verifica que `/api/auth/login` funcione
- Revisa console logs del servidor

### Middleware no funciona
- Verifica que `middleware.ts` esté en la raíz
- Reinicia el servidor después de cambios
- Verifica config.matcher

---

## 📧 Soporte

¿Problemas con la autenticación?
- Revisa `docs/security/RLS_SECURITY.md`
- Revisa `docs/security/SERVICE_ROLE_SETUP.md`
- Contacta al equipo de desarrollo

