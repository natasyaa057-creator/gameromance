# Love Tree — Gamearka (Arka & Zahra)

Game web ringan: **Express** menyajikan file statis + **WebSocket** (`ws`) untuk multiplayer dua peran (Arka / Zahra) di tab yang sama atau berbeda.

## Jalankan lokal

```bash
npm install
npm start
```

Buka **http://localhost:3000** (satu proses untuk HTML dan WebSocket).

Kalau HTML kamu dari **XAMPP (port 80)** tetapi Node tetap di **3000**, klien otomatis memakai `ws://localhost:3000`. Atur meta `gamearka:websocket` di `index.html` bila perlu.

## Deploy ke Render (dari GitHub)

1. Push repo ini ke GitHub (pastikan `node_modules/` tidak ikut — sudah ada `.gitignore`).
2. Di [Render](https://render.com): **New +** → **Blueprint** (atau **Web Service**).
3. Pilih repo; Render membaca `render.yaml` di root.
4. Deploy. Variabel `PORT` diisi Render otomatis; server memakai `process.env.PORT`.

Setelah hidup, buka URL `https://<service>.onrender.com` — WebSocket memakai **`wss://` host yang sama** (tanpa port), sudah ditangani di `script.js`.

**Catatan tier gratis:** service bisa “sleep” saat tidak ada traffic; kunjungan pertama setelah idle bisa lambat ±30–60 detik.

## Deploy manual (tanpa Blueprint)

- **Runtime:** Node  
- **Build:** `npm install`  
- **Start:** `npm start`  
- **Health check path:** `/`

## File penting

| File | Fungsi |
|------|--------|
| `server.js` | HTTP + WebSocket + logika game |
| `index.html` | UI utama |
| `script.js` | Klien (sambungan WS, UI) |
| `love-theme.css` | Tema Love Tree |
| `render.yaml` | Blueprint Render |

## Cek cepat sebelum push

```bash
npm install
node --check server.js
node --check script.js
npm start
```

Lalu buka `http://localhost:3000`, ketik **arka** atau **zahra**, klik **Mulai**, pastikan masuk ke adegan game.
