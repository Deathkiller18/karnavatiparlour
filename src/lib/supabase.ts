import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
// Supabase calls this key "anon" (old projects) or "publishable" (new projects / Vercel integration).
const key = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
)?.trim();

let client: SupabaseClient | null = null;
let problem = "";
if (url && key) {
  try {
    client = createClient(url, key);
  } catch (e) {
    problem = (e as Error).message;
  }
} else if (url || key) {
  problem = url ? "Supabase key is missing" : "NEXT_PUBLIC_SUPABASE_URL is missing";
}

/** null when env vars are missing → the app runs in demo mode (data in this browser only). */
export const supabase = client;
/** Set when the env vars are present but wrong, so the app can say so instead of crashing. */
export const configError = problem;
