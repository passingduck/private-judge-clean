// Check debate turns table directly
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const roomId = 'b98febe6-00b6-48dd-ac1a-3a36a94c12e1';

async function checkTurns() {
  console.log('=== Checking all tables ===');

  // List all tables
  const { data: tables, error: tablesError } = await supabaseAdmin
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  if (!tablesError && tables) {
    console.log('Available tables:', tables.map(t => t.table_name));
  }

  console.log('\n=== Checking debate_turns ===');
  const { data: turns, error: turnsError } = await supabaseAdmin
    .from('debate_turns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (turnsError) {
    console.error('Error fetching turns:', turnsError);
  } else {
    console.log('Recent Debate Turns:', JSON.stringify(turns, null, 2));
  }

  console.log('\n=== Checking rounds ===');
  const { data: rounds, error: roundsError } = await supabaseAdmin
    .from('rounds')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (roundsError) {
    console.error('Error fetching rounds:', roundsError);
  } else {
    console.log('Recent Rounds:', JSON.stringify(rounds, null, 2));
  }
}

checkTurns().catch(console.error);
