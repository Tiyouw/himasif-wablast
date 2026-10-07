# WaBlast + E-Voting HIMASIF

Dashboard **blast WhatsApp** + **sistem e-voting ketua umum** dalam satu sistem. Dibuat untuk pemilihan ketua himpunan mahasiswa (~500 pemilih, 4 angkatan) — kirim kredensial voting unik via WhatsApp, kelola blast, lalu buka voting di hari yang sama.

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node](https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003B57?logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
[![Baileys](https://img.shields.io/badge/WhatsApp-Baileys-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Fitur

**Blast WhatsApp**
- Scan QR (whatsapp-web multi-device) langsung dari dashboard — nomor panitia milik sendiri, tanpa layanan pihak ketiga.
- Import kontak per angkatan (CSV) + auto-generate username/password voting unik.
- Template pesan per angkatan dengan variabel `{nama} {nim} {username} {password} {link}`.
- Engine antrian: throttle per pesan **5–10 detik**, jendela kirim **08.00–17.00**, jeda antar angkatan.
- **Pause / Resume / Stop** dengan state persist di SQLite — aman kalau proses mati di tengah jalan.
- Recap per penerima + export: `SENT` / `FAILED`.

**E-Voting**
- Halaman voting publik: login pakai kredensial dari WA, **sekali pakai** (anti double-vote per `contact_id`).
- Live count **hanya menampilkan partisipasi per angkatan** — nol data kandidat, aman untuk konten IG story.
- **Reveal manual**: hasil & pemenang baru muncul setelah KETUA menutup voting — dijamin di level API, bukan cuma UI.
- Rate limit login (12 percobaan/menit/IP) + hash IP di tiap suara.

**Admin**
- Multi-admin dengan role **KETUA** (lihat + recap + buka/tutup/reveal) dan **OPERATOR** (+ Start/Pause blast).
- Sesi opak HttpOnly server-side (token acak, bukan JWT), bcrypt untuk password.

## 🏗️ Arsitektur

```
                 ┌───────────────┐        ┌──────────────────┐
   Browser ────► │  Next.js 15   │ ─────► │  blast.sqlite    │  admin, kontak+kredensial,
                 │  (App Router) │        │                  │  template, job, log
                 └───────┬───────┘        └──────────────────┘
                         │                ┌──────────────────┐
                         └──────────────► │  votes.sqlite    │  kandidat, suara, angkatan
                                          └──────────────────┘
                 ┌───────────────┐
                 │ worker Baileys│  ← proses terpisah, antrian blast, koneksi WA
                 └───────────────┘
```

Dua DB **sengaja dipisah**: kredensial pemilih hidup di `blast.sqlite`, suara di `votes.sqlite`. Kalau dashboard blast bocor, hasil suara tidak ikut bocor — dan jalur baca live count tidak punya akses ke tabel suara per-kandidat.

- **Web:** Next.js 15 App Router + `node:sqlite` (built-in, tanpa compile native)
- **Worker:** [Baileys](https://github.com/WhiskeySockets/Baileys) (linked device)
- **DB:** SQLite, dua file terpisah

## 🚀 Menjalankan lokal

```bash
git clone https://github.com/Tiyouw/himasif-wablast.git
cd himasif-wablast
npm install
npm run init-db        # schema + seed admin/kandidat/template
npm run build
npm start              # web  → http://localhost:3000   (terminal 1)
npm run worker         # worker Baileys                 (terminal 2)
```

Buka `http://localhost:3000/admin` → login `ketua` / `himasif2026` (**ganti setelah login**).
Tab **Sender** → scan QR pakai WhatsApp nomor panitia (Perangkat Tertaut).

> ⚠️ Ganti password seed lewat env `SEED_KETUA_PW` / `SEED_OPERATOR_PW` **sebelum** `init-db` pertama.

## 🧭 Alur singkat

1. **Kontak** — tempel CSV `angkatan,nim,nama,phone,username,password` (username/password kosong → dibuat otomatis).
2. **Pesan** — edit template per angkatan. Variabel: `{nama} {nim} {username} {password} {link}`.
3. **Blast** — pilih angkatan → Mulai Blast. Bisa Pause/Resume/Stop.
4. **Voting** — buka voting → pemilih login di `/vote` → live count di `/live` (partisipasi saja).
5. **Tutup voting** → **Reveal Hasil** (KETUA).

## 🔌 API singkat

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | login admin, set cookie sesi |
| `GET` | `/api/live` | publik | partisipasi per angkatan (nol data kandidat) |
| `POST` | `/api/vote` | kredensial pemilih | catat suara (sekali pakai) |
| `GET` | `/api/reveal` | KETUA | hasil + pemenang — hanya setelah voting ditutup |
| `POST` | `/api/vote-control` | KETUA | buka/tutup voting |
| `POST` | `/api/blast` | OPERATOR | buat & jalankan job blast |
| `POST` | `/api/blast/control` | OPERATOR | pause/resume/stop |
| `GET` | `/api/recap` | admin | recap per penerima / per angkatan |

Semua endpoint admin → `401` tanpa sesi.

## 🐳 Deploy

**Docker Compose** (dua service: `web` + `worker`, volume `./data` bersama):

```bash
docker compose up -d
```

**Coolify / manual di VPS:** build image dari `Dockerfile`, jalankan `web` + `worker`, set env:
`DATA_DIR=/app/data`, `COOKIE_SECURE=true`, `SEED_KETUA_PW=…`, `SEED_OPERATOR_PW=…`.
Jalankan `npm run init-db` sekali sebelum `web`/`worker` pertama.

## 🔒 Catatan anti-ban

- Throttle per pesan **5–10 detik** — burst kirim = sinyal ban klasik.
- Jendela kirim 08.00–17.00.
- Uji ke 2–3 nomor internal dulu sebelum sentuh seluruh daftar.
- Nomor cadangan disiapkan: kalau nomor kena restrict → Pause → ganti nomor → Resume.

## 📄 Lisensi

[MIT](LICENSE)

---

> Proyek ini memakai WhatsApp linked-device (Baileys), **bukan** Meta WhatsApp Cloud API resmi. Gunakan secukupnya dan sesuai kebijakan WhatsApp.
