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
  'Whispers in the Well': 'whi',
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

// Precios estándar por rareza (basados en los precios estándar del proyecto)
// Estos son valores por defecto, no se usarán si la carta ya existe en la BD
function getStandardPrice(rarity) {
  const standardPrices = {
    'common': 500,        // $5.00
    'uncommon': 1000,     // $10.00
    'rare': 2500,         // $25.00
    'superRare': 5000,    // $50.00
    'legendary': 30000,   // $300.00
    'enchanted': 50000,   // $500.00 (estimado)
  };

  return standardPrices[rarity] || 500;
}

// Sets desconocidos (para debug)
const unknownSets = new Set();

// Transformar carta de Lorcana API a nuestro formato
function transformCard(lorcanaCard) {
  const rarity = rarityMap[lorcanaCard.Rarity] || 'common';
  // Precios estándar (no se usarán si la carta ya existe en BD)
  const normalPrice = getStandardPrice(rarity);
  // Foil es aproximadamente 1.6x el precio normal según el estándar del proyecto
  const foilPrice = Math.round(normalPrice * 1.6);
  
  // Mapear set - si no existe, usar Set_ID o registrarlo como desconocido
  let mappedSet = setMap[lorcanaCard.Set_Name];
  if (!mappedSet) {
    unknownSets.add(lorcanaCard.Set_Name);
    // Usar Set_ID como fallback (ej: "TFC" -> "tfc")
    mappedSet = lorcanaCard.Set_ID ? lorcanaCard.Set_ID.toLowerCase() : 'unknown';
  }

  // Detectar si es una carta promocional - NO IMPORTAR PROMOCIONALES
  // Cualquier carta con imagen promocional será filtrada
  const isPromotional = lorcanaCard.Image && (
    lorcanaCard.Image.includes('/promo') ||
    lorcanaCard.Image.includes('/promo2/') ||
    lorcanaCard.Image.includes('/promo3/')
  );

  // Si es promocional, retornar null para que se filtre
  if (isPromotional) {
    return null;
  }

  // Generar ID único
  const cardId = `${lorcanaCard.Set_ID}-${lorcanaCard.Card_Num}`.toLowerCase();

  // Generar cardNumber
  const cardNumber = `${lorcanaCard.Card_Num}/${lorcanaCard.Set_Total || 204}`;

  return {
    id: cardId,
    name: lorcanaCard.Name + (lorcanaCard.Title ? ` - ${lorcanaCard.Title}` : ''),
    image: lorcanaCard.Image || '/placeholder.svg',
    set: mappedSet,
    rarity: rarity,
    type: typeMap[lorcanaCard.Type] || 'character',
    number: lorcanaCard.Card_Num,
    cardNumber: cardNumber,
    price: normalPrice,
    foilPrice: foilPrice,
    description: lorcanaCard.Body_Text || lorcanaCard.Flavor_Text || 'A Disney Lorcana card',
    version: 'normal',
    language: 'en',
    status: 'approved',
    // Color de tinta de la carta (Amber, Ruby, Emerald, Sapphire, Steel, Amethyst)
    inkColor: lorcanaCard.Color || null,
    // Stock inicial en 0 para nuevas cartas
    stock: 0,
    normalStock: 0,
    foilStock: 0,
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

    let skippedPromos = 0;
    
    for (const card of lorcanaCards) {
      try {
        const transformed = transformCard(card);
        // Filtrar promocionales (retornan null)
        if (transformed === null) {
          skippedPromos++;
          continue;
        }
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
    
    if (skippedPromos > 0) {
      console.log(`\n⚠️  Skipped ${skippedPromos} promotional cards`);
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

