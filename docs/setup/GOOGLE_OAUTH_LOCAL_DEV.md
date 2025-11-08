# 🔧 Google OAuth - Configuración para Desarrollo Local

## 🔴 PROBLEMA:

Cuando haces login con Google en `localhost:3002`, te redirige a `gacompany.cl` en lugar de mantener localhost.

---

## ✅ SOLUCIÓN: Agregar localhost a Google Cloud Console

### PASO 1: Ve a Google Cloud Console

1. Abre: https://console.cloud.google.com/
2. Selecciona tu proyecto: `Lorcana Store`
3. Menú lateral → "APIs y servicios" → "Credenciales"
4. Click en tu **OAuth 2.0 Client ID** (el que creaste para Lorcana)

---

### PASO 2: Agregar Orígenes Autorizados

En la sección **"Orígenes de JavaScript autorizados"**:

**AGREGA:**
```
http://localhost:3002
```

**Lista completa debe ser:**
```
http://localhost:3002
https://www.gacompany.cl
https://lorcana-store-ga.vercel.app
```

---

### PASO 3: Verificar URIs de Redirección

En la sección **"URIs de redireccionamiento autorizados"**:

**Debe tener:**
```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

**Ejemplo:**
```
https://juvvuvpwdxzcfvnjjhkm.supabase.co/auth/v1/callback
```

**NO necesitas** agregar `http://localhost:3002/auth/callback` aquí, porque Supabase maneja el callback.

---

### PASO 4: Guardar Cambios

1. Click en **"GUARDAR"** (abajo)
2. Espera unos segundos para que se aplique
3. Ya está listo ✅

---

## 🧪 PROBAR:

1. Ve a: `http://localhost:3002`
2. Click en "Iniciar Sesión"
3. Click en "Continuar con Google"
4. Inicia sesión
5. **Deberías volver a:** `http://localhost:3002` ✅
6. **NO a:** `gacompany.cl` ❌

---

## 🔍 SI AÚN REDIRIGE MAL:

Verifica en Supabase:

1. Ve a: https://supabase.com/dashboard
2. Proyecto: `lorcana-store-ga`
3. Menú lateral → **Authentication** → **URL Configuration**
4. Verifica que **"Site URL"** esté en:
   ```
   https://www.gacompany.cl
   ```
5. En **"Redirect URLs"**, agrega:
   ```
   http://localhost:3002/**
   https://www.gacompany.cl/**
   https://lorcana-store-ga.vercel.app/**
   ```

---

## ⚙️ CONFIGURACIÓN DE DESARROLLO

### En tu `.env.local`:

```bash
# Asegúrate de tener:
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# NO necesitas cambiar MERCADOPAGO_MODE para OAuth
# OAuth funciona independiente del modo de pago
```

---

## 📝 RESUMEN:

| Entorno | URL | Configuración Requerida |
|---------|-----|-------------------------|
| **Desarrollo** | `http://localhost:3002` | Agregar a Google Cloud Console (Orígenes Autorizados) |
| **Producción** | `https://www.gacompany.cl` | Ya configurado ✅ |
| **Vercel Preview** | `https://lorcana-store-ga.vercel.app` | Ya configurado ✅ |

---

## ✅ CHECKLIST:

- [ ] Agregar `http://localhost:3002` a Google Cloud Console
- [ ] Verificar que Supabase tenga localhost en "Redirect URLs"
- [ ] Guardar cambios en Google Console
- [ ] Esperar 30 segundos para que se aplique
- [ ] Probar login en localhost
- [ ] Verificar que vuelve a localhost (no a gacompany.cl)

---

**Después de agregar localhost a Google Cloud Console, debería funcionar correctamente.** 🚀

