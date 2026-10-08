# Carbon Footprint Tracker — Frontend

SPA Vue 3 + TypeScript + Vite untuk Carbon Footprint Tracker. UI memakai Vuetify 3 dan ApexCharts, state memakai Pinia. Semua data diambil dari API backend Laravel ([carbon-tracker-backend](https://github.com/arianto-sketch/carbon-tracker-backend)).

## Prasyarat

- Node.js `^20.19` atau `>=22.12` (syarat Vite 8).
- Backend berjalan dan bisa diakses. Default-nya `http://127.0.0.1:8000`.

## Setup

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://127.0.0.1:8000/api/v1
```

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Dev server di `http://localhost:5173` |
| `npm run build` | Type-check (`vue-tsc`) lalu build production ke `dist/` |
| `npm run preview` | Menyajikan hasil build |

## Test E2E (Playwright)

Spec ada di `e2e/` dan berjalan di Chromium terhadap **backend sungguhan**. Tidak ada mock, kecuali beberapa skenario header unduhan yang sengaja memakai `page.route`.

### 1. Siapkan backend

Jalankan dari folder backend, memakai **database khusus E2E**. Spec membuat project dan entri baru di setiap run, jadi jangan arahkan ke database yang sedang Anda pakai untuk development.

```bash
php artisan migrate:fresh --seed     # di database khusus E2E
QUEUE_CONNECTION=sync API_RATE_LIMIT=1000 php artisan serve --host=127.0.0.1 --port=8000
```

- `--seed` membuat akun yang dipakai spec: `arianto@logique.co.id` (pm) dan `admin@logique.co.id` (admin), password `password`.
- `QUEUE_CONNECTION=sync` membuat laporan langsung selesai dibuat. Kalau memakai queue database, jalankan `php artisan queue:work`.
- `API_RATE_LIMIT=1000` dipakai karena akun PM di E2E mendekati batas default backend, yaitu 120 request per menit per user.

### 2. Jalankan

```bash
npx playwright install chromium   # sekali saja
npm run test:e2e                  # Vite dinyalakan otomatis kalau belum hidup
npm run test:e2e:report           # buka laporan HTML (playwright-report/)
```

Menjalankan satu file atau satu skenario saja:

```bash
npx playwright test e2e/entry-attachment.spec.ts
npx playwright test -g "terunduh sebagai .pdf"
```

### Variabel lingkungan

| Variabel | Default |
|---|---|
| `E2E_BASE_URL` | `http://127.0.0.1:5173` |
| `E2E_API_URL` | `http://127.0.0.1:8000/api/v1` |
| `E2E_PM_EMAIL` / `E2E_PM_PASSWORD` | `arianto@logique.co.id` / `password` |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | `admin@logique.co.id` / `password` |

### Cara kerjanya

- `e2e/auth.setup.ts` login sekali per role, lalu menyimpan token ke `e2e/.auth/` (diabaikan git). Spec lain memakai token itu.
- Backend membatasi **5 login per menit per email**. Jangan menjalankan suite lebih dari sekitar 5 kali dalam semenit.
- Spec berjalan berurutan (`workers: 1`) karena semua spec berbagi satu database. Data uji memakai kode unik per run (`uniqueCode`), jadi suite boleh diulang tanpa reset database.
- Data awal disiapkan lewat API (`apiAs` di `e2e/helpers.ts`), supaya UI hanya dipakai untuk hal yang memang diuji.

### Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Spec pertama gagal dan screenshot halaman kosong | Vite baru menyala dan masih mengoptimasi dependency. Jalankan ulang. |
| Semua spec gagal di `auth.setup.ts` | Backend belum jalan, belum di-seed, atau kena rate limit login. Tunggu semenit lalu ulangi. |
| Spec memanggil API yang salah | Dev server yang sudah hidup di port 5173 dipakai ulang (`reuseExistingServer`). Pastikan `VITE_API_URL` dev server itu menunjuk ke backend E2E, atau matikan dulu supaya Playwright menyalakan yang baru. |
| Laporan tidak pernah selesai di `reports.spec.ts` | Backend tidak memakai `QUEUE_CONNECTION=sync` dan tidak ada `queue:work`. |

## CI (GitHub Actions)

| Workflow | Kapan jalan | Isi |
|---|---|---|
| `CI` (`.github/workflows/ci.yml`) | Setiap PR dan push ke `main` | Type-check dan build, lalu **E2E penuh** terhadap `master` backend (MySQL 8.4, PHP 8.3) |
| `Security audit` (`.github/workflows/security-audit.yml`) | PR yang mengubah `package.json`/`package-lock.json`, push ke `main`, dan **setiap Senin** | `npm audit --audit-level=high` |

Laporan HTML Playwright tersimpan sebagai artifact `playwright-report` di setiap run (14 hari). Log backend disimpan sebagai artifact `backend-log` kalau job E2E gagal. Di CI, spec yang gagal diulang sekali dan ditandai *flaky* bila lulus di percobaan kedua.
