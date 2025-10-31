# 🎴 Cómo Obtener Datos Reales de Lorcana

Guía completa para poblar tu base de datos con información real de cartas Disney Lorcana TCG.

---

## 📊 Fuentes de Datos Disponibles

### 1️⃣ **API Pública de Lorcana (Recomendado)**

#### Dreamborn Lorcana API
La mejor fuente de datos estructurados y gratuitos.

**Endpoint:** `https://api.lorcana-api.com`

```bash
# Obtener todas las cartas
curl https://api.lorcana-api.com/cards/all

# Obtener cartas por set
curl https://api.lorcana-api.com/cards/fetch?set=1

# Buscar por nombre
curl https://api.lorcana-api.com/cards/fetch?search=elsa
```

**Estructura de respuesta:**
```json
{
  "Artist": "Alice Pisoni",
  "Set_Name": "The First Chapter",
  "Classifications": ["Storyborn", "Hero", "Queen"],
  "Date_Added": "2023-05-23T17:31:35.043",
  "Set_Num": 1,
  "Color": "Amber",
  "Gamemode": "Core",
  "Franchise": "Frozen",
  "Image": "https://cdn.lorcana-api.com/images/tfc/001_en_elsa-716.webp",
  "Cost": 8,
  "Inkable": true,
  "Name": "Elsa",
  "Type": "Character",
  "Lore": 2,
  "Rarity": "Legendary",
  "Flavor_Text": "...",
  "Card_Num": 1,
  "Body_Text": "...",
  "Willpower": 4,
  "Card_Variants": [],
  "Strength": 4,
  "Set_ID": "TFC"
}
```

---

### 2️⃣ **Scraping Web Oficial** 

#### Disney Lorcana Website
`https://www.disneylorcana.com/en-US/cards`

**Ventajas:**
- Datos oficiales
- Imágenes de alta calidad
- Información completa

**Desventajas:**
- Puede requerir scraping
- Posibles términos de servicio

---

### 3️⃣ **APIs de Marketplaces**

#### TCGPlayer API
`https://docs.tcgplayer.com/`

**Proporciona:**
- Precios en tiempo real
- Disponibilidad de stock
- Variantes (Normal/Foil)
- Historial de precios

**Registro:** Se requiere API key gratuita

#### CardMarket API (Europa)
`https://www.cardmarket.com/en/Magic/API`

---

### 4️⃣ **Bases de Datos Comunitarias**

#### Lorcana.gg
`https://lorcana.gg`

#### LorcanaTCG.com
Community-driven database

---

## 🔧 Implementación: Script de Importación

### Opción 1: Usar Lorcana API (Más Fácil)

Voy a crear un script para importar datos automáticamente:

```typescript
// scripts/import-lorcana-data.ts

interface LorcanaCard {
  Name: string
  Set_Name: string
  Type: string
  Rarity: string
  Cost: number
  Card_Num: number
  Image: string
  Body_Text: string
  Flavor_Text: string
  Inkable: boolean
  Color: string
  Classifications: string[]
}

async function fetchAllCards(): Promise<LorcanaCard[]> {
  const response = await fetch('https://api.lorcana-api.com/cards/all')
  const data = await response.json()
  return data
}

async function transformToOurFormat(lorcanaCard: LorcanaCard) {
  return {
    id: `${lorcanaCard.Set_Name}-${lorcanaCard.Card_Num}`.toLowerCase().replace(/\s+/g, '-'),
    name: lorcanaCard.Name,
    image: lorcanaCard.Image,
    set: mapSetName(lorcanaCard.Set_Name),
    rarity: mapRarity(lorcanaCard.Rarity),
    type: mapType(lorcanaCard.Type),
    number: lorcanaCard.Card_Num,
    cardNumber: `${lorcanaCard.Card_Num}/204`, // Ajustar según set
    price: await fetchPrice(lorcanaCard.Name), // Obtener de TCGPlayer
    foilPrice: await fetchFoilPrice(lorcanaCard.Name),
    description: lorcanaCard.Body_Text || lorcanaCard.Flavor_Text,
    version: 'normal',
    language: 'en',
    status: 'approved',
    stock: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function mapSetName(setName: string): string {
  const setMap: Record<string, string> = {
    'The First Chapter': 'firstChapter',
    'Rise of the Floodborn': 'riseOfFloodborn',
    'Into the Inklands': 'intoInklands',
    'Ursula\'s Return': 'ursulaReturn',
    'Shimmering Skies': 'shimmering',
    'Azurite Sea': 'azurite',
  }
  return setMap[setName] || setName.toLowerCase().replace(/\s+/g, '')
}

function mapRarity(rarity: string): string {
  const rarityMap: Record<string, string> = {
    'Common': 'common',
    'Uncommon': 'uncommon',
    'Rare': 'rare',
    'Super Rare': 'superRare',
    'Legendary': 'legendary',
    'Enchanted': 'enchanted',
  }
  return rarityMap[rarity] || 'common'
}

function mapType(type: string): string {
  const typeMap: Record<string, string> = {
    'Character': 'character',
    'Action': 'action',
    'Item': 'item',
    'Location': 'location',
    'Song': 'song',
  }
  return typeMap[type] || 'character'
}

async function fetchPrice(cardName: string): Promise<number> {
  // Implementar llamada a TCGPlayer API o usar precio base
  return Math.random() * 50 + 5 // Placeholder
}

async function fetchFoilPrice(cardName: string): Promise<number> {
  const normalPrice = await fetchPrice(cardName)
  return normalPrice * 1.8 // Foil típicamente ~80% más caro
}

// Función principal de importación
async function importAllCards() {
  console.log('🎴 Fetching Lorcana cards...')
  
  const lorcanaCards = await fetchAllCards()
  console.log(`✅ Found ${lorcanaCards.length} cards`)

  const transformedCards = []
  
  for (const card of lorcanaCards) {
    try {
      const transformed = await transformToOurFormat(card)
      transformedCards.push(transformed)
      console.log(`✓ Processed: ${card.Name}`)
    } catch (error) {
      console.error(`✗ Error processing ${card.Name}:`, error)
    }
  }

  // Guardar en archivo JSON
  const fs = require('fs')
  fs.writeFileSync(
    './lib/imported-cards.json',
    JSON.stringify(transformedCards, null, 2)
  )

  console.log(`\n✅ Imported ${transformedCards.length} cards successfully!`)
  console.log('📁 Saved to: ./lib/imported-cards.json')

  return transformedCards
}

// Ejecutar
if (require.main === module) {
  importAllCards().catch(console.error)
}

export { importAllCards }
```

---

## 🚀 Uso del Script de Importación

### Instalación
```bash
cd lorcana-store
npm install node-fetch axios cheerio
```

### Crear el script
```bash
mkdir -p scripts
# Copiar el código de arriba a scripts/import-lorcana-data.ts
```

### Ejecutar importación
```bash
# Con ts-node
npx ts-node scripts/import-lorcana-data.ts

# O compilar primero
npx tsc scripts/import-lorcana-data.ts
node scripts/import-lorcana-data.js
```

### Resultado
```
🎴 Fetching Lorcana cards...
✅ Found 204 cards
✓ Processed: Elsa - Snow Queen
✓ Processed: Mickey Mouse - Brave Little Tailor
✓ Processed: Maleficent - Monstrous Dragon
...
✅ Imported 204 cards successfully!
📁 Saved to: ./lib/imported-cards.json
```

---

## 💾 Cargar Datos en Base de Datos

### Opción 1: Usar el API Endpoint

```bash
# Cargar todas las cartas importadas
curl -X POST http://localhost:3002/api/updateCards \
  -H "x-api-key: your_admin_api_key" \
  -H "Content-Type: application/json" \
  -d @lib/imported-cards.json
```

### Opción 2: Script de Carga Directa

```typescript
// scripts/load-to-db.ts
import { importAllCards } from './import-lorcana-data'

async function loadToDatabase() {
  // 1. Importar cards
  const cards = await importAllCards()

  // 2. Cargar a la API
  const response = await fetch('http://localhost:3002/api/updateCards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ADMIN_API_KEY!,
    },
    body: JSON.stringify({ cards }),
  })

  const result = await response.json()
  console.log('✅ Database updated:', result)
}

loadToDatabase()
```

### Opción 3: Carga Inicial en Mock DB

```typescript
// lib/mock-data.ts
import importedCards from './imported-cards.json'

export const mockCards: Card[] = importedCards as Card[]
```

---

## 🔄 Actualización Automática de Precios

### Script de Actualización Diaria

```typescript
// scripts/update-prices.ts

import fetch from 'node-fetch'

async function updatePricesFromTCGPlayer() {
  // 1. Obtener todas las cartas de tu DB
  const response = await fetch('http://localhost:3002/api/cards')
  const { data: cards } = await response.json()

  // 2. Para cada carta, obtener precio actual
  for (const card of cards) {
    try {
      const price = await fetchTCGPlayerPrice(card.name)
      
      // 3. Actualizar en DB
      await fetch('http://localhost:3002/api/updateCards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ADMIN_API_KEY!,
        },
        body: JSON.stringify({
          cards: [{
            id: card.id,
            price: price.normal,
            foilPrice: price.foil,
          }],
        }),
      })

      console.log(`✓ Updated ${card.name}: $${price.normal}`)
    } catch (error) {
      console.error(`✗ Failed to update ${card.name}`)
    }
  }
}

async function fetchTCGPlayerPrice(cardName: string) {
  // Implementar con TCGPlayer API
  // O scraping de TCGPlayer
  return { normal: 10.99, foil: 19.99 }
}

// Ejecutar cada 24 horas
setInterval(updatePricesFromTCGPlayer, 24 * 60 * 60 * 1000)
```

---

## 🖼️ Descarga de Imágenes

### Script de Descarga de Imágenes

```typescript
// scripts/download-images.ts

import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

async function downloadCardImages() {
  const cards = require('../lib/imported-cards.json')

  for (const card of cards) {
    try {
      const response = await fetch(card.image)
      const buffer = await response.buffer()
      
      const filename = `${card.id}.webp`
      const filepath = path.join('./public/cards', filename)
      
      fs.writeFileSync(filepath, buffer)
      console.log(`✓ Downloaded: ${filename}`)
      
      // Actualizar path en card
      card.image = `/cards/${filename}`
    } catch (error) {
      console.error(`✗ Failed to download ${card.name}`)
    }
  }

  // Guardar cards actualizados
  fs.writeFileSync(
    './lib/imported-cards.json',
    JSON.stringify(cards, null, 2)
  )
}

downloadCardImages()
```

---

## ⚙️ Automatización con Cron Jobs

### Vercel Cron (Producción)

```typescript
// app/api/cron/update-prices/route.ts

export async function GET(request: Request) {
  // Verificar cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ejecutar actualización
  await updatePricesFromTCGPlayer()

  return Response.json({ success: true })
}
```

### vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/update-prices",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## 📋 Estrategia Recomendada

### Paso 1: Importación Inicial
```bash
# 1. Ejecutar script de importación
npx ts-node scripts/import-lorcana-data.ts

# 2. Revisar datos importados
cat lib/imported-cards.json | jq '.[] | select(.rarity == "legendary")'

# 3. Cargar a base de datos
curl -X POST http://localhost:3002/api/updateCards \
  -H "x-api-key: your_key" \
  -d @lib/imported-cards.json
```

### Paso 2: Descarga de Imágenes
```bash
# Crear directorio
mkdir -p public/cards

# Descargar imágenes
npx ts-node scripts/download-images.ts
```

### Paso 3: Actualización Regular
```bash
# Setup cron job o Vercel cron
# Actualizar precios diariamente
# Verificar nuevas cartas semanalmente
```

---

## 🎯 Fuentes por Tipo de Dato

| Dato | Fuente Recomendada |
|------|-------------------|
| Información de Carta | Lorcana API |
| Imágenes | Lorcana API / Disney Official |
| Precios | TCGPlayer API |
| Stock | Tu inventario / Manual |
| Rareza/Set | Lorcana API |
| Traducciones | Community databases |

---

## 🔒 Consideraciones Legales

### ⚠️ Importante
- **Imágenes**: Verificar derechos de uso
- **Datos**: Respetar términos de servicio
- **Scraping**: Usar APIs oficiales cuando sea posible
- **Precios**: Citar fuentes (TCGPlayer, etc.)

### ✅ Recomendaciones
- Usar APIs públicas y gratuitas
- Dar crédito a fuentes de datos
- No sobrecargar servidores (rate limiting)
- Cachear datos apropiadamente

---

## 📦 Package.json Scripts

Añadir a tu `package.json`:

```json
{
  "scripts": {
    "import:cards": "ts-node scripts/import-lorcana-data.ts",
    "download:images": "ts-node scripts/download-images.ts",
    "update:prices": "ts-node scripts/update-prices.ts",
    "seed:db": "ts-node scripts/load-to-db.ts"
  }
}
```

Uso:
```bash
npm run import:cards    # Importar todas las cartas
npm run download:images # Descargar imágenes
npm run update:prices   # Actualizar precios
npm run seed:db         # Cargar todo a DB
```

---

## 🚀 Inicio Rápido (TL;DR)

```bash
# 1. Instalar dependencias
npm install node-fetch axios cheerio

# 2. Crear script de importación
# (copiar código de arriba)

# 3. Ejecutar importación
npx ts-node scripts/import-lorcana-data.ts

# 4. Verificar datos
cat lib/imported-cards.json | head -n 50

# 5. Cargar a DB
curl -X POST http://localhost:3002/api/updateCards \
  -H "x-api-key: your_key" \
  -H "Content-Type: application/json" \
  -d @lib/imported-cards.json

# 6. Verificar en web
open http://localhost:3002/catalog
```

---

## 📞 APIs Útiles

| API | URL | Auth | Free |
|-----|-----|------|------|
| Lorcana API | api.lorcana-api.com | No | ✅ |
| TCGPlayer | api.tcgplayer.com | Sí | ✅ |
| CardMarket | api.cardmarket.com | Sí | ✅ |
| Disney Official | disneylorcana.com | No | N/A |

---

**¡Con esto puedes poblar tu DB con datos reales de Lorcana! 🎴✨**

