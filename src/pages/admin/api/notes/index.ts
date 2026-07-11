// Notes collection API (gated by the /admin middleware). GET list, POST create.
export const prerender = false;
import type { APIRoute } from 'astro';
import { listNotes, createNote, audit } from '../../../../lib/ctrl/db';

const FOLDERS = ['Projects', 'Ideas', 'Personal'] as const;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const GET: APIRoute = async () => json(await listNotes());

export const POST: APIRoute = async ({ request, locals }) => {
  const payload = await request.json().catch(() => ({}));
  const folder = FOLDERS.includes(payload?.folder) ? payload.folder : 'Projects';
  const note = await createNote(folder);
  if (note) await audit(locals.operator ?? '', 'note.create', note.id, { folder });
  return note ? json(note, 201) : json({ error: 'create failed' }, 500);
};
