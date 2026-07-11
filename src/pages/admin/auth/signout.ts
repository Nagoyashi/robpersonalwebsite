// Clear the session and return to login.
export const prerender = false;
import type { APIRoute } from 'astro';
import { serverClient, operatorLogin } from '../../../lib/ctrl/auth';
import { audit } from '../../../lib/ctrl/db';

const handler: APIRoute = async ({ cookies, request, redirect }) => {
  const supabase = serverClient(cookies, request);
  // Capture who's leaving before the session is torn down.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await audit(operatorLogin(user), 'auth.signout');
  await supabase.auth.signOut();
  return redirect('/admin/login');
};

export const GET = handler;
export const POST = handler;
