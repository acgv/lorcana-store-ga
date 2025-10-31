#!/usr/bin/env node

/**
 * Script para importar datos reales de Lorcana desde la API pública
 * Uso: node scripts/import-lorcana-data.js
 */

const fs = require('fs');
const path = require('path');

// Mapeo de sets - TODOS los sets de Lorcana (1-9)
const setMap = {
  'The First Chapter': 'firstChapter',
  'Rise of the Floodborn': 'riseOfFloodborn',
  'Into the Inklands': 'intoInklands',
  "Ursula's Return": 'ursulaReturn',
  'Shimmering Skies': 'shimmering',
  'Azurite Sea': 'azurite',
  "Archazia's Island": 'archazia',
  'Reign of Jafar': 'reignOfJafar',
  'Fabled': 'fabled',
  'Chapter 1': 'firstChapter',
  'Chapter 2': 'riseOfFloodborn',
  'Chapter 3': 'intoInklands',
  'Chapter 4': 'ursulaReturn',
  'Chapter 5': 'shimmering',
  'Chapter 6': 'azurite',
  'Chapter 7': 'archazia',
  'Chapter 8': 'reignOfJafar',
  'Chapter 9': 'fabled',
  'Set 1': 'firstChapter',
  'Set 2': 'riseOfFloodborn',
  'Set 3': 'intoInklands',
  'Set 4': 'ursulaReturn',
  'Set 5': 'shimmering',
  'Set 6': 'azurite',
  'Set 7': 'archazia',
  'Set 8': 'reignOfJafar',
  'Set 9': 'fabled',
};

// Mapeo de rareza
const rarityMap = {
  'Common': 'common',
  'Uncommon': 'uncommon',
  'Rare': 'rare',
  'Super Rare': 'superRare',
  'Legendary': 'legendary',
  'Enchanted': 'enchanted',
};

// Mapeo de tipos
const typeMap = {
  'Character': 'character',
  'Action': 'action',
  'Item': 'item',
  'Location': 'location',
  'Song': 'song',
};

// Función para generar precio aleatorio basado en rareza
function generatePrice(rarity) {
  const priceRanges = {
    'common': { min: 0.50, max: 2.99 },
    'uncommon': { min: 1.99, max: 4.99 },
    'rare': { min: 4.99, max: 12.99 },
    'superRare': { min: 9.99, max: 24.99 },
    'legendary': { min: 19.99, max: 79.99 },
    'enchanted': { min: 49.99, max: 299.99 },
  };

  const range = priceRanges[rarity] || { min: 1, max: 10 };
  const price = Math.random() * (range.max - range.min) + range.min;
  return Math.round(price * 100) / 100;
}

// Sets desconocidos (para debug)
const unknownSets = new Set();

// Transformar carta de Lorcana API a nuestro formato
function transformCard(lorcanaCard) {
  const rarity = rarityMap[lorcanaCard.Rarity] || 'common';
  const normalPrice = generatePrice(rarity);
  const foilPrice = Math.round(normalPrice * 1.8 * 100) / 100;
  
  // Mapear set - si no existe, usar Set_ID o registrarlo como desconocido
  let mappedSet = setMap[lorcanaCard.Set_Name];
  if (!mappedSet) {
    unknownSets.add(lorcanaCard.Set_Name);
    // Usar Set_ID como fallback (ej: "TFC" -> "tfc")
    mappedSet = lorcanaCard.Set_ID ? lorcanaCard.Set_ID.toLowerCase() : 'unknown';
  }

  return {
    id: `${lorcanaCard.Set_ID}-${lorcanaCard.Card_Num}`.toLowerCase(),
    name: lorcanaCard.Name + (lorcanaCard.Title ? ` - ${lorcanaCard.Title}` : ''),
    image: lorcanaCard.Image || '/placeholder.svg',
    set: mappedSet,
    rarity: rarity,
    type: typeMap[lorcanaCard.Type] || 'character',
    number: lorcanaCard.Card_Num,
    cardNumber: `${lorcanaCard.Card_Num}/${lorcanaCard.Set_Total || 204}`,
    price: normalPrice,
    foilPrice: foilPrice,
    description: lorcanaCard.Body_Text || lorcanaCard.Flavor_Text || 'A Disney Lorcana card',
    version: 'normal',
    language: 'en',
    status: 'approved',
    stock: Math.floor(Math.random() * 20) + 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Función principal
async function importLorcanaCards() {
  console.log('🎴 Fetching Lorcana cards from API...\n');

  try {
    // Fetch desde la API de Lorcana
    const response = await fetch('https://api.lorcana-api.com/cards/all');
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const lorcanaCards = await response.json();
    console.log(`✅ Found ${lorcanaCards.length} cards from Lorcana API\n`);

    // Transformar cartas
    const transformedCards = [];
    let processed = 0;
    let errors = 0;

    for (const card of lorcanaCards) {
      try {
        const transformed = transformCard(card);
        transformedCards.push(transformed);
        processed++;
        
        if (processed % 50 === 0) {
          console.log(`⏳ Processed ${processed}/${lorcanaCards.length} cards...`);
        }
      } catch (error) {
        errors++;
        console.error(`✗ Error processing ${card.Name}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully transformed ${transformedCards.length} cards`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} cards had errors`);
    }

    // Guardar en archivo JSON
    const outputPath = path.join(__dirname, '..', 'lib', 'imported-cards.json');
    fs.writeFileSync(outputPath, JSON.stringify(transformedCards, null, 2));
    console.log(`\n📁 Saved to: ${outputPath}`);

    // Estadísticas
    console.log('\n📊 Statistics:');
    const stats = {
      total: transformedCards.length,
      byRarity: {},
      bySet: {},
      byType: {},
    };

    transformedCards.forEach(card => {
      stats.byRarity[card.rarity] = (stats.byRarity[card.rarity] || 0) + 1;
      stats.bySet[card.set] = (stats.bySet[card.set] || 0) + 1;
      stats.byType[card.type] = (stats.byType[card.type] || 0) + 1;
    });

    console.log('\nBy Rarity:');
    Object.entries(stats.byRarity).forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count}`);
    });

    console.log('\nBy Set:');
    Object.entries(stats.bySet).forEach(([set, count]) => {
      console.log(`  ${set}: ${count}`);
    });

    console.log('\nBy Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Reportar sets desconocidos
    if (unknownSets.size > 0) {
      console.log('\n⚠️  Unknown Sets Found:');
      unknownSets.forEach(setName => {
        console.log(`  - "${setName}"`);
      });
      console.log('\n💡 Add these to setMap in scripts/import-lorcana-data.js');
    }

    console.log('\n✨ Import completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Review: cat lib/imported-cards.json | head -n 100');
    console.log('2. Load to DB: npm run seed:db');
    console.log('3. Or manually: Update lib/mock-data.ts to use imported-cards.json\n');

    return transformedCards;

  } catch (error) {
    console.error('❌ Failed to import cards:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  importLorcanaCards().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { importLorcanaCards };

