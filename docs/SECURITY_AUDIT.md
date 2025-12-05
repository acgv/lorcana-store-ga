# 🔒 Auditoría de Seguridad de API

**Fecha:** 2025-01-XX  
**Estado:** ⚠️ Requiere mejoras

## Resumen Ejecutivo

La API tiene algunas protecciones implementadas, pero **hay vulnerabilidades críticas** que deben ser corregidas inmediatamente.

### ✅ Rutas Bien Protegidas

- ✅ `/api/admin/*` - Todas protegidas con `verifyAdmin()` (requiere token + rol admin)
- ✅ `/api/payment/create-preference` - Protegida con `verifySupabaseSession()` (requiere autenticación)
- ✅ `/api/staging` - Protegida con API key (`x-api-key`)
- ✅ `/api/updateCards` - Protegida con `verifyAdminSession()`

### ⚠️ Rutas con Protección Parcial

- ⚠️ `/api/my-collection` - Solo valida `userId` en query params, **NO verifica token**
- ⚠️ `/api/inventory` - Pública, sin rate limiting ni autenticación
- ⚠️ `/api/products` - Pública (OK para catálogo, pero debería tener rate limiting)

### ❌ Rutas Críticas SIN Protección

- ❌ `/api/orders` - **CRÍTICO**: Expone todas las órdenes sin autenticación
- ❌ `/api/logs` - Expone logs del sistema sin autenticación
- ❌ `/api/submissions` - Expone submissions sin verificación adecuada

### ✅ Rutas Públicas (Correctas)

- ✅ `/api/cards` - Catálogo público (OK)
- ✅ `/api/auth/login` - Endpoint de login (OK)
- ✅ `/api/auth/verify` - Verificación de token (OK)
- ✅ `/api/webhooks/mercadopago` - Webhook con rate limiting (OK)

## Vulnerabilidades Críticas

### 1. `/api/orders` - Exposición de Datos Sensibles

**Riesgo:** 🔴 CRÍTICO  
**Descripción:** Cualquiera puede acceder a todas las órdenes sin autenticación.

**Solución:**
```typescript
// Agregar verificación de admin
const adminCheck = await verifyAdmin(request)
if (!adminCheck.success) {
  return NextResponse.json(
    { success: false, error: adminCheck.error },
    { status: adminCheck.status || 401 }
  )
}
```

### 2. `/api/my-collection` - Acceso No Autorizado

**Riesgo:** 🟡 ALTO  
**Descripción:** Cualquiera puede acceder a la colección de cualquier usuario pasando el `userId` en query params.

**Solución:**
```typescript
// Verificar que el userId del token coincida con el userId solicitado
const auth = await verifySupabaseSession(request)
if (!auth.success || auth.userId !== userId) {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 403 }
  )
}
```

### 3. `/api/inventory` - Sin Rate Limiting

**Riesgo:** 🟡 MEDIO  
**Descripción:** Puede ser abusada para hacer scraping masivo.

**Solución:** Agregar rate limiting y considerar autenticación para operaciones de escritura.

### 4. `/api/logs` - Exposición de Logs

**Riesgo:** 🟡 MEDIO  
**Descripción:** Expone información del sistema sin autenticación.

**Solución:** Proteger con `verifyAdmin()`.

## Recomendaciones

1. **Implementar middleware de autenticación** para rutas que requieren autenticación
2. **Agregar rate limiting** a todas las rutas públicas
3. **Validar ownership** en rutas de usuario (ej: `/api/my-collection`)
4. **Proteger rutas administrativas** con verificación de rol
5. **Implementar CORS** apropiado
6. **Agregar logging de seguridad** para intentos de acceso no autorizados

## Plan de Acción

- [ ] Proteger `/api/orders` con autenticación admin
- [ ] Mejorar seguridad de `/api/my-collection`
- [ ] Agregar rate limiting a `/api/inventory`
- [ ] Proteger `/api/logs` con autenticación admin
- [ ] Revisar y proteger `/api/submissions`
- [ ] Implementar middleware de autenticación centralizado

