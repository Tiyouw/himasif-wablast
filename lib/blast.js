// lib/blast.js — logika blast bersama (API + worker)
import { blastDb, q } from './db.js';

export function renderTemplate(body, contact, link) {
  return String(body || '')
    .replaceAll('{nama}', contact.nama || '')
    .replaceAll('{nim}', contact.nim || '')
    .replaceAll('{username}', contact.username || '')
    .replaceAll('{password}', contact.password || '')
    .replaceAll('{link}', link || '');
}

// menit sejak 00:00 di zona Asia/Jakarta
export function nowJakartaMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date()).split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export function hhmmToMinutes(s) {
  const [h, m] = String(s || '08:00').split(':').map(n => parseInt(n, 10));
  return h * 60 + (m || 0);
}

export function inWindow(start, end) {
  const now = nowJakartaMinutes();
  return now >= hhmmToMinutes(start) && now < hhmmToMinutes(end);
}

export function getSetting(key, def = null) {
  const r = q.get(blastDb, 'SELECT value FROM settings WHERE key=?', key);
  return r ? r.value : def;
}

export function getRunningJob() {
  return q.get(blastDb, "SELECT * FROM blast_jobs WHERE status='RUNNING' ORDER BY id LIMIT 1");
}

export function nextQueued(jobId) {
  return q.get(blastDb, `
    SELECT bl.id AS log_id, c.* FROM blast_log bl
    JOIN contacts c ON c.id = bl.contact_id
    WHERE bl.job_id=? AND bl.status='QUEUED'
    ORDER BY bl.id LIMIT 1`, jobId);
}
