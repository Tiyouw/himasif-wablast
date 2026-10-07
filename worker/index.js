// worker/index.js — proses Baileys + engine blast
// Jalankan terpisah:  node worker/index.js
import makeWASocket, {
  useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'node:path';
import fs from 'node:fs';
import { blastDb, q, initSchema } from '../lib/db.js';
import { renderTemplate, getRunningJob, nextQueued, inWindow, getSetting } from '../lib/blast.js';

initSchema();

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const AUTH_DIR = path.join(DATA_DIR, 'baileys_auth');
fs.mkdirSync(AUTH_DIR, { recursive: true });
const logger = pino({ level: 'silent' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// pastikan ada baris sender
if (!q.get(blastDb, 'SELECT id FROM senders LIMIT 1')) {
  q.run(blastDb, "INSERT INTO senders (label, status) VALUES ('Nomor Panitia', 'DISCONNECTED')");
}
const SENDER_ID = q.get(blastDb, 'SELECT id FROM senders ORDER BY id LIMIT 1').id;

let sock = null;
let sending = false;

function setSender(patch = {}) {
  const cols = Object.keys(patch);
  if (!cols.length) return;
  const set = cols.map(c => `${c}=?`).join(', ');
  q.run(blastDb, `UPDATE senders SET ${set}, updated_at=datetime('now') WHERE id=?`,
    ...cols.map(c => patch[c]), SENDER_ID);
}

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({
    version, auth: state, logger,
    printQRInTerminal: false,
    browser: ['HIMASIF Blast', 'Chrome', '1.0.0'],
  });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) setSender({ qr, status: 'DISCONNECTED' });
    if (connection === 'open') {
      const phone = (sock.user?.id || '').split(':')[0].split('@')[0];
      setSender({ status: 'CONNECTED', qr: null, phone });
      console.log('[worker] WA connected:', phone);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      setSender({ status: 'DISCONNECTED' });
      console.log('[worker] WA closed, code=', code, 'loggedOut=', loggedOut);
      if (!loggedOut) setTimeout(() => startSock().catch(e => console.error(e)), 3000);
    }
  });
}

async function tick() {
  if (sending) return;
  if (!sock) return;
  const st = q.get(blastDb, 'SELECT status FROM senders WHERE id=?', SENDER_ID);
  if (!st || st.status !== 'CONNECTED') return;

  const job = getRunningJob();
  if (!job) return;
  if (!inWindow(job.window_start, job.window_end)) return; // di luar jam, tunggu

  const row = nextQueued(job.id);
  if (!row) {
    q.run(blastDb, "UPDATE blast_jobs SET status='DONE', finished_at=datetime('now') WHERE id=?", job.id);
    console.log('[worker] job', job.id, 'selesai');
    return;
  }

  sending = true;
  const link = getSetting('link_vote', 'https://blaster.tiyoouw.com/vote');
  const tpl = q.get(blastDb, 'SELECT body FROM templates WHERE angkatan=?', job.angkatan);
  const text = renderTemplate(tpl?.body || 'Halo {nama}, kredensial: {username}/{password} — {link}', row, link);

  q.run(blastDb, "UPDATE blast_log SET status='SENDING' WHERE id=?", row.log_id);
  try {
    const jid = row.phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    await sock.sendMessage(jid, { text });
    q.run(blastDb, "UPDATE blast_log SET status='SENT', sent_at=datetime('now') WHERE id=?", row.log_id);
    console.log('[worker] SENT', row.phone, row.nama);
  } catch (e) {
    q.run(blastDb, "UPDATE blast_log SET status='FAILED', error=? WHERE id=?", String(e.message || e).slice(0, 200), row.log_id);
    console.log('[worker] FAILED', row.phone, e.message);
  }

  const min = job.throttle_min_ms || 5000, max = job.throttle_max_ms || 10000;
  await sleep(min + Math.random() * (max - min));
  sending = false;
}

(async () => {
  await startSock();
  setInterval(() => tick().catch(e => console.error('[worker] tick err', e)), 2000);
  console.log('[worker] jalan. tick tiap 2s. window dari blast_jobs.');
})();
