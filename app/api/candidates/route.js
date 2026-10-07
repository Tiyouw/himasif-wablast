import { currentAdmin, json, unauthorized, forbidden } from '@/lib/api.js';
import { votesDb, q } from '@/lib/db.js';

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  return json({ ok: true, candidates: q.all(votesDb, 'SELECT * FROM candidates ORDER BY nomor_urut') });
}

// KETUA only: ganti nama/warna kandidat
export async function POST(req) {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  if (admin.role !== 'KETUA') return forbidden();
  const { id, nama, warna, foto_url } = await req.json().catch(() => ({}));
  if (!id) return json({ ok: false, error: 'id wajib' }, 400);
  q.run(votesDb, 'UPDATE candidates SET nama=COALESCE(?,nama), warna=COALESCE(?,warna), foto_url=COALESCE(?,foto_url) WHERE id=?',
    nama ?? null, warna ?? null, foto_url ?? null, parseInt(id, 10));
  return json({ ok: true });
}
