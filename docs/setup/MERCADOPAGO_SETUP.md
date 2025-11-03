# 💳 Configuración de Mercado Pago

## 📋 Variables de Entorno

Agrega estas líneas a tu archivo `.env.local`:

```bash
# Mercado Pago - Credenciales de PRUEBA (Sandbox)
# ⚠️ IMPORTANTE: Estas son credenciales de PRUEBA
# Para producción, reemplaza con credenciales de producción
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-e9d6abf9-87ea-411e-be9a-e392b5f17e42
MERCADOPAGO_ACCESS_TOKEN=APP_USR-7375809123107592-110309-25767176459316882341e3e6438f989a-2963946354

# Integrator ID (Programa de Partners)
MERCADOPAGO_INTEGRATOR_ID=dev_24c65fb163bf11ea96500242ac130004
```

## 🏆 Integrator ID (Programa de Partners)

El `MERCADOPAGO_INTEGRATOR_ID` te identifica como partner de Mercado Pago.

**Beneficios:**
- ✅ Comisiones preferenciales
- ✅ Soporte técnico prioritario
- ✅ Dashboard de métricas
- ✅ Certificación oficial
- ✅ Visibilidad en marketplace de partners

**Importante:** Siempre incluye tu Integrator ID en todas las preferencias de pago.

## 🔒 Seguridad

- ✅ `.env.local` está en `.gitignore` (no se sube a GitHub)
- ✅ `NEXT_PUBLIC_*` son públicas (van al frontend)
- ✅ Sin `NEXT_PUBLIC_*` son privadas (solo backend)

## 🚀 Para Vercel (Producción)

Cuando despliegues, agrega estas variables en:
- Vercel Dashboard → Tu Proyecto → Settings → Environment Variables

## 📝 Notas

- Estas son credenciales de **PRODUCCIÓN**
- Los pagos serán reales
- Si quieres probar primero, obtén credenciales de TEST en Mercado Pago

## 💳 Tarjetas de Prueba (Solo con credenciales de prueba)

Usa estas tarjetas para probar pagos en el ambiente de pruebas:

### ✅ **Pago Aprobado:**
```
Número: 5031 7557 3453 0604
CVV: 123
Fecha de expiración: cualquier fecha futura (ej: 11/25)
Nombre: APRO
```

### ❌ **Pago Rechazado (insuficientes fondos):**
```
Número: 5031 7557 3453 0604
CVV: 123
Fecha de expiración: cualquier fecha futura
Nombre: OTHE
```

### ⏳ **Pago Pendiente:**
```
Número: 5031 7557 3453 0604
CVV: 123
Fecha de expiración: cualquier fecha futura
Nombre: CONT
```

**Más tarjetas de prueba:** https://www.mercadopago.com.cl/developers/es/docs/checkout-pro/additional-content/test-cards

## 🔄 Después de Agregar las Variables

1. Reinicia tu servidor de desarrollo:
   ```bash
   # Detén el servidor (Ctrl + C)
   pnpm dev
   ```

2. Verifica que funcionen:
   ```bash
   node -e "console.log(process.env.MERCADOPAGO_ACCESS_TOKEN)"
   ```

## 🧪 Cómo Probar

1. Ve a una carta: http://localhost:3002/card/[id]
2. Click en "Comprar Ahora"
3. Usa las tarjetas de prueba de arriba
4. Verifica que te redirija a success/failure/pending

## 🚀 Para Producción

Cuando quieras aceptar pagos reales:

1. Ve a Mercado Pago Developers → Tus integraciones
2. Click en tu aplicación
3. Ve a **"Producción"** → **"Credenciales de producción"**
4. Copia la Public Key y Access Token de PRODUCCIÓN
5. Reemplaza las variables en `.env.local`
6. En Vercel, actualiza las variables de entorno
7. Redeploy

⚠️ **Importante:** Con credenciales de producción, los pagos serán REALES.

