import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iiqagflecpuurduxpvem.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HxKAW59Nf55_gQOA8uUbDQ_L3oYkqzH";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
