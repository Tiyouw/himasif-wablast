// lib/api.js — helper auth + response untuk route handler
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSessionAdmin, COOKIE_NAME } from './auth.js';

export async function currentAdmin() {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  return getSessionAdmin(token);
}

export const json = (data, status = 200) => NextResponse.json(data, { status });
export const unauthorized = () => NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
export const forbidden = () => NextResponse.json({ ok: false, error: 'Akses ditolak (role)' }, { status: 403 });
