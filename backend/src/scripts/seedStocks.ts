/**
 * Database Seeding Script
 * 
 * This script seeds the stocks table with initial stock data.
 * Run with: npm run seed (from backend directory)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

// Import database functions
import { testConnection } from '../utils/db.js';
import { initializeDatabase, bulkInsertStocks, getStocksList } from '../services/databaseService.js';
import { StockMetadata } from '../types/stock.js';

// Get current directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedDatabase() {
  console.log('='.repeat(60));
  console.log('Starting Database Seeding Process');
  console.log('='.repeat(60));

  try {
    // Step 1: Test database connection
    console.log('\n[1/4] Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Database connection failed!');
      console.error('Please ensure PostgreSQL is running and DATABASE_URL is set correctly.');
      console.error('Check your .env file or environment variables.');
      process.exit(1);
    }
    console.log('✅ Database connection successful');

    // Step 2: Initialize database schema
    console.log('\n[2/4] Initializing database schema...');
    await initializeDatabase();
    console.log('✅ Database schema initialized');

    // Step 3: Load stock data from JSON file
    console.log('\n[3/4] Loading stock data from file...');
    const dataPath = join(__dirname, '../data/stocksData.json');
    const stocksData: StockMetadata[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
    console.log(`✅ Loaded ${stocksData.length} stocks from file`);

    // Step 4: Insert stock data into database
    console.log('\n[4/4] Inserting stock data into database...');
    const insertedCount = await bulkInsertStocks(stocksData);
    console.log(`✅ Successfully inserted/updated ${insertedCount} stocks`);

    // Verification: Get count and sample data
    console.log('\n' + '='.repeat(60));
    console.log('Verification');
    console.log('='.repeat(60));
    
    const result = await getStocksList({ limit: 5 });
    console.log(`\nTotal stocks in database: ${result.total}`);
    console.log('\nSample stocks (top 5 by market cap):');
    result.stocks.forEach((stock, index) => {
      const marketCapB = stock.market_cap ? (stock.market_cap / 1e9).toFixed(1) : 'N/A';
      console.log(`  ${index + 1}. ${stock.symbol.padEnd(6)} - ${stock.name.padEnd(40)} ($${marketCapB}B)`);
    });

    // Get sectors breakdown
    console.log('\nSectors in database:');
    const sectorQuery = await getStocksList({ limit: 1000 }); // Get all for sector count
    const sectorCounts = new Map<string, number>();
    sectorQuery.stocks.forEach(stock => {
      if (stock.sector) {
        sectorCounts.set(stock.sector, (sectorCounts.get(stock.sector) || 0) + 1);
      }
    });
    
    Array.from(sectorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([sector, count]) => {
        console.log(`  - ${sector}: ${count} stocks`);
      });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Database seeding completed successfully!');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Seeding failed with error:');
    console.error('='.repeat(60));
    console.error(error);
    console.error('\nPlease check:');
    console.error('1. PostgreSQL is installed and running');
    console.error('2. Database connection settings in .env are correct');
    console.error('3. Database user has proper permissions');
    process.exit(1);
  }
}

// Run the seeding function
seedDatabase();
