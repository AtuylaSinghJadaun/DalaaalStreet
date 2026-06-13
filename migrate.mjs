import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:1RzLBo1rDlmDRJ0W@db.hfdoklohhsklrbqdzwyt.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function migrate() {
  await client.connect()
  console.log('Connected to Supabase database')

  try {
    // Add end_price column to companies
    await client.query(`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS end_price numeric NOT NULL DEFAULT 0;
    `)
    console.log('✓ Added end_price column to companies table')

    // Make sure global_state has ipo_min_spend column
    await client.query(`
      ALTER TABLE global_state 
      ADD COLUMN IF NOT EXISTS ipo_min_spend numeric NOT NULL DEFAULT 100000;
    `)
    console.log('✓ Ensured ipo_min_spend column in global_state')

    console.log('\n✅ Migration complete!')
  } catch (err) {
    console.error('Migration error:', err.message)
  } finally {
    await client.end()
  }
}

migrate()
