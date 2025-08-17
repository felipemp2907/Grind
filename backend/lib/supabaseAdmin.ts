import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ovvihfhkhqigzahlttyf.supabase.co';
const fallbackServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE0NDYwMiwiZXhwIjoyMDYyNzIwNjAyfQ.SCVexKSM6ktxwCnkq-mM8q6XoJsWCgiymSWcqmUde-Y';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fallbackServiceKey;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

console.log('Supabase Admin client initialized with URL:', supabaseUrl);