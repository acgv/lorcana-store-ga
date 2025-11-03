# 📦 Guía del Filtro de Stock: Normal vs Foil

## ✨ Nueva Funcionalidad Añadida

Ahora puedes filtrar las cartas según la disponibilidad de versiones Normal y Foil.

---

## 🎯 Cómo Funciona

### Filtro de Versión
En la barra lateral de filtros del catálogo, encontrarás un nuevo selector:

**"Version Availability"**
- **All Versions** - Muestra todas las cartas (sin filtrar)
- **Normal Only** - Solo cartas con stock en versión normal
- **Foil Only** - Solo cartas con versión foil disponible
- **Both Available** - Solo cartas que tienen ambas versiones disponibles

---

## 🏷️ Badges Visuales

### En las Tarjetas de Cartas

Cada carta ahora muestra badges que indican qué versiones están disponibles:

#### Badge "Normal"
```
┌─────────┐
│ Normal  │  ← Badge gris con borde
└─────────┘
```
Aparece cuando la carta tiene stock normal (`stock > 0`)

#### Badge "Foil" ⭐
```
┌──────────┐
│ ⭐ Foil  │  ← Badge dorado con estrella
└──────────┘
```
Aparece cuando la carta tiene versión foil disponible (`foilPrice > 0`)

---

## 📊 Ejemplos de Uso

### Caso 1: Buscar Solo Cartas Foil Disponibles
```
1. Ir a /catalog
2. En "Version Availability" seleccionar "Foil Only"
3. Ver solo cartas con versión foil
```

### Caso 2: Encontrar Cartas con Ambas Versiones
```
1. Ir a /catalog
2. En "Version Availability" seleccionar "Both Available"
3. Ver cartas que tienen Normal Y Foil
```

### Caso 3: Combinar con Otros Filtros
```
1. Filtrar por Rarity: "Legendary"
2. Filtrar por Version: "Foil Only"
3. Ver solo legendarias con versión foil
```

---

## 🔍 Lógica de Filtrado

### Normal Only
```typescript
hasNormalStock = card.stock > 0
```
Muestra cartas que tienen stock normal disponible.

### Foil Only
```typescript
hasFoilStock = card.foilPrice && card.foilPrice > 0
```
Muestra cartas que tienen precio de foil definido (asumiendo disponibilidad).

### Both Available
```typescript
hasNormalStock && hasFoilStock
```
Muestra solo cartas que tienen AMBAS versiones.

---

## 💎 Visualización

### Vista Grid (Cuadrícula)
```
┌──────────────────┐
│   [Imagen]       │
├──────────────────┤
│ Card Name        │
│ [Type] [Rarity]  │
│ [Normal] [⭐Foil]│  ← Badges de versión
│ $12.99 | $22.99  │
└──────────────────┘
```

### Vista List (Lista)
```
┌────────────────────────────────────────────┐
│ [Img] Card Name                            │
│       [Type] [Rarity] [Normal] [⭐Foil]    │  ← Badges inline
│       Description text...                  │
│       Normal: $12.99    Foil: $22.99       │
└────────────────────────────────────────────┘
```

---

## 🎨 Diseño de los Badges

### Badge Normal
- **Color**: Gris/Neutral
- **Borde**: Outline
- **Font**: Serif
- **Estilo**: Minimalista

### Badge Foil
- **Color**: Dorado/Amarillo
- **Icono**: ⭐ Estrella
- **Gradiente**: De amarillo claro a amarillo oscuro
- **Efecto**: Destaca visualmente

---

## 📝 Datos de Ejemplo

Las 1,837 cartas importadas de Lorcana incluyen:

```javascript
{
  "id": "tfc-1",
  "name": "Elsa - Snow Queen",
  "stock": 15,           // ✅ Tiene stock normal
  "price": 45.99,        // Precio normal
  "foilPrice": 89.99     // ✅ Tiene versión foil
}
```

Esta carta mostraría AMBOS badges: `[Normal]` y `[⭐ Foil]`

---

## 🔄 Actualizar Stock

### Manualmente en el Código
Edita `lib/imported-cards.json`:
```json
{
  "id": "card-id",
  "stock": 0,        // Sin stock normal
  "foilPrice": 0     // Sin stock foil
}
```

### Programáticamente
```javascript
// En tu script de actualización
card.stock = 10           // Stock de versión normal
card.foilPrice = card.price * 1.8  // Disponible como foil
```

---

## 🎯 Casos de Uso Reales

### Tienda Física
```
"Normal Only" → Ver qué cartas tienes físicamente en stock
"Foil Only" → Ver cartas premium/especiales
"Both Available" → Ofrecer opciones al cliente
```

### E-commerce
```
Filtrar por disponibilidad real
Mostrar solo lo que realmente puedes vender
Destacar versiones premium
```

### Coleccionistas
```
Buscar versiones foil de cartas específicas
Comparar precios normal vs foil
Encontrar rarezas en ambas versiones
```

---

## 🚀 Mejoras Futuras Posibles

### 1. Stock Numérico
Mostrar cantidad exacta:
```
[Normal (15)]  [⭐ Foil (3)]
```

### 2. Indicador de Stock Bajo
```
[Normal (2 left)]  ← Alerta de stock bajo
```

### 3. Pre-orden
```
[🔔 Pre-order]  ← Para cartas próximas
```

### 4. Notificaciones
```
"Avísame cuando haya stock"
```

---

## 📊 Estadísticas por Versión

Para ver cuántas cartas tienen cada versión:

```bash
# Cartas con stock normal
curl http://localhost:3002/api/cards | jq '[.data[] | select(.stock > 0)] | length'

# Cartas con versión foil
curl http://localhost:3002/api/cards | jq '[.data[] | select(.foilPrice > 0)] | length'

# Cartas con ambas versiones
curl http://localhost:3002/api/cards | jq '[.data[] | select(.stock > 0 and .foilPrice > 0)] | length'
```

---

## 🎨 Personalización

### Cambiar Colores del Badge Foil

En `components/card-item.tsx`:
```typescript
<Badge className="bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 text-yellow-600">
  // Cambiar a:
  from-purple-400/10 to-purple-600/10 text-purple-600  // Púrpura
  from-blue-400/10 to-blue-600/10 text-blue-600        // Azul
  from-pink-400/10 to-pink-600/10 text-pink-600        // Rosa
</Badge>
```

### Cambiar Icono
```typescript
import { Star, Sparkles, Gem, Award } from "lucide-react"

<Star />      // ⭐ Actual
<Sparkles />  // ✨ Brillos
<Gem />       // 💎 Gema
<Award />     // 🏆 Premio
```

---

## ⚙️ Configuración Avanzada

### Ocultar Cartas Sin Stock
En `app/catalog/page.tsx`:
```typescript
const filteredCards = useMemo(() => {
  const filtered = mockCards.filter((card) => {
    // Añadir:
    if (card.stock === 0 && !card.foilPrice) return false
    // ... resto de filtros
  })
}, [filters, sortBy])
```

### Precio Dinámico Foil
```typescript
// En import script
foilPrice: card.rarity === 'legendary' ? normalPrice * 2.5 : normalPrice * 1.8
```

---

## 🐛 Troubleshooting

### Los badges no aparecen
**Problema**: Stock o foilPrice no definidos
**Solución**: 
```bash
# Re-importar datos
npm run import:cards
```

### El filtro no funciona
**Problema**: Caché del navegador
**Solución**:
```bash
# Limpiar caché Next.js
rm -rf .next
npm run dev
```

### Badges mal alineados
**Problema**: CSS no cargado
**Solución**: Verificar que el componente Badge esté importado

---

## 📝 Resumen

✅ **Añadido**: Filtro "Version Availability"  
✅ **Añadido**: Badges visuales Normal/Foil  
✅ **Añadido**: Lógica de filtrado inteligente  
✅ **Añadido**: Diseño responsive  

**Resultado**: Ahora puedes filtrar y visualizar fácilmente qué cartas están disponibles en versión Normal, Foil o Ambas.

---

## 🎉 Uso Inmediato

```bash
# 1. Asegúrate que el servidor esté corriendo
npm run dev

# 2. Abre el catálogo
open http://localhost:3002/catalog

# 3. Usa el nuevo filtro "Version Availability"

# 4. Observa los badges en cada carta
```

---

**¡Disfruta del nuevo sistema de filtrado! 🎴✨**

