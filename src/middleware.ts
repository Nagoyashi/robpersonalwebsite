/**
 * middleware.ts — gate the private plane (ADR-012).
 *
 * Runs for on-demand routes at request time. Only /admin is guarded; the public
 * static plane passes straight through (and prerenders unaffected at build). The
 * login + OAuth callback routes are open so there's no redirect loop. Fails
 * closed: any unauthenticated or non-allowlisted request is bounced to login.
 */
import { defineMiddleware } from 'astro:middleware';

const isOpen = (path: string) => path.startsWith('/admin/login') || path.startsWith('/admin/auth/');

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  if (!path.startsWith('/admin') || isOpen(path)) return next();

  // Load the Supabase auth deps only for guarded /admin requests — never during
  // public-page prerender (keeps supabase/tslib out of the static build).
  const { serverClient, isAllowed } = await import('./lib/ctrl/auth');
  const supabase = serverClient(context.cookies, context.request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAllowed(user)) return context.redirect('/admin/login');
  return next();
});
