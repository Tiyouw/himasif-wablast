'use client';
import { useState, useEffect } from 'react';

export default function VotePage() {
  const [cands, setCands] = useState([]);
  const [closed, setClosed] = useState(false);
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [pick, setPick] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/vote/options').then(r => r.json()).then(d => {
      setCands(d.candidates || []); setClosed(!!d.closed);
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!pick) { setRes({ ok: false, text: 'Pilih kandidat dulu.' }); return; }
    setBusy(true); setRes(null);
    const r = await fetch('/api/vote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p, candidateId: pick }),
    });
    const d = await r.json();
    setRes({ ok: d.ok, text: d.ok ? d.message : (d.error || 'Gagal') });
    setBusy(false);
    if (d.ok) { setU(''); setP(''); setPick(null); }
  }

  return (
    <div className="wrap" style={{ maxWidth: 520, paddingTop: 40 }}>
      <h1 style={{ marginBottom: 4 }}>Voting Ketua Umum HIMASIF 2026</h1>
      <p className="mut" style={{ marginBottom: 18 }}>Masukkan kredensial dari WhatsApp, pilih, lalu kirim.</p>

      {closed && <div className="msg err">Voting belum dibuka / sudah ditutup.</div>}
      {res && <div className={'msg ' + (res.ok ? 'ok' : 'err')}>{res.text}</div>}

      <form className="card" onSubmit={submit}>
        <label>Username</label>
        <input value={u} onChange={e => setU(e.target.value)} required disabled={closed} />
        <label>Password</label>
        <input value={p} onChange={e => setP(e.target.value)} required disabled={closed} />

        <label style={{ marginTop: 16 }}>Pilih Kandidat</label>
        <div style={{ display: 'grid', gap: 8 }}>
          {cands.map(c => (
            <label key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              border: '1px solid ' + (pick === c.id ? 'var(--acc)' : 'var(--line)'),
              borderRadius: 8, padding: '12px 14px', background: pick === c.id ? '#0b1220' : 'transparent',
            }}>
              <input type="radio" name="c" checked={pick === c.id} onChange={() => setPick(c.id)} disabled={closed} style={{ width: 'auto' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.warna || '#888', display: 'inline-block' }} />
              <b>{c.nomor_urut}. {c.nama}</b>
            </label>
          ))}
        </div>

        <button style={{ marginTop: 18, width: '100%' }} disabled={busy || closed}>
          {busy ? 'Mengirim…' : 'Kirim Suara'}
        </button>
        <p className="mut" style={{ marginTop: 10, fontSize: 12 }}>Suara rahasia & hanya bisa dikirim sekali.</p>
      </form>
    </div>
  );
}
