// OAuth return: exchange the code for a session, then enforce the allowlist.
// A non-allowlisted GitHub user is signed straight back out.
export const prerender = false;
import type { APIRoute } from 'astro';
import { serverClient, isAllowed } from '../../../lib/ctrl/auth';

export const GET: APIRoute = async ({ cookies, request, url, redirect }) => {
  const code = url.searchParams.get('code');
  if (!code) return redirect('/admin/login?error=nocode');

  const supabase = serverClient(cookies, request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirect('/admin/login?error=exchange');

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAllowed(user)) {
    await supabase.auth.signOut();
    return redirect('/admin/login?error=denied');
  }
  return redirect('/admin');
};
