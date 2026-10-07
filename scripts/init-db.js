// scripts/init-db.js — init schema + seed admin/kandidat/template
import { initSchema, blastDb, votesDb, q } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';

initSchema();

// ── Seed admin ────────────────────────────────────────────────
const ketuaPw = process.env.SEED_KETUA_PW || 'himasif2026';
const opPw = process.env.SEED_OPERATOR_PW || 'operator2026';

function upsertAdmin(username, pw, role) {
  const ex = q.get(blastDb, 'SELECT id FROM admin_users WHERE username = ?', username);
  if (ex) { console.log(`admin ${username} sudah ada`); return; }
  q.run(blastDb, 'INSERT INTO admin_users (username, password_hash, role) VALUES (?,?,?)',
    username, hashPassword(pw), role);
  console.log(`admin dibuat: ${username} (${role}) pw=${pw}  ← GANTI setelah login`);
}
upsertAdmin('ketua', ketuaPw, 'KETUA');
upsertAdmin('operator', opPw, 'OPERATOR');

// ── Seed kandidat (placeholder, edit di dashboard) ────────────
const candCount = q.get(votesDb, 'SELECT COUNT(*) c FROM candidates').c;
if (candCount === 0) {
  const cands = [
    [1, 'Kandidat 1', '#2563eb'],
    [2, 'Kandidat 2', '#dc2626'],
    [3, 'Kandidat 3', '#16a34a'],
  ];
  for (const [no, nama, warna] of cands) {
    q.run(votesDb, 'INSERT INTO candidates (nomor_urut, nama, warna) VALUES (?,?,?)', no, nama, warna);
  }
  console.log('3 kandidat placeholder dibuat');
}

// ── Seed template Versi A untuk 4 angkatan ────────────────────
const VER_A = `Halo {nama}! 👋

Voting Ketua Umum HIMASIF 2026 udah dibuka nih. Yuk pakai hak suaramu 🗳️

Kredensial kamu:
• Username: {username}
• Password: {password}

Login di sini: {link}

Suara kamu rahasia & cuma bisa dipakai sekali. Jangan dibagi ke siapa pun 🤫

Salam,
Panitia Pemilu Raya HIMASIF`;
for (const ang of [2026, 2025, 2024, 2023]) {
  q.run(blastDb,
    'INSERT OR IGNORE INTO templates (angkatan, body) VALUES (?,?)', ang, VER_A);
}

// ── Seed voting settings ──────────────────────────────────────
q.run(votesDb, "INSERT OR IGNORE INTO voting_settings (key, value) VALUES ('voting_closed','false')");
q.run(votesDb, "INSERT OR IGNORE INTO voting_settings (key, value) VALUES ('otp_enabled','false')");
q.run(blastDb, "INSERT OR IGNORE INTO settings (key, value) VALUES ('link_vote','https://blaster.tiyoouw.com/vote')");

console.log('init-db selesai');
