import "server-only";

import { createClient, type User } from "@supabase/supabase-js";

export async function verifyAdminRequest(request: Request): Promise<User | null> {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!supabaseUrl || !publishableKey || !adminEmail) {
    throw new Error("A autenticação administrativa não está configurada.");
  }
  if (!accessToken) return null;

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user?.email_confirmed_at) return null;
  if (data.user.email?.trim().toLowerCase() !== adminEmail) return null;
  return data.user;
}
