import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseUrl = "https://xkvjnusscnmwhvvulahm.supabase.co";
const supabaseAnonKey = "sb_publishable_-poBoYXTOSDnpnoZdUuB4Q_2IR8RQM8";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
