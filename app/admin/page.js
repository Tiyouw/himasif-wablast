'use client';
import { useState, useEffect, useCallback } from 'react';

const TABS = ['Sender', 'Kontak', 'Pesan', 'Blast', 'Rekap', 'Voting'];
const ANGS = [2026, 2025, 2024, 2023];

export default function Admin() {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('Sender');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (!d?.ok) { location.href = '/login'; return; }
      setMe(d.user);
    });
  }, []);

  const flash = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000); };

  if (!me) return <div className="wrap"><p className="mut">Memuat…</p></div>;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = '/login';
  }

  return (
    <div className="wrap">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>WaBlast HIMASIF</h1>
          <p className="mut">{me.username} · <b>{me.role}</b></p>
        </div>
        <div className="row">
          <a href="/live" target="_blank" className="mut">/live ↗</a>
          <button className="ghost" onClick={logout}>Keluar</button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {msg && <div className={'msg ' + (msg.ok ? 'ok' : 'err')}>{msg.text}</div>}

      {tab === 'Sender' && <Sender flash={flash} />}
      {tab === 'Kontak' && <Kontak flash={flash} />}
      {tab === 'Pesan' && <Pesan flash={flash} />}
      {tab === 'Blast' && <Blast me={me} flash={flash} />}
      {tab === 'Rekap' && <Rekap />}
      {tab === 'Voting' && <Voting me={me} flash={flash} />}
    </div>
  );
}

function Sender({ flash }) {
  const [s, setS] = useState(null);
  const load = useCallback(() => fetch('/api/senders').then(r => r.json()).then(setS), []);
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);
  const sender = s?.sender;
  return (
    <div className="card">
      <h2>Nomor Pengirim</h2>
      <p className="mut">Scan QR ini pakai WhatsApp nomor panitia (Perangkat Tertaut).</p>
      <div className="row" style={{ margin: '14px 0' }}>
        <span className={'pill ' + (sender?.status || 'DISCONNECTED')}>{sender?.status || 'TIDAK ADA'}</span>
        {sender?.phone && <span className="mono mut">+{sender.phone}</span>}
      </div>
      {sender?.status === 'CONNECTED'
        ? <div className="msg ok">Terhubung. Siap blast.</div>
        : s?.qr
          ? <div><img src={s.qr} alt="QR" style={{ background: '#fff', padding: 8, borderRadius: 8 }} /></div>
          : <p className="mut">Menunggu QR… pastikan worker jalan (<span className="mono">npm run worker</span>).</p>}
    </div>
  );
}

function Kontak({ flash }) {
  const [data, setData] = useState({ total: 0, perAngkatan: [] });
  const [csv, setCsv] = useState('');
  const [ang, setAng] = useState('2026');
  const [listAng, setListAng] = useState(null);
  const [list, setList] = useState([]);
  const load = useCallback(() => fetch('/api/contacts').then(r => r.json()).then(setData), []);
  useEffect(() => { load(); }, [load]);

  async function doImport() {
    const r = await fetch('/api/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv, defaultAngkatan: parseInt(ang, 10) }),
    });
    const d = await r.json();
    if (!d.ok) return flash(false, d.error || 'Import gagal');
    flash(true, `Import: ${d.inserted} masuk, ${d.skipped} dilewati.`);
    setCsv(''); load();
  }

  async function viewAng(a) {
    const d = await fetch('/api/contacts?angkatan=' + a).then(r => r.json());
    setListAng(a); setList(d.contacts);
  }

  function onFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => setCsv(String(rd.result));
    rd.readAsText(f);
  }

  function exportCsv() {
    const rows = [['angkatan', 'nim', 'nama', 'phone', 'username', 'password']];
    list.forEach(c => rows.push([c.angkatan, c.nim, c.nama, c.phone, c.username, c.password]));
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `kontak-${listAng || 'all'}.csv`; a.click();
  }

  return (
    <div className="card">
      <h2>Kontak Pemilih</h2>
      <div className="grid" style={{ marginBottom: 14 }}>
        <div className="stat"><b>{data.total}</b><span>Total kontak</span></div>
        {data.perAngkatan.map(a => (
          <div key={a.angkatan} className="stat"><b>{a.total}</b><span>Angkatan {a.angkatan}</span></div>
        ))}
      </div>

      <label>Tempel CSV (angkatan,nim,nama,phone,username,password) — username/password kosong = dibuat otomatis</label>
      <textarea value={csv} onChange={e => setCsv(e.target.value)} placeholder="2026,232410101090,Ahimsa,08123456789,," />
      <div className="row" style={{ marginTop: 10 }}>
        <select value={ang} onChange={e => setAng(e.target.value)}>
          {ANGS.map(a => <option key={a}>{a}</option>)}
        </select>
        <input type="file" accept=".csv,.txt" onChange={onFile} style={{ width: 'auto' }} />
        <button onClick={doImport} disabled={!csv.trim()}>Import</button>
      </div>

      <div className="row" style={{ marginTop: 18 }}>
        <span className="mut">Lihat:</span>
        {ANGS.map(a => <button key={a} className="ghost" onClick={() => viewAng(a)}>{a}</button>)}
        {listAng && <button className="ghost" onClick={exportCsv}>Export CSV</button>}
      </div>
      {listAng && (
        <div style={{ maxHeight: 320, overflow: 'auto', marginTop: 10 }}>
          <table>
            <thead><tr><th>Nama</th><th>NIM</th><th>HP</th><th>Username</th><th>Password</th></tr></thead>
            <tbody>{list.map(c => (
              <tr key={c.id}><td>{c.nama}</td><td>{c.nim}</td><td>{c.phone}</td><td className="mono">{c.username}</td><td className="mono">{c.password}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Pesan({ flash }) {
  const [tpls, setTpls] = useState([]);
  const [cur, setCur] = useState('2026');
  const [body, setBody] = useState('');
  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(d => {
      setTpls(d.templates || []);
      const t = (d.templates || []).find(x => String(x.angkatan) === cur);
      setBody(t?.body || '');
    });
  }, []);
  useEffect(() => {
    const t = tpls.find(x => String(x.angkatan) === cur);
    setBody(t?.body || '');
  }, [cur, tpls]);

  async function save() {
    const r = await fetch('/api/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ angkatan: parseInt(cur, 10), body }),
    });
    const d = await r.json();
    flash(d.ok, d.ok ? 'Template tersimpan.' : (d.error || 'Gagal'));
    if (d.ok) {
      const nt = await fetch('/api/templates').then(x => x.json());
      setTpls(nt.templates || []);
    }
  }

  return (
    <div className="card">
      <h2>Template Pesan per Angkatan</h2>
      <p className="mut">Variabel: <span className="mono">{'{nama} {nim} {username} {password} {link}'}</span></p>
      <div className="row" style={{ margin: '10px 0' }}>
        {ANGS.map(a => <button key={a} className={String(a) === cur ? '' : 'ghost'} onClick={() => setCur(String(a))}>{a}</button>)}
      </div>
      <textarea value={body} onChange={e => setBody(e.target.value)} style={{ minHeight: 220 }} />
      <button style={{ marginTop: 10 }} onClick={save}>Simpan</button>
    </div>
  );
}

function Blast({ me, flash }) {
  const [jobs, setJobs] = useState([]);
  const [ang, setAng] = useState('2026');
  const load = useCallback(() => fetch('/api/blast').then(r => r.json()).then(d => setJobs(d.jobs || [])), []);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);

  async function start() {
    if (!confirm(`Mulai blast angkatan ${ang}? Pastikan pesan & kontak sudah benar.`)) return;
    const r = await fetch('/api/blast', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ angkatan: parseInt(ang, 10) }),
    });
    const d = await r.json();
    flash(d.ok, d.ok ? `Job #${d.jobId} mulai, ${d.total} penerima.` : (d.error || 'Gagal'));
    load();
  }
  async function act(jobId, action) {
    const r = await fetch('/api/blast/control', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, action }),
    });
    const d = await r.json();
    flash(d.ok, d.ok ? `Job #${jobId} → ${action}` : (d.error || 'Gagal'));
    load();
  }

  return (
    <div className="card">
      <h2>Blast</h2>
      <div className="row">
        <select value={ang} onChange={e => setAng(e.target.value)} style={{ width: 'auto' }}>
          {ANGS.map(a => <option key={a}>{a}</option>)}
        </select>
        <button onClick={start} disabled={me.role !== 'OPERATOR' && me.role !== 'KETUA'}>Mulai Blast</button>
        <span className="mut">Jeda 5–10s · jendela 08.00–17.00 WIB</span>
      </div>

      <div style={{ marginTop: 18 }}>
        <table>
          <thead><tr><th>#</th><th>Angkatan</th><th>Status</th><th>Progress</th><th>Aksi</th></tr></thead>
          <tbody>{jobs.map(j => (
            <tr key={j.id}>
              <td>{j.id}</td><td>{j.angkatan}</td>
              <td><span className={'pill ' + j.status}>{j.status}</span></td>
              <td>{j.sent} terkirim · {j.failed} gagal · {j.queued} sisa / {j.total}</td>
              <td>
                {j.status === 'RUNNING' && <button className="warn" onClick={() => act(j.id, 'pause')}>Pause</button>}
                {j.status === 'PAUSED' && <button className="ok" onClick={() => act(j.id, 'resume')}>Resume</button>}
                {(j.status === 'RUNNING' || j.status === 'PAUSED') &&
                  <button className="err" style={{ marginLeft: 6 }} onClick={() => act(j.id, 'stop')}>Stop</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
        {!jobs.length && <p className="mut">Belum ada job.</p>}
      </div>
    </div>
  );
}

function Rekap() {
  const [sum, setSum] = useState([]);
  useEffect(() => { fetch('/api/recap').then(r => r.json()).then(d => setSum(d.summary || [])); }, []);
  return (
    <div className="card">
      <h2>Rekap</h2>
      <table>
        <thead><tr><th>Angkatan</th><th>Total</th><th>Terkirim</th><th>Gagal</th><th>Antre</th></tr></thead>
        <tbody>{sum.map(s => (
          <tr key={s.angkatan}><td>{s.angkatan}</td><td>{s.total}</td><td>{s.sent}</td><td>{s.failed}</td><td>{s.queued}</td></tr>
        ))}</tbody>
      </table>
      <p className="mut" style={{ marginTop: 10 }}>Yang gagal → panitia urus manual (plan §15.2).</p>
    </div>
  );
}

function Voting({ me, flash }) {
  const [closed, setClosed] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(() => fetch('/api/vote-control').then(r => r.json()).then(d => setClosed(!!d.closed)), []);
  useEffect(() => { load(); }, [load]);

  async function toggle() {
    const r = await fetch('/api/vote-control', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closed: !closed }),
    });
    const d = await r.json();
    flash(d.ok, d.ok ? (d.closed ? 'Voting DITUTUP.' : 'Voting DIBUKA.') : (d.error || 'Gagal'));
    load();
  }
  async function reveal() {
    const d = await fetch('/api/reveal').then(r => r.json());
    if (!d.ok) return flash(false, d.error || 'Gagal');
    setResult(d);
  }

  return (
    <div className="card">
      <h2>Kontrol Voting</h2>
      <div className="row">
        <span className={'pill ' + (closed ? 'FAILED' : 'CONNECTED')}>{closed ? 'TERTUTUP' : 'TERBUKA'}</span>
        <button className={closed ? 'ok' : 'err'} onClick={toggle} disabled={me.role !== 'KETUA'}>
          {closed ? 'Buka Voting' : 'Tutup Voting'}
        </button>
        <button className="ghost" onClick={reveal} disabled={me.role !== 'KETUA' || !closed}>Reveal Hasil</button>
      </div>
      {me.role !== 'KETUA' && <p className="mut" style={{ marginTop: 8 }}>Hanya KETUA bisa tutup/buka & reveal.</p>}

      {result && (
        <div style={{ marginTop: 16 }}>
          <h2>Hasil (total {result.total} suara)</h2>
          <table>
            <thead><tr><th>No</th><th>Kandidat</th><th>Suara</th></tr></thead>
            <tbody>{result.results.map(r => (
              <tr key={r.id}><td>{r.nomor_urut}</td><td>{r.nama}</td><td><b>{r.suara}</b></td></tr>
            ))}</tbody>
          </table>
          {result.pemenang && <div className="msg ok" style={{ marginTop: 10 }}>Terbanyak: {result.pemenang.nama} ({result.pemenang.suara} suara)</div>}
        </div>
      )}
    </div>
  );
}
