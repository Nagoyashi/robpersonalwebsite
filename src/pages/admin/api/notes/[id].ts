// Single-note API (gated by the /admin middleware). PATCH body, DELETE.
export const prerender = false;
import type { APIRoute } from 'astro';
import { updateNote, deleteNote, audit } from '../../../../lib/ctrl/db';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const payload = await request.json().catch(() => ({}));
  const ok = await updateNote(params.id!, String(payload?.body ?? ''));
  if (ok) await audit(locals.operator ?? '', 'note.update', params.id!);
  return new Response(null, { status: ok ? 204 : 500 });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const ok = await deleteNote(params.id!);
  if (ok) await audit(locals.operator ?? '', 'note.delete', params.id!);
  return new Response(null, { status: ok ? 204 : 500 });
};
