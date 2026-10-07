// scripts/reset-data.js — hapus DB + state Baileys (mulai bersih)
import fs from 'node:fs';
import path from 'node:path';

const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const targets = ['blast.sqlite', 'blast.sqlite-wal', 'blast.sqlite-shm',
                 'votes.sqlite', 'votes.sqlite-wal', 'votes.sqlite-shm'];
for (const t of targets) {
  const p = path.join(dir, t);
  try { fs.rmSync(p); console.log('hapus', p); } catch {}
}
try { fs.rmSync(path.join(dir, 'baileys_auth'), { recursive: true, force: true }); console.log('hapus baileys_auth'); } catch {}
console.log('reset-data selesai. Jalankan: npm run init-db');
