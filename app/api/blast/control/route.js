import { currentAdmin, json, unauthorized, forbidden } from '@/lib/api.js';
import { blastDb, q } from '@/lib/db.js';

// POST { jobId, action: 'pause' | 'resume' | 'stop' }
export async function POST(req) {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  if (admin.role !== 'OPERATOR' && admin.role !== 'KETUA') return forbidden();

  const { jobId, action } = await req.json().catch(() => ({}));
  if (!jobId || !action) return json({ ok: false, error: 'jobId & action wajib' }, 400);

  const job = q.get(blastDb, 'SELECT * FROM blast_jobs WHERE id=?', jobId);
  if (!job) return json({ ok: false, error: 'Job tidak ditemukan' }, 404);

  if (action === 'pause') {
    q.run(blastDb, "UPDATE blast_jobs SET status='PAUSED' WHERE id=?", jobId);
  } else if (action === 'resume') {
    q.run(blastDb, "UPDATE blast_jobs SET status='RUNNING' WHERE id=?", jobId);
  } else if (action === 'stop') {
    q.run(blastDb, "UPDATE blast_jobs SET status='STOPPED', finished_at=datetime('now') WHERE id=?", jobId);
    q.run(blastDb, "UPDATE blast_log SET status='FAILED', error='stopped by admin' WHERE job_id=? AND status='QUEUED'", jobId);
  } else {
    return json({ ok: false, error: 'action invalid' }, 400);
  }
  return json({ ok: true });
}
