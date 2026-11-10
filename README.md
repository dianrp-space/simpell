# SIMPELL

Sistem Informasi Manajemen Pelanggan & Layanan Lintasarta. Portal internal untuk data teknis pelanggan ISP: tiket gangguan, akses jaringan, dan infrastruktur fiber.

Antarmuka dirender di server dengan EJS. Tidak ada React atau Vue.

## Stack

- Node.js 20.20 atau lebih baru
- Express 4, EJS, express-session
- Sequelize 6 dan MySQL
- Tailwind CSS, plus Flowbite lewat CDN di halaman
- Socket.IO untuk notifikasi admin
- ExcelJS untuk unduh Excel

## Menjalankan di komputer sendiri

```bash
npm install
cp .env.example .env
npm start
```

Isi `.env` sebelum `npm start`. Aplikasi berhenti di awal kalau `DB_NAME`, `DB_USER`, `DB_PASSWORD`, atau `DB_HOST` kosong. Buka `http://localhost:3000`.

Perintah lain:

| Perintah | Fungsi |
| --- | --- |
| `npm run build:css` | Build Tailwind dan terus memantau perubahan |
| `npm run build:css:prod` | Build Tailwind yang sudah diminify |
| `npm run db:sync` | Samakan tabel dengan model, termasuk perubahan kolom |
| `npm run seed` | Impor data master |
| `npm run backup` | Simpan cadangan database dan file unggahan ke folder `backups/` |

`npm start` sudah membuat tabel yang belum ada lewat `sequelize.sync()`. Perubahan kolom pada tabel lama diurus `utils/ensureSchema.js` saat aplikasi menyala, dan bisa diulang lewat `npm run db:sync`.

## Variabel lingkungan

Salinan ada di `.env.example`.

| Variabel | Fungsi |
| --- | --- |
| `PORT` | Port proses Node. Default 3000 |
| `SESSION_SECRET` | Rahasia cookie sesi. Ganti di server sungguhan |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Koneksi MySQL |
| `APP_URL` | Alamat yang dibuka pengguna, termasuk `https://` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Akun admin pertama |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | SMTP untuk persetujuan akun dan reset password. Host bebas, boleh domain sendiri. Boleh kosong |

## Akun dan peran

Peran: `admin`, `manager`, `karyawan`, dan `mitra`.

Admin pertama dibuat saat aplikasi menyala, hanya jika database belum punya pengguna dengan peran admin. Nilai default ada di `.env.example` (`admin@simpell.local` / `Admin123_`). Ganti password lewat User Management setelah masuk. Kalau sudah ada admin, akun ini tidak dibuat lagi.

Mitra hanya melihat menu yang dicentang di User Management. Menu lain disembunyikan di sidebar dan ditolak kalau URL-nya dibuka langsung. Mitra selalu viewer. Pengguna staf melihat semua menu operasional.

## Menu akses yang dipisah

Tiga menu ini memakai tabel yang sama, dibedakan kolom `jenis` pada node:

- AKSES FO
- AKSES FO P2P
- AKSES DIRECT LAN

M2M dan SOLTEM memakai tabel yang sama, dibedakan kolom `layanan`. Data lama `SOLTEMP` tampil di menu SOLTEM. Isian form port dan layanan tidak berubah.

Node yang sudah ada sebelum pemisahan ini tercatat sebagai AKSES FO. Pindahkan lewat pilihan Menu di form node.

## Daftar dan Excel

Halaman daftar menampilkan 25 baris per halaman. Pencarian dan filter status tetap ikut saat pindah halaman. Unduh Excel tetap mengambil seluruh data yang cocok dengan filter, bukan hanya halaman yang sedang terbuka.

## Deploy

Langkah VPS aaPanel, Nginx, PM2, dan HTTPS ada di [DEPLOY-AAPANEL.md](DEPLOY-AAPANEL.md).

Riwayat perubahan ada di [CHANGELOG.md](CHANGELOG.md).
