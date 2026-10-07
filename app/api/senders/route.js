import { currentAdmin, json, unauthorized } from '@/lib/api.js';
import { blastDb, q } from '@/lib/db.js';
import QRCode from 'qrcode';

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  const sender = q.get(blastDb, 'SELECT id, label, phone, status, updated_at FROM senders ORDER BY id LIMIT 1');
  if (!sender) return json({ ok: true, sender: null, qr: null });
  const qrRow = q.get(blastDb, 'SELECT qr FROM senders WHERE id=?', sender.id);
  let qrDataUrl = null;
  if (qrRow?.qr && sender.status !== 'CONNECTED') {
    try { qrDataUrl = await QRCode.toDataURL(qrRow.qr, { width: 260, margin: 1 }); } catch {}
  }
  return json({ ok: true, sender, qr: qrDataUrl });
}
