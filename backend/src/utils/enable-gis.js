const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function enablePostGIS() {
  try {
    await client.connect();
    console.log('🔄 Conectado a Supabase, activando PostGIS...');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('✅ PostGIS activada correctamente');
  } catch (err) {
    console.error('❌ Error activando PostGIS:', err);
  } finally {
    await client.end();
  }
}

enablePostGIS();
