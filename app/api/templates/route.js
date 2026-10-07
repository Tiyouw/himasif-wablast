import { currentAdmin, json, unauthorized, forbidden } from '@/lib/api.js';
import { blastDb, q } from '@/lib/db.js';

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  const templates = q.all(blastDb, 'SELECT * FROM templates ORDER BY angkatan DESC');
  return json({ ok: true, templates });
}

export async function POST(req) {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  const { angkatan, body } = await req.json().catch(() => ({}));
  if (!angkatan || body == null) return json({ ok: false, error: 'angkatan & body wajib' }, 400);
  q.run(blastDb, `
    INSERT INTO templates (angkatan, body, updated_at) VALUES (?,?,datetime('now'))
    ON CONFLICT(angkatan) DO UPDATE SET body=excluded.body, updated_at=datetime('now')`,
    parseInt(angkatan, 10), body);
  return json({ ok: true });
}
