#!/usr/bin/env node

/**
 * Script para cargar las cartas importadas a la base de datos
 * Uso: node scripts/load-to-db.js
 */

const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:3002';
const API_KEY = process.env.ADMIN_API_KEY || 'dev_admin_key';

async function loadToDatabase() {
  console.log('📦 Loading cards to database...\n');

  try {
    // Leer archivo de cartas importadas
    const cardsPath = path.join(__dirname, '..', 'lib', 'imported-cards.json');
    
    if (!fs.existsSync(cardsPath)) {
      console.error('❌ File not found: lib/imported-cards.json');
      console.log('💡 Run this first: node scripts/import-lorcana-data.js\n');
      process.exit(1);
    }

    const cardsData = fs.readFileSync(cardsPath, 'utf8');
    const cards = JSON.parse(cardsData);

    console.log(`✅ Loaded ${cards.length} cards from file\n`);

    // Cargar en batches de 50 cartas
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < cards.length; i += batchSize) {
      batches.push(cards.slice(i, i + batchSize));
    }

    console.log(`📤 Uploading in ${batches.length} batches...\n`);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`⏳ Processing batch ${i + 1}/${batches.length} (${batch.length} cards)...`);

      try {
        const response = await fetch(`${API_URL}/api/updateCards`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
          body: JSON.stringify({
            cards: batch,
            userId: 'import_script',
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success) {
          totalCreated += result.data.created.length;
          totalUpdated += result.data.updated.length;
          totalErrors += result.data.errors.length;
          
          console.log(`  ✓ Created: ${result.data.created.length}, Updated: ${result.data.updated.length}, Errors: ${result.data.errors.length}`);
        } else {
          console.error(`  ✗ Batch failed: ${result.error}`);
          totalErrors += batch.length;
        }

        // Pequeño delay entre batches
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`  ✗ Batch ${i + 1} failed:`, error.message);
        totalErrors += batch.length;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  Created: ${totalCreated}`);
    console.log(`  Updated: ${totalUpdated}`);
    console.log(`  Errors: ${totalErrors}`);
    console.log(`  Total: ${cards.length}`);

    if (totalErrors === 0) {
      console.log('\n✨ All cards loaded successfully!');
    } else {
      console.log('\n⚠️  Some cards failed to load. Check the errors above.');
    }

    console.log('\n🌐 Check your store: ' + API_URL + '/catalog\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  loadToDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { loadToDatabase };

