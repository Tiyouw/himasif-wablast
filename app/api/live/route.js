import { NextResponse } from 'next/server';
import { votesDb, blastDb, q } from '@/lib/db.js';

// PUBLIC — TANPA auth. HANYA partisipasi, NOL data kandidat.
export async function GET() {
  const closed = q.get(votesDb, "SELECT value FROM voting_settings WHERE key='voting_closed'")?.value === 'true';
  const perAngkatan = q.all(votesDb,
    'SELECT angkatan, COUNT(*) n FROM votes GROUP BY angkatan ORDER BY angkatan DESC');
  const totalVotes = q.get(votesDb, 'SELECT COUNT(*) c FROM votes').c;
  const totalPemilih = q.get(blastDb, 'SELECT COUNT(*) c FROM contacts').c;

  return NextResponse.json({
    ok: true,
    closed,
    totalVotes,
    totalPemilih,
    perAngkatan,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
