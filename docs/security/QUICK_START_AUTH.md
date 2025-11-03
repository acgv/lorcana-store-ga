# 🚀 Configuración Rápida de Autenticación

## Guía paso a paso para hacer tu proyecto seguro en 15 minutos

---

## 📋 Checklist

- [ ] **Paso 1**: Obtener Service Role Key de Supabase
- [ ] **Paso 2**: Agregar key a `.env.local`
- [ ] **Paso 3**: Habilitar Email Auth en Supabase
- [ ] **Paso 4**: Crear usuario admin en Supabase
- [ ] **Paso 5**: Aplicar políticas RLS seguras
- [ ] **Paso 6**: Reiniciar servidor y probar

---

## 🔑 Paso 1: Obtener Service Role Key

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. **Settings** → **API**
4. En la sección **Project API keys**, busca `service_role`
5. **Click** en el ícono de copiar (📋)
6. Guárdala temporalmente en un lugar seguro

⚠️ **IMPORTANTE**: Esta key es SECRETA, nunca la compartas ni hagas commit de ella.

---

## 📝 Paso 2: Agregar a .env.local

Abre `/Users/aliciagonzalez/GitHub/lorcana-store-ga/.env.local` y agrega:

```bash
# Ya tienes estas (no tocar):
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Agregar esta línea (NUEVA):
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Pega la key que copiaste en el paso 1.

---

## 🔓 Paso 3: Habilitar Email Auth en Supabase

1. Ve a Supabase Dashboard
2. **Authentication** → **Providers**
3. Busca **Email** en la lista
4. Click en **Enable**
5. Configuración recomendada:
   - ✅ **Confirm email**: Desactivar (para facilitar setup inicial)
   - ✅ **Secure email change**: Activar
   - ✅ **Secure password change**: Activar
6. Click **Save**

---

## 👤 Paso 4: Crear Usuario Admin

### Opción A: Usar Supabase Dashboard (Más Fácil) ⭐

1. En Supabase Dashboard
2. **Authentication** → **Users**
3. Click **"Add User"** (botón verde)
4. Completa:
   ```
   Email: admin@gacompany.com
   Password: TuPasswordSeguro123!
   Auto Confirm User: ✅ (activar)
   ```
5. Click **"Create User"**

### Opción B: Usar SQL (Más Control)

1. En Supabase Dashboard
2. **SQL Editor** → **New query**
3. Copia y pega el contenido de `docs/security/create-admin-user.sql`
4. **Reemplaza**:
   - `admin@gacompany.com` → Tu email real
   - `admin123` → Un password seguro
5. Click **"Run"**

---

## 🛡️ Paso 5: Aplicar Políticas RLS Seguras

1. En Supabase Dashboard
2. **SQL Editor** → **New query**
3. Copia y pega el contenido de `scripts/secure-rls-policies.sql`
4. Click **"Run"**
5. Verifica que se ejecute sin errores

**Resultado:**
- ✅ Usuarios anónimos: Solo lectura
- ✅ Backend (service_role): Lectura y escritura
- ✅ Frontend protegido de modificaciones

---

## 🔄 Paso 6: Reiniciar y Probar

### 6.1 Reiniciar el Servidor

En tu terminal:
```bash
# Ctrl + C para detener
pnpm dev
```

### 6.2 Probar el Login

1. Ve a: http://localhost:3002/admin
2. Deberías ser redirigido a: http://localhost:3002/admin/login
3. Ingresa:
   ```
   Email: admin@gacompany.com (o tu email)
   Password: TuPasswordSeguro123! (o tu password)
   ```
4. Click **"Login"**
5. Deberías entrar al dashboard admin

### 6.3 Verificar Seguridad

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Intentar modificar precio sin auth (debe fallar)
fetch('/api/inventory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cardId: 'fab-0',
    price: 0.01
  })
}).then(r => r.json()).then(console.log)

// Resultado esperado:
// { success: false, error: "... RLS policy..." }
// ✅ Si ves este error, está protegido correctamente
```

---

## ✅ Confirmación de Seguridad

Después de completar todos los pasos, verifica:

- [ ] Login funciona con tu email/password real
- [ ] Dashboard admin es accesible después de login
- [ ] Inventario se guarda correctamente desde admin
- [ ] Console del navegador NO muestra errores de auth
- [ ] Usuarios anónimos NO pueden modificar datos (probado en consola)
- [ ] Service Role Key está en `.env.local` (NO en git)

---

## 🐛 Problemas Comunes

### Error: "Authentication not configured"

**Causa:** `SUPABASE_SERVICE_ROLE_KEY` no está en `.env.local`

**Solución:**
1. Verifica que agregaste la key al archivo
2. Verifica que no tenga espacios extra
3. Reinicia el servidor

### Error: "Invalid credentials"

**Causa:** Email/password incorrecto

**Solución:**
1. Verifica que creaste el usuario en Supabase
2. Verifica el email exacto (case-sensitive)
3. Verifica el password
4. En Supabase Dashboard → Authentication → Users, verifica que el usuario exista

### Error: "Token inválido o expirado"

**Causa:** Token de localStorage es viejo

**Solución:**
```javascript
localStorage.removeItem('admin_token')
location.href = '/admin/login'
```

### No me redirige al admin después de login

**Causa:** Problema en el flujo de login

**Solución:**
1. Abre DevTools → Console
2. Busca errores
3. Verifica que el response de `/api/auth/login` tenga `success: true`
4. Verifica que el token se guarde en localStorage

---

## 📊 Diagrama de Flujo de Autenticación

```
Usuario → /admin
    ↓
Middleware detecta: no hay token
    ↓
Redirige → /admin/login
    ↓
Usuario ingresa email/password
    ↓
POST /api/auth/login
    ↓
supabaseAdmin.auth.signInWithPassword()
    ↓
✅ Supabase valida credenciales
    ↓
Retorna access_token
    ↓
Frontend guarda en localStorage
    ↓
Redirige → /admin (dashboard)
    ↓
useAuth verifica token con Supabase
    ↓
✅ Token válido → Muestra dashboard
❌ Token inválido → Redirige a login
```

---

## 🎯 Resultado Final

Después de completar esta guía:

- ✅ **Login real** con Supabase Auth
- ✅ **Tokens validados** contra Supabase
- ✅ **Frontend protegido** por RLS (solo lectura)
- ✅ **Backend seguro** con Service Role
- ✅ **Admin protegido** por middleware + AuthGuard
- ✅ **Sin credenciales hardcodeadas**

**Tu proyecto está listo para producción.** 🎉

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:

1. Revisa la sección [Problemas Comunes](#-problemas-comunes)
2. Lee [AUTH_SETUP.md](./AUTH_SETUP.md) completo
3. Verifica logs del servidor (terminal)
4. Verifica logs del navegador (DevTools → Console)

---

## 🚀 Siguiente Nivel (Opcional)

Una vez que todo funcione:

- [ ] Implementar roles de usuario (admin, moderator, user)
- [ ] Agregar 2FA (Two-Factor Authentication)
- [ ] Rate limiting en login endpoint
- [ ] Logging de intentos de acceso fallidos
- [ ] Recuperación de contraseña
- [ ] Cambio de contraseña desde el panel

Ver [AUTH_SETUP.md](./AUTH_SETUP.md) para más detalles.

