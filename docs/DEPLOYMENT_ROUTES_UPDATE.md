# 🔄 Actualización de Rutas - Configuración de Deployment

Después de reorganizar todas las rutas bajo `/lorcana-tcg/`, necesitas actualizar las siguientes configuraciones:

## ✅ Supabase - OAuth Redirect URIs

**⚠️ IMPORTANTE**: Debes actualizar los "Authorized redirect URIs" en Supabase.

### Pasos:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **URL Configuration**
3. En **Redirect URLs**, agrega/verifica estas URLs:

```
# Desarrollo local
http://localhost:3002/auth/callback

# Producción (Vercel)
https://www.gacompany.cl/auth/callback
https://gacompany.cl/auth/callback

# Si usas dominio de Vercel (backup)
https://lorcana-store-ga.vercel.app/auth/callback
```

**Nota**: El callback de OAuth (`/auth/callback`) NO cambió de ruta, solo las rutas públicas. El callback maneja los redirects internamente.

### Verificar configuración actual:

Los redirects después del login ahora apuntan a:
- `/lorcana-tcg` (home)
- `/lorcana-tcg/my-collection`
- `/lorcana-tcg/my-submissions`
- `/lorcana-tcg/submit-card`

Estos son manejados por el código, no necesitas configurarlos en Supabase.

---

## ✅ Vercel

**Generalmente NO necesitas cambios**, pero verifica:

### 1. Variables de Entorno

Verifica que estas variables estén configuradas correctamente en Vercel:

```bash
NEXT_PUBLIC_SITE_URL=https://www.gacompany.cl
NEXT_PUBLIC_APP_URL=https://www.gacompany.cl
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### 2. Redirects (si los tienes configurados)

Si tienes redirects personalizados en Vercel, verifica que apunten a las nuevas rutas:

- `/` → `/lorcana-tcg` (ya está manejado por el código)
- Cualquier otro redirect personalizado

### 3. Build

Después de hacer push, verifica que el build sea exitoso:

```bash
# El build debería funcionar sin problemas
# Next.js maneja las rutas automáticamente
```

---

## ✅ GCP (Google Cloud Platform)

**Si estás usando GCP**, verifica:

### 1. Cloud Run / App Engine

- No necesitas cambios en las configuraciones de routing
- Next.js maneja las rutas internamente

### 2. Load Balancer (si aplica)

- Verifica que no tengas reglas de routing específicas por ruta
- Si las tienes, actualiza las rutas de `/catalog` → `/lorcana-tcg/catalog`, etc.

### 3. Cloud CDN (si aplica)

- Puede necesitar invalidación de caché para las nuevas rutas
- O simplemente espera a que expire el caché (TTL)

---

## ✅ Mercado Pago

**No necesitas cambios** - Las URLs de callback de Mercado Pago no cambiaron:
- `/api/payment/create-preference` (sin cambios)
- `/payment/success` (sin cambios)
- `/payment/pending` (sin cambios)
- `/payment/failure` (sin cambios)

---

## ✅ Verificación Post-Deployment

Después de desplegar, verifica estas rutas:

### Rutas principales:
- ✅ `https://www.gacompany.cl/` → Redirige a `/lorcana-tcg`
- ✅ `https://www.gacompany.cl/lorcana-tcg` → Home
- ✅ `https://www.gacompany.cl/lorcana-tcg/catalog` → Catálogo
- ✅ `https://www.gacompany.cl/lorcana-tcg/products` → Productos
- ✅ `https://www.gacompany.cl/lorcana-tcg/contact` → Contacto
- ✅ `https://www.gacompany.cl/lorcana-tcg/my-collection` → Mi Colección

### Rutas que NO cambiaron:
- ✅ `https://www.gacompany.cl/admin/*` → Panel admin (sin cambios)
- ✅ `https://www.gacompany.cl/api/*` → API routes (sin cambios)
- ✅ `https://www.gacompany.cl/auth/callback` → OAuth callback (sin cambios)
- ✅ `https://www.gacompany.cl/payment/*` → Páginas de pago (sin cambios)

### OAuth Login:
1. Intenta hacer login con Google OAuth
2. Verifica que redirija correctamente después del login
3. Verifica que los redirects internos funcionen (ej: `/lorcana-tcg/my-collection`)

---

## 🐛 Troubleshooting

### Problema: OAuth no redirige correctamente

**Solución**: Verifica que los Redirect URIs en Supabase incluyan:
```
https://www.gacompany.cl/auth/callback
```

### Problema: 404 en rutas nuevas

**Solución**: 
1. Verifica que el build en Vercel fue exitoso
2. Limpia el caché del navegador
3. Verifica que los archivos se movieron correctamente a `app/lorcana-tcg/`

### Problema: Redirects infinitos

**Solución**: Verifica que `/app/page.tsx` tenga:
```typescript
import { redirect } from "next/navigation"

export default function RootPage() {
  redirect("/lorcana-tcg")
}
```

---

## 📝 Checklist Pre-Deployment

- [ ] Actualizar Redirect URIs en Supabase
- [ ] Verificar variables de entorno en Vercel
- [ ] Hacer push de los cambios
- [ ] Verificar que el build sea exitoso
- [ ] Probar login con OAuth
- [ ] Verificar todas las rutas principales
- [ ] Verificar que los enlaces internos funcionen
- [ ] Probar flujo de compra completo

---

## 📞 Soporte

Si encuentras problemas después del deployment, verifica:
1. Logs de Vercel para errores de build
2. Logs de Supabase para errores de autenticación
3. Console del navegador para errores de JavaScript

