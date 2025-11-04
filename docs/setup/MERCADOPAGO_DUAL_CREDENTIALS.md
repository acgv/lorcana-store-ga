# Sistema Dual de Credenciales de Mercado Pago

Este sistema te permite tener **credenciales de prueba y producción** configuradas simultáneamente, cambiando fácilmente entre ellas con una sola variable de entorno.

---

## 📋 Variables de Entorno Requeridas

### 1. **Variable de Modo** (Switch principal)

```bash
MERCADOPAGO_MODE=test        # Para usar credenciales de prueba
# o
MERCADOPAGO_MODE=production  # Para usar credenciales de producción
```

### 2. **Credenciales de PRUEBA**

```bash
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST=APP_USR-e9d6abf9-87ea-411e-be9a-e392b5f17e42
MERCADOPAGO_ACCESS_TOKEN_TEST=APP_USR-7375809123107592-110309-25767176459316882341e3e6438f989a-2963946354
```

**Dónde obtenerlas:**
1. Ve a: https://www.mercadopago.cl/developers/panel/app
2. Selecciona tu aplicación
3. Ve a **"PRUEBAS" → "Credenciales de prueba"**
4. O en el panel de credenciales, pestaña **"Prueba"**

### 3. **Credenciales de PRODUCCIÓN**

```bash
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD=APP_USR-69147bbd-9524-4ccc-af61-8d4241aff064
MERCADOPAGO_ACCESS_TOKEN_PROD=APP_USR-923130580665497-110309-be55d3b1ecb589add6a9e900281ef74b-266229479
```

**Dónde obtenerlas:**
1. Ve a: https://www.mercadopago.cl/developers/panel/app
2. Selecciona tu aplicación
3. Ve a **"PRODUCCIÓN" → "Credenciales de producción"**
4. O en el panel de credenciales, pestaña **"Productivas"**

### 4. **Integrator ID** (Opcional, solo desarrollo local)

```bash
MERCADOPAGO_INTEGRATOR_ID=dev_7f02a687b8f511f08d0a26ae6bb5b74c
```

⚠️ **Nota:** Este ID solo se usa en `NODE_ENV=development` (localhost). **NO se envía** en test ni producción para evitar restricciones de pago.

---

## 🔧 Configuración en `.env.local`

Agrega todas las variables a tu archivo `.env.local`:

```bash
# ============================================
# MERCADO PAGO - SISTEMA DUAL
# ============================================

# Cambiar solo esta variable para alternar entre test y producción
MERCADOPAGO_MODE=test

# Credenciales de PRUEBA
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST=APP_USR-e9d6abf9-87ea-411e-be9a-e392b5f17e42
MERCADOPAGO_ACCESS_TOKEN_TEST=APP_USR-7375809123107592-110309-25767176459316882341e3e6438f989a-2963946354

# Credenciales de PRODUCCIÓN
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD=APP_USR-69147bbd-9524-4ccc-af61-8d4241aff064
MERCADOPAGO_ACCESS_TOKEN_PROD=APP_USR-923130580665497-110309-be55d3b1ecb589add6a9e900281ef74b-266229479

# Integrator ID (opcional, solo en dev)
MERCADOPAGO_INTEGRATOR_ID=dev_7f02a687b8f511f08d0a26ae6bb5b74c

# ... otras variables de entorno ...
```

---

## 🚀 Configuración en Vercel

### Paso 1: Agregar Variables de Entorno

1. Ve a: https://vercel.com/[tu-proyecto]/settings/environment-variables

2. Agrega las siguientes variables:

| Variable | Valor | Environment |
|----------|-------|-------------|
| `MERCADOPAGO_MODE` | `test` (o `production`) | Production, Preview, Development |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST` | Tu public key de prueba | Production, Preview, Development |
| `MERCADOPAGO_ACCESS_TOKEN_TEST` | Tu access token de prueba | Production, Preview, Development |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD` | Tu public key de producción | Production, Preview, Development |
| `MERCADOPAGO_ACCESS_TOKEN_PROD` | Tu access token de producción | Production, Preview, Development |

### Paso 2: Cambiar de Modo

**Para cambiar entre test y producción:**

1. Ve a: https://vercel.com/[tu-proyecto]/settings/environment-variables
2. Edita la variable `MERCADOPAGO_MODE`
3. Cambia el valor a `test` o `production`
4. Click "Save"
5. **Redeploy** tu aplicación

---

## 🎯 Uso

### Modo TEST (Recomendado mientras esperas activación de MP)

```bash
MERCADOPAGO_MODE=test
```

**Características:**
- ✅ Usa credenciales de prueba
- ✅ Puedes hacer pagos sin cargo real
- ✅ Usa tarjetas de prueba
- ✅ Todos los webhooks y flujos funcionan igual

**Tarjetas de prueba:**
- **Aprobada:** `5031 7557 3453 0604` | CVV: `123` | Fecha: Cualquier futura
- **Rechazada:** `5031 4332 1540 6351` | CVV: `123` | Fecha: Cualquier futura

### Modo PRODUCTION

```bash
MERCADOPAGO_MODE=production
```

**Características:**
- ⚠️ Usa credenciales de producción
- ⚠️ Los pagos son REALES
- ⚠️ Se cobra dinero de verdad
- ⚠️ Requiere que tu app de MP esté 100% activada

---

## 📊 Logs de Diagnóstico

Cuando el sistema se inicie, verás logs indicando qué credenciales está usando:

### En Modo TEST:
```
🔧 Mercado Pago Mode: TEST
✅ Using TEST credentials
   Public Key: APP_USR-e9d6abf9-87ea-...
```

### En Modo PRODUCTION:
```
🔧 Mercado Pago Mode: PRODUCTION
✅ Using PRODUCTION credentials
   Public Key: APP_USR-69147bbd-9524-...
```

### Si faltan credenciales:
```
🔧 Mercado Pago Mode: PRODUCTION
⚠️ No PRODUCTION credentials configured
```

---

## 🔄 Workflow Recomendado

### Fase 1: Desarrollo y Testing (AHORA)
```bash
MERCADOPAGO_MODE=test
```

- Prueba todos los flujos de pago
- Verifica webhooks
- Confirma actualización de stock
- Prueba diferentes escenarios (aprobado, rechazado, pendiente)

### Fase 2: Cuando MP Active tu App
```bash
MERCADOPAGO_MODE=production
```

- Cambiar solo la variable `MERCADOPAGO_MODE`
- Redeploy
- Listo para pagos reales ✅

---

## ❓ FAQ

### ¿Puedo tener ambas credenciales cargadas?
**Sí.** Ese es el propósito de este sistema. Todas las credenciales pueden estar cargadas simultáneamente.

### ¿Qué pasa si olvido configurar `MERCADOPAGO_MODE`?
Por defecto, usa `production`. Verás un log indicando el modo.

### ¿El Integrator ID se envía siempre?
**No.** Solo se envía en `NODE_ENV=development` (localhost). En test y producción se omite para evitar restricciones.

### ¿Puedo usar diferentes credenciales en Preview y Production de Vercel?
**Sí.** En Vercel, puedes configurar valores diferentes de `MERCADOPAGO_MODE` para cada environment.

---

## 🎉 Ventajas de este Sistema

- ✅ **Cambio rápido:** Solo editar una variable
- ✅ **Sin errores:** No copiar/pegar credenciales largas
- ✅ **Seguro:** Todas las credenciales en variables de entorno
- ✅ **Testing fácil:** Alternar entre test y producción en segundos
- ✅ **Desarrollo ágil:** Probar en test antes de ir a producción

---

## 📝 Checklist de Configuración

- [ ] Obtener credenciales de PRUEBA del panel de MP
- [ ] Obtener credenciales de PRODUCCIÓN del panel de MP
- [ ] Agregar todas las variables a `.env.local`
- [ ] Agregar todas las variables a Vercel
- [ ] Configurar `MERCADOPAGO_MODE=test` en Vercel (temporalmente)
- [ ] Probar pago con tarjeta de prueba
- [ ] Cuando MP active tu app, cambiar a `MERCADOPAGO_MODE=production`
- [ ] Redeploy y probar pago real

---

**Última actualización:** Noviembre 2025

