import { currentAdmin, json, unauthorized, forbidden } from '@/lib/api.js';
import { votesDb, q } from '@/lib/db.js';

// Hasil hanya keluar kalau: admin KETUA + voting sudah DITUTUP. (reveal manual §15.5)
export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  if (admin.role !== 'KETUA') return forbidden();

  const closed = q.get(votesDb, "SELECT value FROM voting_settings WHERE key='voting_closed'")?.value === 'true';
  if (!closed) return json({ ok: false, error: 'Voting belum ditutup. Tutup dulu sebelum reveal.' }, 403);

  const results = q.all(votesDb, `
    SELECT c.id, c.nomor_urut, c.nama,
      (SELECT COUNT(*) FROM votes v WHERE v.candidate_id=c.id) suara
    FROM candidates c ORDER BY suara DESC, c.nomor_urut ASC`);
  const total = q.get(votesDb, 'SELECT COUNT(*) c FROM votes').c;
  const pemenang = results[0] || null;
  return json({ ok: true, total, results, pemenang });
}
