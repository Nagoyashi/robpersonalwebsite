/**
 * auth.ts — control-center authentication (ADR-012).
 *
 * GitHub OAuth via Supabase Auth, allowlisted to a single operator. All auth
 * runs server-side (SSR + API routes); the publishable/anon key + URL are read
 * as server env vars. The Supabase session lives in httpOnly cookies managed by
 * @supabase/ssr — never touched by client JS.
 */
import { createServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

// Static import.meta.env access (Vite only resolves literal keys — a dynamic
// import.meta.env[k] silently misses custom vars) + process.env for the Vercel
// runtime. These are non-rotating, non-secret values (URL, publishable key,
// a GitHub login).
const SUPABASE_URL = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

/** GitHub login allowed into /admin (single operator). */
const ADMIN_LOGIN = (import.meta.env.ADMIN_GITHUB_LOGIN || process.env.ADMIN_GITHUB_LOGIN || '').toLowerCase();

function parseCookieHeader(header: string | null): { name: string; value: string }[] {
  if (!header) return [];
  return header
    .split(';')
    .map((pair) => {
      const eq = pair.indexOf('=');
      if (eq < 0) return null;
      return { name: pair.slice(0, eq).trim(), value: decodeURIComponent(pair.slice(eq + 1).trim()) };
    })
    .filter((c): c is { name: string; value: string } => Boolean(c && c.name));
}

/** A request-scoped Supabase client bound to Astro's cookies (@supabase/ssr). */
export function serverClient(cookies: AstroCookies, request: Request) {
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('cookie')),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) cookies.set(name, value, options);
      },
    },
  });
}

/** True only for the allowlisted GitHub operator. Fails closed. */
export function isAllowed(user: { user_metadata?: Record<string, unknown> } | null): boolean {
  if (!user || !ADMIN_LOGIN) return false;
  const meta = user.user_metadata ?? {};
  const login = String(meta.user_name ?? meta.preferred_username ?? '').toLowerCase();
  return Boolean(login) && login === ADMIN_LOGIN;
}

export const authConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY && ADMIN_LOGIN);
