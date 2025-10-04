// Test script to debug motion query issue
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

console.log('Environment check:');
console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_SERVICE_ROLE:', supabaseServiceRole ? 'Set' : 'NOT SET');

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const roomId = 'b98febe6-00b6-48dd-ac1a-3a36a94c12e1';

async function testMotionQuery() {
  console.log('\n=== Test 1: Query with admin client ===');
  const { data: motionData, error: motionError } = await supabaseAdmin
    .from('motions')
    .select('id, title, description, status, agreed_at')
    .eq('room_id', roomId)
    .eq('status', 'agreed')
    .single();

  console.log('Motion Data:', motionData);
  console.log('Motion Error:', motionError);

  console.log('\n=== Test 2: Query all motions for room ===');
  const { data: allMotions, error: allError } = await supabaseAdmin
    .from('motions')
    .select('*')
    .eq('room_id', roomId);

  console.log('All Motions:', allMotions);
  console.log('All Motions Error:', allError);

  console.log('\n=== Test 3: Query room ===');
  const { data: roomData, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  console.log('Room Data:', roomData);
  console.log('Room Error:', roomError);
}

testMotionQuery().catch(console.error);
