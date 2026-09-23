import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kkfcgwnrdpmdkjbiixno.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_63e4WGR1IRsl5Ugy3MKwnA_iT5cETPb";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("email", "irvanmeda23@lentera.com");

  if (error) {
    console.error("Error updating:", error);
  } else {
    console.log("Success:", data);
  }
}
main();
