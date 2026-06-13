import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfdoklohhsklrbqdzwyt.supabase.co'
// Using service role key embedded directly for this migration
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZG9rbG9oaHNrbHJicWR6d3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDY2MzEsImV4cCI6MjA5Njc4MjYzMX0.RvtDjWiRy9iE8jDLekmycRCl2KsymuXMkd7vk_1l4CM'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  // Try inserting a test company with end_price to check if column exists
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: '__schema_test__',
      description: 'test',
      industry: 'test',
      ipo_price: 1,
      available_shares: 1,
      initial_valuation: 1,
      end_price: 100,
    })
    .select()

  if (error) {
    console.log('end_price column check result:', error.message)
    if (error.message.includes('end_price')) {
      console.log('⚠️  The "end_price" column does NOT exist in the companies table.')
      console.log('Please run the following SQL in your Supabase SQL editor:')
      console.log('\nALTER TABLE companies ADD COLUMN IF NOT EXISTS end_price numeric NOT NULL DEFAULT 0;\n')
    }
  } else {
    console.log('✓ end_price column exists. Cleaning up test row...')
    if (data?.[0]) {
      await supabase.from('companies').delete().eq('id', data[0].id)
      console.log('✓ Test row removed.')
    }
  }
}

checkSchema()
