import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, destroySession } from '@/lib/auth.js';

export async function POST() {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
