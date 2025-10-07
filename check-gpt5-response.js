// Check what GPT-5 actually returned
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function checkGPT5Response() {
  console.log('=== Checking latest debate turn content ===');

  const { data: turns, error } = await supabaseAdmin
    .from('debate_turns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (turns && turns.length > 0) {
    const turn = turns[0];
    console.log('\nLatest turn:', {
      id: turn.id,
      round_id: turn.round_id,
      side: turn.side,
      created_at: turn.created_at
    });

    console.log('\nContent structure:');
    console.log(JSON.stringify(turn.content, null, 2));

    // If there's a data field in success case
    if (turn.content.data) {
      console.log('\nActual GPT-5 response (content.data):');
      console.log(JSON.stringify(turn.content.data, null, 2));
    }
  }
}

checkGPT5Response().catch(console.error);
