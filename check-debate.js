// Check debate session, rounds, turns, and next job
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

async function checkDebate() {
  console.log('=== Checking Debate Session ===');
  const { data: sessions, error: sessionError } = await supabaseAdmin
    .from('debate_sessions')
    .select('*')
    .eq('room_id', roomId);

  if (sessionError) {
    console.error('Error fetching sessions:', sessionError);
  } else {
    console.log('Debate Sessions:', JSON.stringify(sessions, null, 2));
  }

  if (sessions && sessions.length > 0) {
    const sessionId = sessions[0].id;

    console.log('\n=== Checking Rounds ===');
    const { data: rounds, error: roundsError } = await supabaseAdmin
      .from('rounds')
      .select('*')
      .eq('debate_session_id', sessionId)
      .order('round_number', { ascending: true });

    if (roundsError) {
      console.error('Error fetching rounds:', roundsError);
    } else {
      console.log('Rounds:', JSON.stringify(rounds, null, 2));
    }

    console.log('\n=== Checking Debate Turns ===');
    const { data: turns, error: turnsError } = await supabaseAdmin
      .from('debate_turns')
      .select('*')
      .eq('debate_session_id', sessionId)
      .order('turn_number', { ascending: true });

    if (turnsError) {
      console.error('Error fetching turns:', turnsError);
    } else {
      console.log('Debate Turns:', JSON.stringify(turns, null, 2));
    }
  }

  console.log('\n=== Checking Jobs ===');
  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  if (jobsError) {
    console.error('Error fetching jobs:', jobsError);
  } else {
    console.log('Jobs:', JSON.stringify(jobs, null, 2));
  }
}

checkDebate().catch(console.error);
