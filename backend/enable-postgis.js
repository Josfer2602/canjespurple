const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/app-canjes'
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('PostGIS extension enabled');
  } catch (err) {
    console.error('Error enabling PostGIS:', err);
  } finally {
    await client.end();
  }
}

main();
