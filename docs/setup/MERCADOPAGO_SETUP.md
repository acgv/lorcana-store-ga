# 💳 Configuración de Mercado Pago

> **📚 Para configuración completa con sistema dual de credenciales, ver:**  
> [MERCADOPAGO_DUAL_CREDENTIALS.md](./MERCADOPAGO_DUAL_CREDENTIALS.md)

---

## ⚡ Inicio Rápido

### 1. Obtener Credenciales

**Panel de Mercado Pago:**  
https://www.mercadopago.cl/developers/panel/app

#### Credenciales de PRUEBA:
- Ve a: **"PRUEBAS" → "Credenciales de prueba"**
- Copia: `Public Key` y `Access Token`

#### Credenciales de PRODUCCIÓN:
- Ve a: **"PRODUCCIÓN" → "Credenciales de producción"**
- Copia: `Public Key` y `Access Token`

---

### 2. Configurar Variables de Entorno

**Sistema Dual de Credenciales** (Recomendado):

```bash
# Switch: cambia entre test y production
MERCADOPAGO_MODE=test

# Credenciales de PRUEBA
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST=APP_USR-...
MERCADOPAGO_ACCESS_TOKEN_TEST=APP_USR-...

# Credenciales de PRODUCCIÓN
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD=APP_USR-...
MERCADOPAGO_ACCESS_TOKEN_PROD=APP_USR-...
```

> **✅ Ventaja:** Solo cambias `MERCADOPAGO_MODE` para alternar entre test y producción.  
> **📖 Guía completa:** [MERCADOPAGO_DUAL_CREDENTIALS.md](./MERCADOPAGO_DUAL_CREDENTIALS.md)

---

### 3. Reiniciar Servidor

```bash
pnpm dev
```

---

## 💳 Tarjetas de Prueba

Usa estas tarjetas con credenciales de **PRUEBA**:

| Resultado | Número | CVV | Nombre |
|-----------|--------|-----|--------|
| ✅ Aprobado | `5031 7557 3453 0604` | `123` | `APRO` |
| ❌ Rechazado | `5031 4332 1540 6351` | `123` | `OTHE` |
| ⏳ Pendiente | `5031 7557 3453 0604` | `123` | `CONT` |

**Fecha:** Cualquier fecha futura (ej: `11/30`)

**Más tarjetas:** https://www.mercadopago.com.cl/developers/es/docs/checkout-pro/additional-content/test-cards

---

## 🧪 Cómo Probar

1. Ve a una carta: http://localhost:3002/card/[id]
2. Click "Comprar Ahora"
3. Usa tarjeta de prueba
4. Verifica redirección a `/payment/success`

---

## 📚 Documentación Relacionada

- **Sistema Dual de Credenciales:** [MERCADOPAGO_DUAL_CREDENTIALS.md](./MERCADOPAGO_DUAL_CREDENTIALS.md)
- **Testing de Pagos:** [TESTING_PAYMENTS.md](./TESTING_PAYMENTS.md)
- **Deployment en Producción:** [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

---

## 🚀 Para Producción

Cuando quieras aceptar pagos reales:

1. **Configura credenciales de producción** (ver paso 1-2)
2. **Cambia el modo:**
   ```bash
   MERCADOPAGO_MODE=production
   ```
3. **En Vercel:** Actualiza `MERCADOPAGO_MODE` a `production`
4. **Redeploy**

⚠️ **Importante:** Con `MERCADOPAGO_MODE=production`, los pagos serán REALES.

---

## ❓ Problemas Comunes

### "Una de las partes... es de prueba"
- Tu aplicación de MP puede estar esperando activación
- Contacta soporte de Mercado Pago
- Mientras tanto, usa `MERCADOPAGO_MODE=test`

### Botón "Pagar" deshabilitado
- Verifica que `MERCADOPAGO_MODE` esté configurado
- Verifica que las credenciales sean correctas
- Revisa logs de Vercel para ver qué modo está activo

### Montos muy bajos
- Mercado Pago requiere mínimo ~$50 CLP
- La app ya tiene validación incorporada

---

**Última actualización:** Noviembre 2025
