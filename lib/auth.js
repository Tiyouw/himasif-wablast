// lib/auth.js — sesi opak server-side (pola BLASTR: HttpOnly, token acak, exp pendek)
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { blastDb, q } from './db.js';

export const COOKIE_NAME = 'hb_session';
const SESSION_HOURS = 12;

export const hashPassword = (pw) => bcrypt.hashSync(pw, 10);
export const verifyPassword = (pw, hash) => bcrypt.compareSync(pw, hash);

export function createSession(adminId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  q.run(blastDb,
    'INSERT INTO sessions (token, admin_id, expires_at) VALUES (?, ?, ?)',
    token, adminId, expires);
  return { token, expires, maxAge: SESSION_HOURS * 3600 };
}

export function getSessionAdmin(token) {
  if (!token) return null;
  const row = q.get(blastDb, `
    SELECT s.token, s.expires_at, a.id, a.username, a.role
    FROM sessions s JOIN admin_users a ON a.id = s.admin_id
    WHERE s.token = ?`, token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    q.run(blastDb, 'DELETE FROM sessions WHERE token = ?', token);
    return null;
  }
  return row;
}

export function destroySession(token) {
  if (token) q.run(blastDb, 'DELETE FROM sessions WHERE token = ?', token);
}

export function requireRole(admin, roles) {
  if (!admin || !roles.includes(admin.role)) return false;
  return true;
}
