import { currentAdmin, json, unauthorized } from '@/lib/api.js';

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  return json({ ok: true, user: { id: admin.id, username: admin.username, role: admin.role } });
}
