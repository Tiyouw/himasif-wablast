import { currentAdmin, json, unauthorized } from '@/lib/api.js';
import { blastDb, q } from '@/lib/db.js';

// GET ?jobId=  → recap per penerima. Tanpa jobId → ringkas per angkatan.
export async function GET(req) {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  const sp = new URL(req.url).searchParams;
  const jobId = sp.get('jobId');

  if (jobId) {
    const rows = q.all(blastDb, `
      SELECT bl.status, bl.error, bl.sent_at, c.nama, c.nim, c.angkatan, c.phone
      FROM blast_log bl JOIN contacts c ON c.id = bl.contact_id
      WHERE bl.job_id=? ORDER BY bl.id`, parseInt(jobId, 10));
    return json({ ok: true, rows });
  }

  const summary = q.all(blastDb, `
    SELECT c.angkatan,
      COUNT(*) total,
      SUM(CASE WHEN bl.status='SENT' THEN 1 ELSE 0 END) sent,
      SUM(CASE WHEN bl.status='FAILED' THEN 1 ELSE 0 END) failed,
      SUM(CASE WHEN bl.status='QUEUED' THEN 1 ELSE 0 END) queued
    FROM blast_log bl JOIN contacts c ON c.id=bl.contact_id
    GROUP BY c.angkatan ORDER BY c.angkatan DESC`);
  return json({ ok: true, summary });
}
