import { currentAdmin, json, unauthorized, forbidden } from '@/lib/api.js';
import { blastDb, q } from '@/lib/db.js';

// GET: daftar job + status ringkas
export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  const jobs = q.all(blastDb, `
    SELECT j.*,
      (SELECT COUNT(*) FROM blast_log WHERE job_id=j.id) total,
      (SELECT COUNT(*) FROM blast_log WHERE job_id=j.id AND status='SENT') sent,
      (SELECT COUNT(*) FROM blast_log WHERE job_id=j.id AND status='FAILED') failed,
      (SELECT COUNT(*) FROM blast_log WHERE job_id=j.id AND status='QUEUED') queued
    FROM blast_jobs j ORDER BY j.id DESC LIMIT 20`);
  return json({ ok: true, jobs });
}

// POST: buat + start job untuk satu angkatan
export async function POST(req) {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  if (admin.role !== 'OPERATOR' && admin.role !== 'KETUA')
    return forbidden();

  const { angkatan } = await req.json().catch(() => ({}));
  const ang = parseInt(angkatan, 10);
  if (!ang) return json({ ok: false, error: 'angkatan wajib' }, 400);

  const run = q.get(blastDb, "SELECT id FROM blast_jobs WHERE status='RUNNING'");
  if (run) return json({ ok: false, error: 'Masih ada job RUNNING. Selesaikan/pause dulu.' }, 409);

  const sender = q.get(blastDb, 'SELECT id, status FROM senders ORDER BY id LIMIT 1');
  if (!sender || sender.status !== 'CONNECTED')
    return json({ ok: false, error: 'Sender WhatsApp belum terhubung (scan QR dulu).' }, 409);

  const contacts = q.all(blastDb, 'SELECT id FROM contacts WHERE angkatan=?', ang);
  if (!contacts.length) return json({ ok: false, error: `Tidak ada kontak angkatan ${ang}` }, 400);

  const job = q.run(blastDb, `INSERT INTO blast_jobs (angkatan, sender_id, status, created_by, started_at)
    VALUES (?,?,'RUNNING',?,datetime('now'))`, ang, sender.id, admin.id);
  const jobId = job.lastInsertRowid;
  for (const c of contacts)
    q.run(blastDb, 'INSERT INTO blast_log (job_id, contact_id, status) VALUES (?,?,?)', jobId, c.id, 'QUEUED');

  return json({ ok: true, jobId, total: contacts.length });
}
