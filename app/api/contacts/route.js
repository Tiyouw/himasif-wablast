import { currentAdmin, json, unauthorized } from '@/lib/api.js';
import { blastDb, q } from '@/lib/db.js';
import { normalizePhone, parseCsv } from '@/lib/phone.js';
import { randomBytes } from 'node:crypto';

function genUser(nim, nama) {
  const base = (nim || (nama || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8));
  return base + randomBytes(2).toString('hex');
}
function genPass() { return String(Math.floor(100000 + Math.random() * 900000)); }

export async function GET(req) {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  const ang = new URL(req.url).searchParams.get('angkatan');
  const perAngkatan = q.all(blastDb,
    'SELECT angkatan, COUNT(*) total FROM contacts GROUP BY angkatan ORDER BY angkatan DESC');
  const total = q.get(blastDb, 'SELECT COUNT(*) c FROM contacts').c;
  const list = ang
    ? q.all(blastDb, 'SELECT * FROM contacts WHERE angkatan=? ORDER BY nama LIMIT 500', parseInt(ang, 10))
    : [];
  return json({ ok: true, total, perAngkatan, contacts: list });
}

export async function POST(req) {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const rows = body.csv ? parseCsv(body.csv) : (body.rows || []);
  if (!rows.length) return json({ ok: false, error: 'Tidak ada baris untuk diimpor' }, 400);

  let inserted = 0, skipped = 0;
  const errors = [];
  for (const r of rows) {
    const ang = r.angkatan || body.defaultAngkatan;
    if (!ang) { skipped++; errors.push(`baris tanpa angkatan: ${r.nama || r.phone}`); continue; }
    const phone = normalizePhone(r.phone);
    if (!phone) { skipped++; errors.push(`nomor invalid: ${r.phone} (${r.nama || ''})`); continue; }
    const username = r.username || genUser(r.nim, r.nama);
    const password = r.password || genPass();
    const dup = q.get(blastDb, 'SELECT id FROM contacts WHERE phone=? AND angkatan=?', phone, ang);
    if (dup) { skipped++; continue; }
    try {
      q.run(blastDb,
        'INSERT INTO contacts (angkatan, nim, nama, phone, username, password, consent) VALUES (?,?,?,?,?,?,1)',
        ang, r.nim, r.nama, phone, username, password);
      inserted++;
    } catch (e) { skipped++; errors.push(`gagal: ${r.nama} — ${e.message}`); }
  }
  return json({ ok: true, inserted, skipped, errors: errors.slice(0, 40) });
}

export async function DELETE(req) {
  const admin = await currentAdmin();
  if (!admin || admin.role !== 'KETUA') return json({ ok: false, error: 'Hanya KETUA' }, 403);
  const ang = new URL(req.url).searchParams.get('angkatan');
  if (!ang) return json({ ok: false, error: 'angkatan wajib' }, 400);
  const r = q.run(blastDb, 'DELETE FROM contacts WHERE angkatan=?', parseInt(ang, 10));
  return json({ ok: true, deleted: r.changes });
}
