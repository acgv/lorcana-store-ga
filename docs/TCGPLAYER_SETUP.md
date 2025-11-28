# 🔑 Configuración de TCGPlayer API

⚠️ **IMPORTANTE**: Según la [documentación oficial de TCGPlayer](https://docs.tcgplayer.com/docs/getting-started), **ya no están otorgando nuevas API keys**. Solo usuarios existentes pueden usar la API.

Esta guía explica cómo configurar la API de TCGPlayer **si ya tienes acceso**, pero el sistema funciona perfectamente sin ella usando precios estándar por rareza.

## 📋 Requisitos

1. **API Keys de TCGPlayer (solo si ya las tienes)**
   - TCGPlayer ya no otorga nuevas API keys
   - Si eres usuario existente, puedes usar tus keys existentes
   - Si no tienes keys, el sistema usa precios estándar por rareza automáticamente

## 🔧 Configuración

### Paso 1: Obtener API Keys (Solo si ya las tienes)

⚠️ **Nota**: TCGPlayer ya no otorga nuevas API keys. Este paso solo aplica si ya eres usuario existente.

Si ya tienes acceso:
1. Ve a: https://developer.tcgplayer.com/
2. Inicia sesión
3. Ve a "My Applications"
4. Usa tu aplicación existente
5. Copia tu `Public Key` y `Private Key`

**Si no tienes keys**: No te preocupes, el sistema funciona perfectamente sin ellas usando precios estándar por rareza.

### Paso 2: Configurar Variables de Entorno

Agrega estas variables en Vercel (o tu archivo `.env.local`):

```env
TCGPLAYER_PUBLIC_KEY=tu_public_key_aqui
TCGPLAYER_PRIVATE_KEY=tu_private_key_aqui
```

**En Vercel:**
1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega ambas variables
4. Selecciona: Production, Preview, Development
5. Guarda

### Paso 3: Verificar Configuración

**Con API Keys configuradas:**
- La comparativa intentará obtener precios reales de TCGPlayer
- Si no encuentra un precio, usará el precio estándar basado en rareza

**Sin API Keys (comportamiento por defecto):**
- El sistema usa automáticamente precios estándar por rareza
- Aplica la fórmula del Excel para calcular el precio sugerido
- Funciona perfectamente sin necesidad de TCGPlayer

## 💰 Conversión de Moneda

Los precios de TCGPlayer vienen en **USD (dólares)** y se convierten automáticamente a **CLP (pesos chilenos)** usando:

**1 USD = 1000 CLP**

Esta conversión se aplica automáticamente en:
- `lib/tcgplayer-api.ts` - Función `convertUSDToCLP()`

## 📊 Cómo Funciona

1. **Búsqueda de Carta**: Se busca la carta en TCGPlayer por nombre
2. **Obtención de Precios**: Se obtienen precios de mercado (normal y foil si está disponible)
3. **Conversión**: Se convierten de USD a CLP (1 USD = 1000 CLP)
4. **Comparación**: Se comparan con tus precios actuales en la BD

## ⚠️ Limitaciones

- **Rate Limiting**: TCGPlayer tiene límites de requests por minuto
- **Cache**: Los precios se cachean por 1 hora para evitar demasiadas llamadas
- **Disponibilidad**: No todas las cartas pueden estar disponibles en TCGPlayer
- **Fallback**: Si no se encuentra precio, se usa precio estándar basado en rareza

## 🔄 Actualización de Precios

Los precios se actualizan automáticamente cuando:
- Haces clic en "Actualizar" en la página de comparativa
- El cache expira (1 hora)
- Se busca una carta nueva

## 📝 Notas

- ⚠️ **TCGPlayer ya no otorga nuevas API keys** - Solo usuarios existentes pueden usarla
- El sistema funciona perfectamente **sin TCGPlayer** usando precios estándar por rareza
- Los precios estándar se basan en valores típicos de mercado por rareza
- La fórmula del Excel se aplica igualmente con precios estándar o de TCGPlayer
- La conversión 1 USD = 1000 CLP es fija (puedes cambiarla en el código si necesitas)
- Si no tienes API keys configuradas, la comparativa usará precios estándar automáticamente

## 🆘 Troubleshooting

**Problema**: No se obtienen precios de TCGPlayer
- Verifica que las API keys estén configuradas correctamente
- Revisa los logs en Vercel para ver errores de autenticación
- Verifica que la carta exista en TCGPlayer

**Problema**: Precios en 0 o null
- Algunas cartas pueden no tener precios en TCGPlayer
- Se usará el precio estándar como fallback

**Problema**: Rate limiting
- El sistema tiene cache de 1 hora
- Si necesitas más requests, considera aumentar el tiempo de cache

