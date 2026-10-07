'use client';
import { useState, useEffect } from 'react';

export default function LivePage() {
  const [d, setD] = useState(null);
  useEffect(() => {
    const load = () => fetch('/api/live').then(r => r.json()).then(setD).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!d) return <div className="wrap"><p className="mut">Memuat…</p></div>;
  const persen = d.totalPemilih ? Math.round((d.totalVotes / d.totalPemilih) * 100) : 0;
  const maxN = Math.max(1, ...d.perAngkatan.map(a => a.n));

  return (
    <div className="wrap" style={{ maxWidth: 640, paddingTop: 40 }}>
      <h1 style={{ marginBottom: 4 }}>Partisipasi Voting</h1>
      <p className="mut">Live count — hanya jumlah yang sudah vote. Hasil diumumkan resmi oleh panitia.</p>

      <div className="card" style={{ marginTop: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 52, fontWeight: 800 }}>{d.totalVotes}</div>
        <div className="mut">dari {d.totalPemilih} pemilih ({persen}%)</div>
        <div style={{ background: '#0b1220', borderRadius: 20, height: 12, marginTop: 14, overflow: 'hidden' }}>
          <div style={{ width: persen + '%', height: '100%', background: 'var(--acc)' }} />
        </div>
      </div>

      <div className="card">
        {d.perAngkatan.map(a => (
          <div key={a.angkatan} style={{ marginBottom: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b>Angkatan {a.angkatan}</b><span className="mono">{a.n} vote</span>
            </div>
            <div style={{ background: '#0b1220', borderRadius: 20, height: 10, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: Math.round((a.n / maxN) * 100) + '%', height: '100%', background: 'var(--ok)' }} />
            </div>
          </div>
        ))}
        {!d.perAngkatan.length && <p className="mut">Belum ada suara masuk.</p>}
      </div>
    </div>
  );
}
