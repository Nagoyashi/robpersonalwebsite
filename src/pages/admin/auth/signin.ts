// Kick off GitHub OAuth via Supabase. Redirects to GitHub; Supabase brokers the
// callback and sends the user back to /admin/auth/callback.
export const prerender = false;
import type { APIRoute } from 'astro';
import { serverClient } from '../../../lib/ctrl/auth';

export const GET: APIRoute = async ({ cookies, request, url, redirect }) => {
  const supabase = serverClient(cookies, request);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${url.origin}/admin/auth/callback` },
  });
  if (error || !data?.url) return redirect('/admin/login?error=oauth');
  return redirect(data.url);
};
