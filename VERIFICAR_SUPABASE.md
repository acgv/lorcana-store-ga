# ⚠️ VERIFICAR CONFIGURACIÓN DE SUPABASE

## 🔴 PROBLEMA:

Google Cloud Console YA tiene localhost configurado, pero aún así redirige a gacompany.cl.

**Causa:** Supabase está forzando el dominio.

---

## ✅ SOLUCIÓN: Configurar Supabase para Desarrollo Local

### **PASO 1: Abrir Supabase Dashboard**

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto: **lorcana-store-ga**
3. Menú lateral → **Authentication** → **URL Configuration**

---

### **PASO 2: Verificar "Site URL"**

Busca el campo **"Site URL"**

**Debería estar:**
```
https://www.gacompany.cl
```

Esto está bien para producción.

---

### **PASO 3: Agregar Redirect URLs**

Baja hasta **"Redirect URLs"**

**DEBE INCLUIR (orden importante):**

```
http://localhost:3002/**
http://localhost:3002/*
https://www.gacompany.cl/**
https://www.gacompany.cl/*
https://lorcana-store-ga.vercel.app/**
https://lorcana-store-ga.vercel.app/*
```

**⚠️ IMPORTANTE:** El **`/**`** y **`/*`** son necesarios. Supabase necesita ambas formas.

---

### **PASO 4: Adicional Settings (Opcional)**

Si existe un campo **"Additional Redirect URLs"**, agrega:
```
http://localhost:3002/auth/callback
https://www.gacompany.cl/auth/callback
https://lorcana-store-ga.vercel.app/auth/callback
```

---

### **PASO 5: Guardar**

1. Click en **"Save"** (abajo)
2. Espera unos segundos

---

## 🧪 PROBAR DE NUEVO:

1. **Cierra tu navegador completamente** (no solo la pestaña)
2. **Abre navegador de nuevo**
3. Ve a: `http://localhost:3002`
4. Click "Iniciar Sesión"
5. Login con Google
6. **Ahora debería volver a:** `http://localhost:3002` ✅

---

## 🔍 DEBUGGING:

Si aún falla, después de hacer login revisa la consola del navegador (F12) y busca:

```
🔄 OAuth Callback: {
  from: "http://localhost:3002",
  referer: "...",
  isLocalhost: true,
  targetOrigin: "http://localhost:3002",  ← Debería ser localhost
  redirect: "/submit-card"
}
```

Si ves `targetOrigin: "https://www.gacompany.cl"`, eso me dice que Supabase está forzando el dominio.

---

## 🎯 CHECKLIST COMPLETO:

**Google Cloud Console:**
- [x] Ya tienes `http://localhost:3002` ✅

**Supabase (verifica ahora):**
- [ ] Redirect URLs incluye `http://localhost:3002/**`
- [ ] Redirect URLs incluye `http://localhost:3002/*`
- [ ] Guardaste los cambios
- [ ] Cerraste navegador completamente
- [ ] Probaste de nuevo

---

**Verifica Supabase URL Configuration ahora.** 🔍

Si después de esto sigue fallando, muéstrame el log de `🔄 OAuth Callback` de la consola.

