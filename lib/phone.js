// lib/phone.js — normalisasi nomor Indonesia ke format 62xxx
export function normalizePhone(p) {
  if (!p) return null;
  let d = String(p).replace(/[^0-9]/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  else if (d.startsWith('620')) d = '62' + d.slice(3);
  if (!d.startsWith('62')) return null;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

// parse CSV sederhana: kolom angkatan,nim,nama,phone,username,password
export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  let start = 0;
  const head = lines[0].toLowerCase();
  if (head.includes('nim') || head.includes('nama') || head.includes('phone')) start = 1;
  const out = [];
  for (let i = start; i < lines.length; i++) {
    const c = lines[i].split(',').map(s => s.trim());
    out.push({
      angkatan: c[0] ? parseInt(c[0], 10) : null,
      nim: c[1] || null,
      nama: c[2] || null,
      phone: c[3] || null,
      username: c[4] || null,
      password: c[5] || null,
    });
  }
  return out;
}
