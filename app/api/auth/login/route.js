import { NextResponse } from 'next/server';
import { blastDb, q } from '@/lib/db.js';
import { verifyPassword, createSession, COOKIE_NAME } from '@/lib/auth.js';

export async function POST(req) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password)
    return NextResponse.json({ ok: false, error: 'Lengkapi username & password' }, { status: 400 });

  const admin = q.get(blastDb, 'SELECT * FROM admin_users WHERE username = ?', username);
  if (!admin || !verifyPassword(password, admin.password_hash))
    return NextResponse.json({ ok: false, error: 'Username atau password salah' }, { status: 401 });

  const { token, maxAge } = createSession(admin.id);
  const res = NextResponse.json({
    ok: true,
    user: { id: admin.id, username: admin.username, role: admin.role },
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge,
    secure: process.env.COOKIE_SECURE === 'true',
  });
  return res;
}
