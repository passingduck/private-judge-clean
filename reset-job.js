// Reset stuck job to queued status
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const jobId = '1c2a1363-5711-49c5-8616-f00effcd3c0d'; // Round 1 job

async function resetJob() {
  console.log('Resetting job to queued status...');

  const { data, error } = await supabaseAdmin
    .from('jobs')
    .update({
      status: 'queued',
      error_message: null,
      result: null
    })
    .eq('id', jobId)
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Job reset successfully:', data);
  }
}

resetJob().catch(console.error);
