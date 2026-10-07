import { NextResponse } from 'next/server';
import { votesDb, q } from '@/lib/db.js';

// PUBLIC — daftar kandidat untuk halaman voting (tanpa data sensitif).
export async function GET() {
  const closed = q.get(votesDb, "SELECT value FROM voting_settings WHERE key='voting_closed'")?.value === 'true';
  const candidates = q.all(votesDb,
    'SELECT id, nomor_urut, nama, warna FROM candidates ORDER BY nomor_urut');
  return NextResponse.json({ ok: true, closed, candidates }, { headers: { 'Cache-Control': 'no-store' } });
}
