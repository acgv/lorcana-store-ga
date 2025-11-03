# 🧪 Guía de Pruebas de Pago - Mercado Pago

Basado en la [documentación oficial de Mercado Pago Chile](https://www.mercadopago.cl/developers/es/docs/checkout-pro/integration-test/test-purchases)

---

## ✅ **PRE-REQUISITOS**

Antes de probar, asegúrate de:

1. ✅ Tener las credenciales de **PRUEBA** en `.env.local`
2. ✅ Haber creado la tabla `orders` en Supabase (ejecutar `scripts/create-orders-table.sql`)
3. ✅ Servidor de desarrollo corriendo (`pnpm dev`)

---

## 💳 **TARJETAS DE PRUEBA OFICIALES**

### **✅ Pago APROBADO**
```
Número: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25 (cualquier fecha futura)
Nombre del titular: APRO
```
**Resultado:** Pago aprobado, stock se descuenta, orden creada

---

### **❌ Pago RECHAZADO (fondos insuficientes)**
```
Número: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25
Nombre del titular: OTHE
```
**Resultado:** Pago rechazado, muestra página de error

---

### **⏳ Pago PENDIENTE**
```
Número: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25
Nombre del titular: CONT
```
**Resultado:** Pago en revisión, muestra página de pendiente

---

### **🚫 Datos Inválidos**
```
Número: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25
Nombre del titular: EXPI
```
**Resultado:** Error de datos, rechazado

---

## 🧪 **ESCENARIOS DE PRUEBA**

### **Test 1: Compra Simple (1 carta normal)**

1. Ve a: `http://localhost:3002/catalog`
2. Click en una carta con stock
3. Versión: **Normal**
4. Cantidad: **1**
5. Click "**Comprar Ahora**"
6. Usa tarjeta `APRO`
7. ✅ **Verificar:**
   - Redirige a `/payment/success`
   - Stock de la carta disminuyó en 1
   - Orden creada en Supabase (tabla `orders`)

---

### **Test 2: Compra Múltiple (varias unidades)**

1. Ve a una carta con stock > 5
2. Versión: **Normal**
3. Cantidad: **3**
4. Click "**Comprar Ahora**"
5. Usa tarjeta `APRO`
6. ✅ **Verificar:**
   - Precio total = precio × 3
   - Stock disminuyó en 3

---

### **Test 3: Compra Foil**

1. Ve a una carta con foilStock > 0
2. Versión: **Foil**
3. Cantidad: **1**
4. Click "**Comprar Ahora**"
5. Usa tarjeta `APRO`
6. ✅ **Verificar:**
   - Usa precio de foilPrice
   - foilStock disminuyó en 1
   - normalStock NO cambió

---

### **Test 4: Pago Rechazado**

1. Ve a cualquier carta
2. Click "**Comprar Ahora**"
3. Usa tarjeta `OTHE` (rechazada)
4. ✅ **Verificar:**
   - Redirige a `/payment/failure`
   - Stock NO cambió
   - NO se creó orden

---

### **Test 5: Pago Pendiente**

1. Ve a cualquier carta
2. Click "**Comprar Ahora**"
3. Usa tarjeta `CONT` (pendiente)
4. ✅ **Verificar:**
   - Redirige a `/payment/pending`
   - Stock NO cambió aún
   - Cuando se apruebe, el webhook actualizará

---

## 🔍 **VERIFICAR RESULTADOS EN SUPABASE**

### **Ver Órdenes Creadas:**
```sql
select 
  id,
  payment_id,
  status,
  customer_email,
  items,
  total_amount,
  created_at
from public.orders
order by created_at desc
limit 10;
```

### **Ver Stock Actualizado:**
```sql
select 
  name,
  normalStock,
  foilStock,
  updated_at
from public.cards
where name ilike '%nombre de tu carta%';
```

### **Ver Logs de Pago:**
```sql
select 
  action,
  details,
  created_at
from public.logs
where action in ('payment_webhook', 'payment_confirmed')
order by created_at desc
limit 10;
```

---

## 🐛 **TROUBLESHOOTING**

### **Problema: "Mercado Pago no está configurado"**
✅ **Solución:** Verifica que agregaste las variables al `.env.local` y reiniciaste el servidor

### **Problema: Stock no se descuenta**
✅ **Solución:** 
- Verifica que el webhook esté recibiendo notificaciones (revisa consola)
- Verifica que la tabla `orders` exista en Supabase
- Revisa que `SUPABASE_SERVICE_ROLE_KEY` esté configurada

### **Problema: Error al crear preferencia**
✅ **Solución:**
- Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté correcto
- Revisa la consola del servidor para ver el error específico
- Verifica que la carta tenga imagen válida

### **Problema: Webhook no funciona en localhost**
✅ **Solución:**
- Los webhooks solo funcionan en producción (dominio público)
- En desarrollo, el stock se actualiza cuando vuelves de Mercado Pago
- Para probar webhooks en local, usa [ngrok](https://ngrok.com)

---

## 📊 **VERIFICAR EN MERCADO PAGO DASHBOARD**

1. Ve a: https://www.mercadopago.com.cl
2. **Actividad** → **Ventas y cobranzas**
3. Deberías ver los pagos de prueba
4. Estado: Aprobado/Rechazado/Pendiente

---

## 🚀 **CUANDO TODO FUNCIONE:**

### **Para Producción:**

1. Ve a Mercado Pago → Tus integraciones
2. Cambia a **"Credenciales de producción"**
3. Copia Public Key y Access Token
4. Actualiza `.env.local` (desarrollo)
5. Actualiza Vercel Environment Variables (producción)
6. Configura webhook en Mercado Pago:
   - URL: `https://lorcana-store-ga.vercel.app/api/webhooks/mercadopago`
   - Eventos: `payment`

**⚠️ Con credenciales de producción, los pagos serán REALES**

---

## 📝 **CHECKLIST DE PRUEBA**

Antes de ir a producción, verifica:

- [ ] Compra con tarjeta APRO funciona
- [ ] Redirige a página de éxito
- [ ] Stock se descuenta correctamente
- [ ] Orden aparece en Supabase
- [ ] Compra rechazada (OTHE) muestra error
- [ ] Stock NO cambia en pago rechazado
- [ ] Precio correcto para Normal vs Foil
- [ ] Cantidad múltiple funciona
- [ ] Precio total se calcula bien
- [ ] Webhook recibe notificación (revisar logs)

---

**Más información:** https://www.mercadopago.cl/developers/es/docs/checkout-pro/integration-test/test-purchases

