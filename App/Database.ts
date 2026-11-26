
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'Hide406';

const SUPABASE_ANON_KEY = 'Hide406#crn';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
