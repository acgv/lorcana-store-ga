# ⚠️ CONFIGURACIÓN URGENTE: Google OAuth + Localhost

## 🔴 PROBLEMA ACTUAL:

Login en localhost → Te redirige a gacompany.cl ❌

**Por qué:** Google Cloud Console **NO tiene** `localhost` configurado como origen autorizado.

---

## ✅ SOLUCIÓN (5 minutos):

### **PASO 1: Abrir Google Cloud Console**

1. Ve a: https://console.cloud.google.com/
2. **Inicia sesión** con tu cuenta de Google
3. Selecciona el proyecto: **"Lorcana Store"**
4. En el menú lateral → **"APIs y servicios"** → **"Credenciales"**

---

### **PASO 2: Editar OAuth Client**

1. Busca tu **"ID de cliente de OAuth 2.0"**
2. Debería llamarse algo como: `Lorcana Store Web App`
3. **Haz clic en el nombre** (para editarlo)

---

### **PASO 3: Agregar localhost**

Baja hasta la sección **"Orígenes de JavaScript autorizados"**

**DEBE TENER (3 URLs):**

```
http://localhost:3002
https://www.gacompany.cl
https://lorcana-store-ga.vercel.app
```

**Si NO está `http://localhost:3002`:**

1. Click en **"+ AGREGAR URI"**
2. Pega: `http://localhost:3002`
3. Click en **"GUARDAR"** (abajo)
4. **Espera 30 segundos** para que Google lo propague

---

### **PASO 4: Verificar Supabase (opcional)**

1. Ve a: https://supabase.com/dashboard
2. Proyecto: `lorcana-store-ga`
3. Menú lateral → **Authentication** → **URL Configuration**

En **"Redirect URLs"**, asegúrate que exista:
```
http://localhost:3002/**
```

Si NO está:
1. Click en **"Add URL pattern"**
2. Pega: `http://localhost:3002/**`
3. Click en **"Save"**

---

## 🧪 PROBAR:

1. **Reinicia tu servidor local:**
   ```bash
   # Ctrl+C para detener
   pnpm dev
   ```

2. **Abre en navegador:**
   ```
   http://localhost:3002
   ```

3. **Click "Iniciar Sesión"**

4. **Login con Google**

5. **Verifica que vuelvas a:**
   ```
   http://localhost:3002  ← ✅ Correcto
   ```

   **NO a:**
   ```
   https://www.gacompany.cl  ← ❌ Incorrecto
   ```

---

## 🔍 SI AÚN NO FUNCIONA:

### **Diagnóstico:**

En la consola del navegador (F12), busca errores como:

```
Error: redirect_uri_mismatch
```

Esto confirma que localhost no está autorizado.

### **Solución:**

1. Verifica que escribiste **EXACTAMENTE:** `http://localhost:3002` (con http, no https)
2. Verifica que guardaste los cambios en Google Console
3. Espera 1 minuto para la propagación
4. Prueba en una **ventana de incógnito** (para limpiar caché)

---

## 📋 CHECKLIST:

- [ ] Abrí Google Cloud Console
- [ ] Encontré mi OAuth Client ID
- [ ] Agregué `http://localhost:3002` a "Orígenes autorizados"
- [ ] Guardé los cambios
- [ ] Esperé 30 segundos
- [ ] Reinicié el servidor local (`pnpm dev`)
- [ ] Probé el login
- [ ] Vuelvo a localhost (no a gacompany.cl) ✅

---

## 🎯 URLS FINALES EN GOOGLE CONSOLE:

**Orígenes de JavaScript autorizados (3):**
```
http://localhost:3002
https://www.gacompany.cl
https://lorcana-store-ga.vercel.app
```

**URIs de redireccionamiento autorizados (1):**
```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

---

**¡Configura Google Cloud Console y prueba de nuevo!** 🚀

