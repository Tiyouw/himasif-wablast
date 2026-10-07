import { currentAdmin, json, unauthorized, forbidden } from '@/lib/api.js';
import { votesDb, q } from '@/lib/db.js';

// GET → status tutup/buka. POST { closed:boolean } → tutup/buka voting (KETUA).
export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  const closed = q.get(votesDb, "SELECT value FROM voting_settings WHERE key='voting_closed'")?.value === 'true';
  return json({ ok: true, closed });
}

export async function POST(req) {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  if (admin.role !== 'KETUA') return forbidden();
  const { closed } = await req.json().catch(() => ({}));
  q.run(votesDb, "UPDATE voting_settings SET value=? WHERE key='voting_closed'",
    closed ? 'true' : 'false');
  return json({ ok: true, closed: !!closed });
}
