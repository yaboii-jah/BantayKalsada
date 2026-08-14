import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function getSessionUser(
  supabase: SupabaseClient,
): Promise<User | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return session.user;
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}