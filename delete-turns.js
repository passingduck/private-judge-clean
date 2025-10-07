// Delete all debate turns for the room
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

async function deleteTurns() {
  console.log('Getting round IDs for room...');

  const { data: rounds, error: roundsError } = await supabaseAdmin
    .from('rounds')
    .select('id')
    .eq('room_id', roomId);

  if (roundsError) {
    console.error('Error getting rounds:', roundsError);
    return;
  }

  const roundIds = rounds.map(r => r.id);
  console.log('Found rounds:', roundIds);

  console.log('Deleting debate turns...');

  const { error } = await supabaseAdmin
    .from('debate_turns')
    .delete()
    .in('round_id', roundIds);

  if (error) {
    console.error('Error deleting turns:', error);
  } else {
    console.log('All debate turns deleted successfully');
  }
}

deleteTurns().catch(console.error);
