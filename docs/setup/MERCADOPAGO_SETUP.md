# 💳 Configuración de Mercado Pago

## 📋 Variables de Entorno

Agrega estas líneas a tu archivo `.env.local`:

```bash
# Mercado Pago - Credenciales de Producción
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-e9d6abf9-87ea-411e-be9a-e392b5f17e42
MERCADOPAGO_ACCESS_TOKEN=APP_USR-7375809123107592-110309-25767176459316882341e3e6438f989a-2963946354
```

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

