'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) { setErr(d.error || 'Login gagal'); return; }
      router.push('/admin');
      router.refresh();
    } catch { setErr('Gagal konek server'); }
    finally { setBusy(false); }
  }

  return (
    <div className="center">
      <form className="card" onSubmit={submit}>
        <h1>WaBlast HIMASIF</h1>
        <p className="mut" style={{ marginBottom: 12 }}>Login panitia</p>
        {err && <div className="msg err">{err}</div>}
        <label>Username</label>
        <input value={username} onChange={e => setU(e.target.value)} autoFocus required />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setP(e.target.value)} required />
        <button style={{ marginTop: 16, width: '100%' }} disabled={busy}>
          {busy ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
