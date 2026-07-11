// OAuth return: exchange the code for a session, then enforce the allowlist.
// A non-allowlisted GitHub user is signed straight back out.
export const prerender = false;
import type { APIRoute } from 'astro';
import { serverClient, isAllowed, operatorLogin } from '../../../lib/ctrl/auth';
import { audit } from '../../../lib/ctrl/db';

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
    // Record the rejected sign-in before bouncing (a denied login is a signal).
    await audit(operatorLogin(user) || 'anonymous', 'auth.denied');
    await supabase.auth.signOut();
    return redirect('/admin/login?error=denied');
  }
  await audit(operatorLogin(user), 'auth.signin');
  return redirect('/admin');
};
