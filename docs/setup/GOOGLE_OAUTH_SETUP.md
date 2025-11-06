# 🔐 Google OAuth Setup for Lorcana Store

Esta guía te ayudará a configurar Google OAuth para que los usuarios puedan iniciar sesión con sus cuentas de Google.

---

## 📋 PASO 1: Crear Aplicación en Google Cloud Console

### 1.1 Ir a Google Cloud Console
- Abre: https://console.cloud.google.com/
- Inicia sesión con tu cuenta de Google

### 1.2 Crear Proyecto (si no tienes uno)
- Haz clic en el selector de proyectos (arriba)
- Clic en "NUEVO PROYECTO"
- Nombre: `Lorcana Store`
- Clic en "CREAR"

### 1.3 Habilitar Google+ API
- En el menú lateral → "APIs y servicios" → "Biblioteca"
- Busca: `Google+ API`
- Clic en "HABILITAR"

### 1.4 Configurar Pantalla de Consentimiento OAuth
- Menú lateral → "APIs y servicios" → "Pantalla de consentimiento de OAuth"
- Selecciona: **"Externos"** (para que cualquiera pueda registrarse)
- Clic en "CREAR"

**Información de la aplicación:**
- Nombre de la aplicación: `Lorcana Store`
- Correo de asistencia: `TU_EMAIL@example.com`
- Logotipo: (Opcional, puedes agregar después)

**Información de contacto del desarrollador:**
- Correo: `TU_EMAIL@example.com`

- Clic en "GUARDAR Y CONTINUAR"
- En "Permisos" → Clic en "GUARDAR Y CONTINUAR"
- En "Usuarios de prueba" → Clic en "GUARDAR Y CONTINUAR"

### 1.5 Crear Credenciales OAuth
- Menú lateral → "APIs y servicios" → "Credenciales"
- Clic en "+ CREAR CREDENCIALES" → "ID de cliente de OAuth"
- Tipo de aplicación: **"Aplicación web"**

**Nombre:**
```
Lorcana Store Web App
```

**URIs de redireccionamiento autorizados:**

Primero necesitas obtener tu URL de callback de Supabase (siguiente paso).

---

## 📋 PASO 2: Configurar en Supabase

### 2.1 Ir a Supabase Dashboard
- Abre: https://supabase.com/dashboard
- Selecciona tu proyecto: `lorcana-store-ga`

### 2.2 Habilitar Google Provider
- Menú lateral → "Authentication" → "Providers"
- Busca "Google" en la lista
- Haz clic para expandir

### 2.3 Copiar Callback URL
Verás algo como:
```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

**Copia esta URL completa.**

### 2.4 Volver a Google Cloud Console
- Vuelve a Google Cloud Console → Credenciales → Tu OAuth Client ID
- En "URIs de redireccionamiento autorizados" → Clic en "+ AGREGAR URI"
- Pega la URL de callback de Supabase
- Ejemplo:
  ```
  https://juvvuvpwdxzcfvnjjhkm.supabase.co/auth/v1/callback
  ```
- Clic en "GUARDAR"

### 2.5 Obtener Client ID y Client Secret
Después de guardar, verás:
- **ID de cliente:** `123456789-abc...googleusercontent.com`
- **Secreto del cliente:** `GOCSPX-abc123...`

**Copia ambos valores.**

### 2.6 Configurar en Supabase
Vuelve a Supabase → Authentication → Providers → Google:

- **Enable Google Provider:** ✅ Activar
- **Client ID:** Pega el `ID de cliente` de Google
- **Client Secret:** Pega el `Secreto del cliente` de Google
- Clic en "SAVE"

---

## 📋 PASO 3: Agregar URLs Autorizadas (Desarrollo + Producción)

### En Google Cloud Console:

**Orígenes de JavaScript autorizados:**
```
http://localhost:3002
https://www.gacompany.cl
https://lorcana-store-ga.vercel.app
```

**URIs de redireccionamiento autorizados:**
```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

Clic en "GUARDAR"

---

## 📋 PASO 4: Configurar Variables de Entorno (Opcional)

Si Supabase requiere configuración adicional en `.env.local`:

```bash
# En .env.local (normalmente no es necesario, Supabase lo maneja)
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu_client_id_aqui
```

**NOTA:** Con Supabase Auth, NO necesitas exponer las credenciales de Google en tu código.
Supabase las maneja de forma segura en su backend.

---

## ✅ Verificación

### Probar que funciona:

1. En tu app, ve a `/login`
2. Haz clic en "Continuar con Google"
3. Deberías ver la pantalla de consentimiento de Google
4. Selecciona tu cuenta
5. Acepta los permisos
6. Deberías ser redirigido de vuelta a tu app, ya autenticado

---

## 🔧 Solución de Problemas

### Error: "redirect_uri_mismatch"
- Verifica que la URL de callback en Google Cloud Console coincida EXACTAMENTE con la de Supabase
- Incluye `https://` al inicio
- No olvides "/auth/v1/callback" al final

### Error: "Access blocked: This app's request is invalid"
- Asegúrate de haber habilitado Google+ API
- Verifica que la pantalla de consentimiento esté configurada

### El login no funciona en localhost
- Agrega `http://localhost:3002` a "Orígenes de JavaScript autorizados" en Google Cloud Console

---

## 📝 Resumen de URLs

| Entorno | URL |
|---------|-----|
| Desarrollo | `http://localhost:3002` |
| Producción | `https://www.gacompany.cl` |
| Vercel | `https://lorcana-store-ga.vercel.app` |
| Supabase Callback | `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback` |

---

## 🎯 Siguiente Paso

Una vez configurado Google OAuth:
1. ✅ Ejecuta el script SQL para actualizar la tabla `submissions`
2. ✅ La página `/login` ya estará lista
3. ✅ Los usuarios podrán iniciar sesión con Google
4. ✅ Solo usuarios autenticados podrán enviar cartas

---

**¡Avísame cuando hayas completado la configuración de Google OAuth!**

