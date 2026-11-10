# Deploy SIMPELL di VPS aaPanel

Aplikasi ini berjalan sebagai proses Node di belakang Nginx. MySQL ada di VPS yang sama. Port `3000` tidak dibuka ke internet.

Butuh Node.js **20.20 atau lebih baru**.

## 1. Pasang layanan di aaPanel

Di **App Store**, pasang:

- Nginx
- MySQL 8.0, atau pakai MariaDB yang sudah terpasang
- PM2 Manager
- Node.js version manager, lalu pasang Node 20 atau lebih baru

## 2. Buat database

Di **Database → Add database**:

- Nama, misalnya `simpell`
- User dan password dibuat sendiri
- Akses: localhost

Kalau data lama ada dalam file `.sql`, import lewat phpMyAdmin aaPanel. Kalau belum ada, biarkan kosong. Tabel dibuat otomatis saat aplikasi pertama kali menyala.

Isi `.env` dengan database VPS ini. Aplikasi tidak menyala kalau `DB_NAME`, `DB_USER`, `DB_PASSWORD`, atau `DB_HOST` kosong.

## 3. Unggah kode

Letakkan proyek di `/www/wwwroot/simpell`. Folder `node_modules` tidak perlu diunggah.

Di terminal aaPanel:

```bash
cd /www/wwwroot/simpell
npm install
cp .env.example .env
```

Edit `.env`. Arti tiap variabel ada di `.env.example`. `APP_URL` harus sama dengan domain yang dipakai, termasuk `https://`.

`SMTP_HOST`, `SMTP_USER`, dan `SMTP_PASS` hanya untuk email persetujuan akun dan reset password. Host-nya bebas, termasuk SMTP domain sendiri. Login tetap bisa dipakai kalau ketiganya kosong.

Untuk pindah server, unduh cadangan dari menu **Backup & Restore** di portal admin. File `.env` tidak ada di dalam arsip. Di server baru, isi `.env`, jalankan aplikasi, masuk sebagai admin, lalu pulihkan file cadangan dari menu yang sama.

Folder unggahan foto profil harus bisa ditulis:

```bash
mkdir -p /www/wwwroot/simpell/public/uploads/profiles
chmod -R 755 /www/wwwroot/simpell/public/uploads
```

## 4. Jalankan dengan PM2

Di **PM2 Manager → Add project**:

| Isian | Nilai |
|---|---|
| Startup file | `/www/wwwroot/simpell/app.js` |
| Run directory | `/www/wwwroot/simpell` |
| Project name | `simpell` |

Atau dari terminal:

```bash
cd /www/wwwroot/simpell
pm2 start app.js --name simpell
pm2 save
```

Cek dengan `pm2 logs simpell`. Baris yang diharapkan: `SIMPELL live on port 3000`. Kalau gagal, baca `hosting_fatal.log` di folder proyek.

Setelah mengubah `.env`:

```bash
pm2 restart simpell
```

## 5. Domain dan HTTPS

Di **Website → Add site**, buat situs untuk domain. Folder root boleh `/www/wwwroot/simpell`. Buka situs itu, lalu **Reverse proxy**:

- Target: `http://127.0.0.1:3000`
- Nyalakan **Websocket**, karena Socket.IO memakainya

Kalau aaPanel meminta konfigurasi Nginx, isi `location /` dengan:

```nginx
proxy_pass http://127.0.0.1:3000;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 300s;
```

Pasang SSL lewat **Website → SSL → Let's Encrypt**, lalu paksa HTTPS.

Di firewall aaPanel, buka port **80** dan **443**. Port **3000** tetap tertutup dari luar.

## 6. Cek

Buka `https://domain-anda.com/auth/login`.

Database baru mendapat satu admin saat aplikasi pertama kali menyala:

- Email: nilai `ADMIN_EMAIL` (bawaan `admin@simpell.local`)
- Password: nilai `ADMIN_PASSWORD` (bawaan `Admin123_`)

Kalau database lama sudah punya user dengan role admin, akun ini tidak dibuat. Ganti password setelah login pertama lewat User Management.
