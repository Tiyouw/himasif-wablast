import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { blastDb, votesDb, q } from '@/lib/db.js';

// rate limit sederhana (in-memory): max 12 percobaan / menit / IP
const RL = new Map();
function rlHit(ip) {
  const now = Date.now();
  const rec = RL.get(ip) || { n: 0, t: now };
  if (now - rec.t > 60000) { rec.n = 0; rec.t = now; }
  rec.n++; RL.set(ip, rec);
  return rec.n <= 12;
}

const closed = () => {
  const r = q.get(votesDb, "SELECT value FROM voting_settings WHERE key='voting_closed'");
  return r?.value === 'true';
};

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
  if (!rlHit(ip))
    return NextResponse.json({ ok: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });

  const { username, password, candidateId } = await req.json().catch(() => ({}));
  if (!username || !password || !candidateId)
    return NextResponse.json({ ok: false, error: 'Lengkapi kredensial & pilihan' }, { status: 400 });

  if (closed())
    return NextResponse.json({ ok: false, error: 'Voting sudah ditutup' }, { status: 403 });

  const c = q.get(blastDb, 'SELECT * FROM contacts WHERE username=?', String(username).trim());
  if (!c || c.password !== String(password).trim())
    return NextResponse.json({ ok: false, error: 'Username atau password salah' }, { status: 401 });

  const cand = q.get(votesDb, 'SELECT id FROM candidates WHERE id=?', parseInt(candidateId, 10));
  if (!cand) return NextResponse.json({ ok: false, error: 'Kandidat tidak valid' }, { status: 400 });

  const existed = q.get(votesDb, 'SELECT id FROM votes WHERE contact_id=?', c.id);
  if (existed)
    return NextResponse.json({ ok: false, error: 'Kamu sudah memberikan suara' }, { status: 409 });

  const ipHash = crypto.createHash('sha256').update(String(ip) + '|himasif').digest('hex').slice(0, 32);
  try {
    q.run(votesDb,
      'INSERT INTO votes (contact_id, candidate_id, angkatan, ip_hash) VALUES (?,?,?,?)',
      c.id, cand.id, c.angkatan, ipHash);
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan suara' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: 'Suara kamu tersimpan. Terima kasih!' });
}
