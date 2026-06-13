import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfdoklohhsklrbqdzwyt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZG9rbG9oaHNrbHJicWR6d3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDY2MzEsImV4cCI6MjA5Njc4MjYzMX0.RvtDjWiRy9iE8jDLekmycRCl2KsymuXMkd7vk_1l4CM'
const supabase = createClient(supabaseUrl, supabaseKey)

async function resetDb() {
  console.log('Resetting Database...')

  const tables = ['bids', 'auctions', 'trades', 'holdings', 'inventory', 'round_prices', 'rounds', 'companies', 'teams']
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().gte('id', '00000000-0000-0000-0000-000000000000')
    if (error) console.error(`Error clearing ${table}:`, error.message)
    else console.log(`✓ Cleared ${table}`)
  }

  // Reset global state back to setup phase
  const { error } = await supabase.from('global_state').update({
    current_phase: 'setup',
    initial_team_balance: 1000000,
    ipo_min_spend: 100000,
  }).eq('id', 1)

  if (error) console.error('Error resetting global state:', error.message)
  else console.log('✓ Reset global_state to setup phase')

  console.log('\n✅ Database reset complete! You can now restart the setup wizard.')
}

resetDb()
