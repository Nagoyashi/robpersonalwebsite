// Single-note API (gated by the /admin middleware). PATCH body, DELETE.
export const prerender = false;
import type { APIRoute } from 'astro';
import { updateNote, deleteNote } from '../../../../lib/ctrl/db';

export const PATCH: APIRoute = async ({ params, request }) => {
  const payload = await request.json().catch(() => ({}));
  const ok = await updateNote(params.id!, String(payload?.body ?? ''));
  return new Response(null, { status: ok ? 204 : 500 });
};

export const DELETE: APIRoute = async ({ params }) => {
  const ok = await deleteNote(params.id!);
  return new Response(null, { status: ok ? 204 : 500 });
};
