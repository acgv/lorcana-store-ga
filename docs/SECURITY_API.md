# 🔒 Seguridad de APIs

Este documento describe el estado de seguridad de todas las APIs del proyecto.

## 📊 Resumen de Seguridad

| Endpoint | Tipo | Protección | Rate Limit | Notas |
|----------|------|------------|------------|-------|
| `/api/cards` | GET | ❌ Pública | ✅ Sí (100/min) | Solo lectura, datos públicos |
| `/api/inventory` | GET | ❌ Pública | ✅ Sí (100/min) | Solo lectura, datos públicos |
| `/api/products` | GET | ❌ Pública | ✅ Sí (100/min) | Solo lectura, datos públicos |
| `/api/payment/create-preference` | POST | ✅ Autenticado | ✅ Sí (100/min) | Requiere token de sesión válido |
| `/api/user/*` | GET/POST/PATCH/DELETE | ✅ Autenticado | ✅ Sí | Requiere userId válido + RLS |
| `/api/my-collection` | GET/POST/PATCH/DELETE | ✅ Autenticado | ✅ Sí | RLS en Supabase |
| `/api/orders` | GET | ✅ Autenticado | ✅ Sí | RLS en Supabase |
| `/api/staging` | POST/GET | ✅ API Key | ✅ Sí | Requiere `MOBILE_API_KEY` (uso interno) |
| `/api/updateCards` | POST | ✅ Admin | ✅ Sí (50/min) | Requiere sesión + rol admin |
| `/api/admin/*` | Varios | ✅ Admin | ✅ Sí | Verificación de admin |
| `/api/submissions/*` | Varios | ✅ Admin | ✅ Sí | Verificación de admin |
| `/api/webhooks/mercadopago` | POST | ✅ Validado | ✅ Sí (100/min) | Valida que pago existe en MP |

---

## 🔓 APIs Públicas (Sin Autenticación)

### `/api/cards` (GET)
- **Estado**: ✅ Pública (intencional)
- **Protección**: Rate limit (100 requests/minuto)
- **Datos expuestos**: Solo cartas con `status = 'approved'`
- **Riesgo**: Bajo - Solo lectura de datos públicos
- **Recomendación**: ✅ OK - Necesario para el catálogo público

### `/api/inventory` (GET)
- **Estado**: ✅ Pública (intencional)
- **Protección**: Rate limit (100 requests/minuto)
- **Datos expuestos**: Stock y precios de productos aprobados
- **Riesgo**: Bajo - Solo lectura de datos públicos
- **Recomendación**: ✅ OK - Necesario para mostrar inventario

### `/api/products` (GET)
- **Estado**: ✅ Pública (intencional)
- **Protección**: Rate limit (100 requests/minuto)
- **Datos expuestos**: Productos con `status = 'approved'`
- **Riesgo**: Bajo - Solo lectura de datos públicos
- **Recomendación**: ✅ OK - Necesario para mostrar productos

---

## 🔐 APIs Protegidas con Autenticación

### `/api/payment/create-preference` (POST)
- **Estado**: ✅ Protegido
- **Protección**: Requiere token de sesión válido de Supabase
- **Rate Limit**: ✅ Sí (100/min)
- **Riesgo**: Bajo - Solo usuarios autenticados pueden crear preferencias
- **Recomendación**: ✅ OK - Implementado

### `/api/user/*` (GET/POST/PATCH/DELETE)
- **Estado**: ✅ Protegido
- **Protección**: Requiere `userId` válido + RLS en Supabase
- **Rate Limit**: ✅ Sí
- **Riesgo**: Bajo - RLS previene acceso a datos de otros usuarios
- **Recomendación**: ✅ OK - RLS es suficiente

### `/api/my-collection` (GET/POST/PATCH/DELETE)
- **Estado**: ✅ Protegido
- **Protección**: RLS en Supabase (solo el usuario puede ver sus datos)
- **Rate Limit**: ✅ Sí
- **Riesgo**: Bajo - RLS previene acceso no autorizado
- **Recomendación**: ✅ OK

### `/api/orders` (GET)
- **Estado**: ✅ Protegido
- **Protección**: RLS en Supabase (solo el usuario ve sus órdenes)
- **Rate Limit**: ✅ Sí
- **Riesgo**: Bajo - RLS previene acceso no autorizado
- **Recomendación**: ✅ OK

---

## 🔑 APIs Protegidas con API Key

### `/api/staging` (POST/GET)
- **Estado**: ✅ Protegido
- **Protección**: Requiere header `x-api-key` = `MOBILE_API_KEY`
- **Rate Limit**: ✅ Sí
- **Riesgo**: Medio - Si se filtra la API key, cualquiera puede enviar datos
- **Recomendación**: ✅ OK - Para uso interno de app móvil

### `/api/updateCards` (POST)
- **Estado**: ✅ Protegido
- **Protección**: Requiere token de sesión válido + rol admin
- **Rate Limit**: ✅ Sí (50/min)
- **Riesgo**: Bajo - Solo admins autenticados pueden modificar cartas
- **Recomendación**: ✅ OK - Implementado

---

## 👑 APIs Protegidas con Verificación de Admin

### `/api/admin/*`
- **Estado**: ✅ Protegido
- **Protección**: Verificación de rol `admin` en `user_roles`
- **Rate Limit**: ✅ Sí
- **Riesgo**: Bajo - Requiere sesión autenticada + rol admin
- **Recomendación**: ✅ OK

### `/api/submissions/*`
- **Estado**: ✅ Protegido
- **Protección**: Verificación de rol `admin`
- **Rate Limit**: ✅ Sí
- **Riesgo**: Bajo - Requiere sesión autenticada + rol admin
- **Recomendación**: ✅ OK

---

## ⚠️ APIs Sin Protección

### `/api/webhooks/mercadopago` (POST)
- **Estado**: ✅ Protegido
- **Protección**: Validación de que el pago existe en Mercado Pago antes de procesarlo
- **Rate Limit**: ✅ Sí (100/min)
- **Riesgo**: Bajo - Se valida que el pago es real antes de procesarlo
- **Recomendación**: ✅ OK - Implementado

---

## 🛡️ Rate Limiting

Todos los endpoints (excepto webhooks) tienen rate limiting configurado:

- **APIs públicas**: 100 requests/minuto
- **APIs de autenticación**: 5 requests/minuto
- **APIs de admin**: 50 requests/minuto

El rate limiting usa IP address como identificador.

---

## 🔒 Row Level Security (RLS)

Las siguientes tablas tienen RLS habilitado en Supabase:

- ✅ `cards` - Solo lectura pública de `status = 'approved'`
- ✅ `products` - Solo lectura pública de `status = 'approved'`
- ✅ `orders` - Solo el usuario ve sus propias órdenes
- ✅ `user_collections` - Solo el usuario ve su colección
- ✅ `user_profiles` - Solo el usuario ve su perfil
- ✅ `user_addresses` - Solo el usuario ve sus direcciones
- ✅ `user_phones` - Solo el usuario ve sus teléfonos
- ✅ `submissions` - Solo el usuario ve sus envíos

---

## ✅ Mejoras Implementadas

### ✅ Completadas (Noviembre 2025)

1. **✅ Validación mejorada de webhooks de Mercado Pago**
   - Se valida que el pago existe en Mercado Pago antes de procesarlo
   - Rate limiting agregado (100 webhooks/minuto)
   - Logging mejorado con validación

2. **✅ Protección mejorada de `/api/payment/create-preference`**
   - Ahora valida token de sesión real de Supabase
   - No confía en `userEmail` del body
   - Requiere sesión autenticada válida

3. **✅ Reemplazo de API key por autenticación de sesión**
   - `/api/updateCards` ahora usa verificación de admin con sesión
   - Requiere token de sesión válido + rol admin
   - Rate limiting agregado

4. **✅ Rate limiting en webhooks**
   - 100 webhooks por minuto
   - Previene spam y ataques de denegación de servicio

### 📝 Pendientes (Opcionales)

1. **Validar firma de webhooks de Mercado Pago (opcional)**
   - Mercado Pago puede enviar un header `x-signature` en algunos casos
   - Actualmente se valida que el pago existe, lo cual es suficiente
   - La validación de firma sería una capa adicional de seguridad

2. **Mantener API key en `/api/staging`**
   - Se mantiene API key para uso interno de app móvil
   - Esto es aceptable para uso interno

### Prioridad Baja

5. **Agregar logging de intentos de acceso no autorizados**
   - Para detectar ataques o intentos de acceso

6. **Implementar CORS más estricto**
   - Limitar orígenes permitidos

---

## 📝 Variables de Entorno Requeridas

```env
# API Keys (para endpoints protegidos)
MOBILE_API_KEY=tu_api_key_secreta
ADMIN_API_KEY=tu_api_key_secreta_admin

# Supabase (para RLS)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## ✅ Conclusión

**Estado General**: 🟢 **Bueno**

- ✅ Las APIs públicas están bien protegidas con rate limiting
- ✅ Las APIs de usuario están protegidas con RLS
- ✅ Las APIs de admin requieren autenticación de sesión + rol
- ✅ El webhook de Mercado Pago valida que el pago existe antes de procesarlo
- ✅ Los endpoints de pago requieren sesión autenticada válida
- ✅ Rate limiting implementado en todos los endpoints críticos

**Última actualización**: Noviembre 2025 - Todas las mejoras críticas implementadas ✅

