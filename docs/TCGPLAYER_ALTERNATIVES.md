# 🔄 Alternativas para Obtener Precios de TCGPlayer

Como TCGPlayer ya no otorga nuevas API keys, aquí están las alternativas para obtener precios de TCGPlayer.

## 🎯 Opciones Disponibles

### Opción 1: Card Market API (Recomendada)

**Card Market API** agrega datos de TCGPlayer y otros mercados sin necesidad de API keys de TCGPlayer.

#### Configuración:

1. **Regístrate en RapidAPI**
   - Ve a: https://rapidapi.com/
   - Crea una cuenta (gratis)
   - Busca "Card Market API"

2. **Obtén tu API Key**
   - Suscríbete al plan gratuito de Card Market API
   - Copia tu `X-RapidAPI-Key`

3. **Configura en Vercel**
   ```env
   RAPIDAPI_KEY=tu_rapidapi_key_aqui
   ```

**Ventajas:**
- ✅ Acceso a precios de TCGPlayer sin keys propias
- ✅ Plan gratuito disponible
- ✅ Datos actualizados de múltiples mercados

**Desventajas:**
- ⚠️ Requiere cuenta en RapidAPI
- ⚠️ Puede tener límites de rate limiting en plan gratuito

---

### Opción 2: TCGAPIs

**TCGAPIs** ofrece acceso a datos de TCGPlayer sin necesidad de API keys.

#### Configuración:

1. **Regístrate en TCGAPIs**
   - Ve a: https://tcgapis.com/
   - Crea una cuenta
   - Obtén acceso a la API

2. **Configura en Vercel** (si requiere API key)
   ```env
   TCGAPIS_KEY=tu_tcgapis_key_aqui
   ```

**Ventajas:**
- ✅ Acceso directo a datos de TCGPlayer
- ✅ Plan gratuito con CSV ilimitado
- ✅ Soporta más de 40 juegos de cartas

**Desventajas:**
- ⚠️ Puede requerir suscripción para acceso completo a la API
- ⚠️ El endpoint público puede tener limitaciones

---

### Opción 3: Solicitar Acceso Legacy a TCGPlayer

Si eres un desarrollador serio, puedes intentar contactar a TCGPlayer directamente:

1. **Contacta a TCGPlayer**
   - Email: support@tcgplayer.com
   - Explica tu caso de uso
   - Solicita acceso legacy a la API

**Ventajas:**
- ✅ Acceso directo y oficial
- ✅ Sin intermediarios

**Desventajas:**
- ⚠️ No garantizan otorgar acceso
- ⚠️ Puede tomar tiempo

---

## 🚀 Implementación Actual

El código ya está preparado para intentar múltiples métodos en este orden:

1. **TCGPlayer API directa** (si tienes keys)
2. **Card Market API** (si tienes `RAPIDAPI_KEY`)
3. **TCGAPIs** (como fallback)
4. **Precios estándar por rareza** (si todo falla)

## 📝 Configuración Recomendada

Para obtener precios reales de TCGPlayer, te recomiendo:

1. **Registrarte en RapidAPI** (gratis)
2. **Suscribirte a Card Market API** (plan gratuito)
3. **Agregar `RAPIDAPI_KEY` en Vercel**

Esto te dará acceso a precios de TCGPlayer sin necesidad de tener las API keys directamente.

## 🔗 Enlaces Útiles

- [RapidAPI - Card Market API](https://rapidapi.com/)
- [TCGAPIs](https://tcgapis.com/)
- [TCGPlayer Support](https://help.tcgplayer.com/)

## ⚠️ Nota Importante

Todas estas alternativas proporcionan precios de TCGPlayer, pero pueden tener:
- Rate limiting
- Límites de requests
- Requerir suscripción para uso intensivo

El sistema funciona perfectamente sin ellas usando precios estándar por rareza, pero si quieres precios reales de TCGPlayer, estas son tus opciones.

