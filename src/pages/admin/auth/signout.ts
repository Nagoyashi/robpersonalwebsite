// Clear the session and return to login.
export const prerender = false;
import type { APIRoute } from 'astro';
import { serverClient } from '../../../lib/ctrl/auth';

const handler: APIRoute = async ({ cookies, request, redirect }) => {
  const supabase = serverClient(cookies, request);
  await supabase.auth.signOut();
  return redirect('/admin/login');
};

export const GET = handler;
export const POST = handler;
