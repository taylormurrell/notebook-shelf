import { createBrowserClient } from "@supabase/ssr";

// True only when both public env vars are present. Used to show a friendly
// "not configured yet" state instead of crashing before Supabase is set up.
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Browser (client component) Supabase client. Uses only the public anon key,
// which is safe on the client because access is enforced by Row Level Security.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
