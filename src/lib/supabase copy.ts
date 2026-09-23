import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kkfcgwnrdpmdkjbiixno.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_63e4WGR1IRsl5Ugy3MKwnA_iT5cETPb";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
