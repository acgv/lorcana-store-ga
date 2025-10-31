# 🚀 Guía Rápida: Importar Datos Reales de Lorcana

## TL;DR - Inicio Ultra Rápido

```bash
# 1. Importar todas las cartas de Lorcana
npm run import:cards

# 2. Cargar a tu base de datos
npm run load:db

# 3. Ver en tu navegador
open http://localhost:3002/catalog
```

**¡Eso es todo! Ahora tienes cientos de cartas reales de Lorcana en tu tienda. 🎴✨**

---

## 📋 Paso a Paso Detallado

### 1️⃣ Importar Cartas desde Lorcana API

```bash
npm run import:cards
```

**Qué hace:**
- 📡 Se conecta a la API pública de Lorcana
- 🎴 Descarga TODAS las cartas oficiales
- 🔄 Las transforma a tu formato
- 💾 Las guarda en `lib/imported-cards.json`

**Salida esperada:**
```
🎴 Fetching Lorcana cards from API...

✅ Found 400+ cards from Lorcana API

⏳ Processed 50/400 cards...
⏳ Processed 100/400 cards...
⏳ Processed 150/400 cards...
...

✅ Successfully transformed 400 cards

📁 Saved to: /Users/you/lorcana-store/lib/imported-cards.json

📊 Statistics:
By Rarity:
  common: 120
  uncommon: 95
  rare: 85
  superRare: 65
  legendary: 35

By Set:
  firstChapter: 204
  riseOfFloodborn: 204
  ...

✨ Import completed successfully!
```

---

### 2️⃣ Cargar a Base de Datos

```bash
npm run load:db
```

**Qué hace:**
- 📖 Lee el archivo `lib/imported-cards.json`
- 📤 Lo sube a tu API en batches de 50 cartas
- ✅ Crea o actualiza cada carta en tu DB
- 📊 Te muestra estadísticas

**Salida esperada:**
```
📦 Loading cards to database...

✅ Loaded 400 cards from file

📤 Uploading in 8 batches...

⏳ Processing batch 1/8 (50 cards)...
  ✓ Created: 50, Updated: 0, Errors: 0
⏳ Processing batch 2/8 (50 cards)...
  ✓ Created: 50, Updated: 0, Errors: 0
...

📊 Summary:
  Created: 400
  Updated: 0
  Errors: 0
  Total: 400

✨ All cards loaded successfully!

🌐 Check your store: http://localhost:3002/catalog
```

---

### 3️⃣ Todo en Uno

```bash
npm run seed:all
```

Ejecuta ambos comandos en secuencia. ¡Perfecto para setup inicial!

---

## 🔍 Verificar Resultados

### En el Navegador
```bash
open http://localhost:3002/catalog
```

### Via API
```bash
# Ver todas las cartas
curl http://localhost:3002/api/cards | jq '.'

# Ver solo legendarias
curl 'http://localhost:3002/api/cards?rarity=legendary' | jq '.data[].name'

# Contar cartas
curl http://localhost:3002/api/cards | jq '.data | length'
```

### En el Archivo
```bash
# Ver primeras 10 cartas
cat lib/imported-cards.json | jq '.[:10]'

# Ver una carta específica
cat lib/imported-cards.json | jq '.[] | select(.name | contains("Elsa"))'

# Contar por rareza
cat lib/imported-cards.json | jq 'group_by(.rarity) | map({rarity: .[0].rarity, count: length})'
```

---

## 📝 Archivos Importantes

```
lorcana-store/
├── scripts/
│   ├── import-lorcana-data.js    # Script de importación
│   └── load-to-db.js              # Script de carga
├── lib/
│   ├── imported-cards.json        # Cartas importadas (creado automáticamente)
│   └── mock-data.ts               # Tu archivo actual de datos mock
└── package.json                    # Scripts npm añadidos
```

---

## 🔄 Actualizar Datos

### Re-importar (Datos más recientes)
```bash
npm run import:cards
npm run load:db
```

### Solo actualizar precios (futuro)
```bash
# Próximamente
npm run update:prices
```

---

## 🎨 Personalizar la Importación

### Editar Rangos de Precio

Abre `scripts/import-lorcana-data.js` y modifica:

```javascript
const priceRanges = {
  'common': { min: 0.50, max: 2.99 },    // Ajusta aquí
  'uncommon': { min: 1.99, max: 4.99 },
  'rare': { min: 4.99, max: 12.99 },
  'superRare': { min: 9.99, max: 24.99 },
  'legendary': { min: 19.99, max: 79.99 },
  'enchanted': { min: 49.99, max: 299.99 },
};
```

### Filtrar Sets Específicos

```javascript
// Después de fetch, filtrar:
const lorcanaCards = await response.json();
const filteredCards = lorcanaCards.filter(card => 
  card.Set_Name === 'The First Chapter'  // Solo primer set
);
```

### Ajustar Stock Inicial

```javascript
stock: Math.floor(Math.random() * 20) + 5,  // Entre 5 y 25
// Cambiar a:
stock: 100,  // Stock fijo
```

---

## 🐛 Troubleshooting

### Error: "File not found: lib/imported-cards.json"
**Solución:** Ejecuta primero `npm run import:cards`

### Error: "API error: 401"
**Solución:** Verifica que tu servidor esté corriendo en puerto 3002:
```bash
npm run dev
```

### Error: "Failed to fetch"
**Problema:** No hay conexión a internet o la API de Lorcana está caída
**Solución:** Verifica tu conexión y reintenta

### Las cartas no aparecen en el catálogo
**Solución:** Limpia el caché del navegador o reinicia el servidor:
```bash
# Ctrl+C para detener
npm run dev
```

---

## 🎯 Ejemplos de Uso

### Importar Solo un Set
```javascript
// Modificar scripts/import-lorcana-data.js
const response = await fetch('https://api.lorcana-api.com/cards/fetch?set=1');
```

### Importar Solo Legendarias
```javascript
const lorcanaCards = await response.json();
const legendaryOnly = lorcanaCards.filter(card => 
  card.Rarity === 'Legendary'
);
```

### Cambiar Idioma
```javascript
// En transformCard()
language: 'es',  // Español
language: 'fr',  // Francés
language: 'de',  // Alemán
```

---

## 📊 Datos Disponibles de la API

Cada carta incluye:
- ✅ Nombre completo
- ✅ Set/Colección
- ✅ Rareza
- ✅ Tipo (Character/Action/Item/etc)
- ✅ Número de carta
- ✅ Imagen oficial
- ✅ Texto del cuerpo
- ✅ Texto de sabor
- ✅ Color/Tinta
- ✅ Costo
- ✅ Estadísticas (para Characters)

---

## 🚀 Integración con Tu Código

### Opción 1: Usar Directamente (Recomendado)
Los scripts ya cargan a tu API, así que todo está integrado.

### Opción 2: Usar en Mock Data
```typescript
// lib/mock-data.ts
import importedCards from './imported-cards.json'

export const mockCards: Card[] = importedCards as Card[]
```

### Opción 3: Combinar Mock + Importadas
```typescript
// lib/mock-data.ts
import importedCards from './imported-cards.json'

export const mockCards: Card[] = [
  ...tus12CartasActuales,
  ...importedCards as Card[]
]
```

---

## 🔐 Notas de Seguridad

### API Key
El script usa `ADMIN_API_KEY` del environment o un key de desarrollo por defecto.

**Para producción:**
```bash
export ADMIN_API_KEY=tu_key_secreta_real
npm run load:db
```

### Rate Limiting
El script incluye delays entre batches para no sobrecargar tu API.

---

## 📈 Próximos Pasos

Una vez que tengas los datos:

1. ✅ **Revisar en el catálogo** - http://localhost:3002/catalog
2. ✅ **Probar filtros** - Por set, rareza, tipo
3. ✅ **Verificar imágenes** - La API incluye URLs de imágenes oficiales
4. ✅ **Ajustar precios** - Si quieres precios más realistas, integra TCGPlayer API
5. ✅ **Actualizar stock** - Configura según tu inventario real
6. ✅ **Deploy** - Sube a producción con datos reales

---

## 🎉 ¡Listo!

Ahora tienes:
- ✅ Script funcional de importación
- ✅ Datos reales de Lorcana
- ✅ Integración automática con tu store
- ✅ Comandos npm fáciles de usar

**¡Tu tienda ahora tiene cartas reales de Lorcana! 🎴✨**

---

## 📞 Recursos

- **Lorcana API Docs**: https://lorcana-api.com
- **Disney Lorcana Official**: https://disneylorcana.com
- **TCGPlayer (precios)**: https://www.tcgplayer.com

---

## 💡 Tips Profesionales

### Automatizar Actualizaciones
```bash
# Crear cron job (Linux/Mac)
0 0 * * * cd /path/to/lorcana-store && npm run seed:all
```

### Backup Antes de Actualizar
```bash
cp lib/imported-cards.json lib/imported-cards.backup.json
npm run import:cards
```

### Ver Diferencias
```bash
diff lib/imported-cards.json lib/imported-cards.backup.json
```

---

**Happy card importing! 🚀🎴**

