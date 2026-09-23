import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://amhvcqnnszitddprkpep.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kvyY0mOUzZvj8bsYmOsGMg_O3lz6_4A";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
