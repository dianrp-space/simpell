# Changelog

Catatan perubahan yang dikerjakan pada kode SIMPELL ini. Belum ada tag versi baru. Dasarnya tetap rilis `1.0.0` yang sudah ada.

## 2026-11-13

### Data customer

- Impor sheet DATA CUSTOMER menyimpan setiap baris. Dua customer boleh memakai nomor jaringan yang sama asal namanya berbeda.
- Nomor `2025494235` punya dua nama Pegadaian, jadi 952 baris di Excel masuk sebagai 952 customer.
- Impor ulang hanya memperbarui baris yang nomor jaringan dan namanya sama.
- Alamat, kontak, dan email yang sudah tersimpan tidak ditimpa oleh sheet itu.
- Judul kolom di daftar Data Customer bisa diklik untuk mengurutkan naik atau turun.
- Kotak filter di bawah judul kolom menyaring seluruh data, bukan hanya 25 baris yang sedang tampil.
- Kolom Status memakai pilihan Active, Inactive, dan Suspended. Tanda `-` mencari sel yang kosong.
- Reset menghapus pencarian, filter kolom, dan urutan.

### Header

- Header punya tombol Logout di samping tombol portal.
- Logout meminta konfirmasi, lalu langsung membuka halaman login.

### Dashboard

- Dashboard menampilkan dua grafik dari Record GGN & PM, dihitung dari tanggal tiap record.
- Grafik per tahun menunjukkan jumlah tiket setiap tahun yang punya data.
- Grafik per bulan menunjukkan Januari sampai Desember. Tahun bisa diganti dari pilihan di kartu grafik.
- Bulan tanpa tiket tetap tampil dengan nilai nol.
- Unduhan Excel dashboard ikut memuat angka per tahun dan per bulan.

## 2026-11-12

### Menu sesuai workbook

- Menu **QC PSB & Project** ditambah di Ticket & Monitoring.
- Grup Manage Service FO Kepri berisi Data MS FO Kepri, Pendingan MS FO Kepri, dan Data PM MS FO Kepri. Halaman ini masih menampilkan kolom dari sheet Excel.
- Akses Network menambah **FO Xconnect**. Nama Fiber Optic diganti menjadi **Akses FO**.
- Data FO Kepri disusun ulang: Data ODP, Data HH, Data Closure, Data OTB, dan Data ODC, ditambah Data Spliter, Data Core Remote, dan Data Core Trunk. Tiga menu terakhir masih kerangka kolom.
- Form dan daftar Data Customer memakai Service, Bandwidth, Akses, Node, Kota, Koordinat, dan Keterangan.

### Impor Excel

- Data Customer punya halaman **Import Excel**.
- Tombol **Impor SIMPELL.xlsx** membaca sheet DATA CUSTOMER di file workbook lokal.
- File `.xlsx` lain bisa diunggah asal punya sheet dan kolom yang sama.
- Berkas Excel tidak lagi ikut ke git. Salinan di komputer tetap dipakai aplikasi.

## 2026-11-10

### Tautan yang dibagikan

- Pratinjau tautan, termasuk saat dibagikan ke WhatsApp, menampilkan logo SIMPELL.

### Dependensi

- Paket diperbarui supaya `npm audit` tidak melaporkan kerentanan yang diketahui.

## 2026-11-09

### Menu akses

- Menu **AKSES FO / P2P** dipisah menjadi **AKSES FO**, **AKSES FO P2P**, dan **AKSES DIRECT LAN**.
- Ketiganya tetap satu tabel dan satu set isian. Pembeda ada di kolom `jenis` pada node: `FO`, `FO_P2P`, `DIRECT_LAN`.
- Form node punya pilihan Menu supaya node yang sudah ada bisa dipindah.
- Nama node tetap unik untuk seluruh menu.
- Menu **M2M/SOLTEMP** dipisah menjadi **M2M** dan **SOLTEM**.
- Keduanya tetap satu tabel dan satu set isian. Pembeda ada di kolom `layanan`.
- Data lama `SOLTEMP` tampil di SOLTEM. Menyimpan form menulis ulang nilainya menjadi `SOLTEM`.
- Layanan yang kosong tetap di daftar M2M.
- Kartu dashboard mengikuti pemisahan menu ini.

### Sesi

- Sesi disimpan di tabel MySQL `sessions`, bukan di memori proses.
- Cookie diperpanjang selama pengguna masih membuka aplikasi. Batasnya 12 jam sejak aktivitas terakhir.
- Halaman mengirim ping ke `/auth/ping` setiap 4 menit supaya sesi tidak putus saat tab dibiarkan terbuka.
- Cookie `secure` tetap mati supaya tetap jalan di belakang proxy HTTPS aaPanel.

### Akun mitra

- Akun mitra bisa diberi satu atau beberapa menu lewat User Management.
- Menu yang tidak dicentang hilang dari sidebar dan ditolak kalau URL-nya dibuka langsung.
- Mitra tetap viewer. Admin, manager, dan karyawan tetap melihat menu operasional.
- Mitra tanpa menu hanya melihat portal, tanpa tautan masuk ke data.

### Record GGN

- Daftar Record GGN bisa disaring berdasarkan status: Pending, Progress, Done, Cancelled.
- Filter yang sama ikut ke unduhan Excel.

### Paginasi

- Daftar memuat 25 baris per halaman, dengan nomor halaman di bawah tabel.
- Pencarian dan filter status ikut saat pindah halaman.
- Jumlah di judul halaman adalah total data.
- Unduh Excel tetap seluruh data yang cocok dengan filter.
- Halaman yang dipaginasi: Customer, Pending GGN, Record GGN, AKSES FO, AKSES FO P2P, AKSES DIRECT LAN, M2M, SOLTEM, VSAT Starlink, VSAT TDMA, 3rd Party, CPE, Radio Link, ODC, OTB, Core Lamda, Data Core, Data Closure, Data HH, Data ODP, Aset FO, Patroli, dan Log Aktivitas.

### Admin dan database

- Admin pertama bisa dibuat dari kode lewat `ADMIN_NAME`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD`.
- Admin itu tidak dibuat kalau database sudah punya pengguna dengan peran admin.
- Kredensial database di `config/database.js` dihapus. Aplikasi hanya membaca `.env` dan berhenti kalau `DB_NAME`, `DB_USER`, `DB_PASSWORD`, atau `DB_HOST` kosong.
- Contoh variabel ada di `.env.example`.
- Langkah pasang di VPS aaPanel ada di `DEPLOY-AAPANEL.md`.

### Edit menu mitra

- Kotak pilihan menu mitra ikut tampil di form ubah akun, tidak hanya saat buat akun baru.
- Menu yang sudah dipilih tetap tercentang.
- Form ubah akun dan reset password dipindah keluar dari tabel supaya daftar menunya tidak terpotong.

### Teks catatan dan notifikasi realtime

- Catatan, rincian, keterangan, dan deskripsi yang disimpan pengguna ditampilkan sebagai teks. Tag HTML di dalamnya tidak ikut dijalankan.
- Tombol ubah deskripsi di Core Lamda, ODC, dan OTB membaca isi kolom dari data tombol, bukan dari kode JavaScript di halaman.
- Socket.IO hanya mengirim notifikasi ke admin yang sedang login. Pengunjung lain tetap tersambung, tetapi tidak menerima event itu.
- Nama dan email di kartu toast ditulis sebagai teks.

### Lonceng notifikasi

- Admin punya ikon lonceng di kanan atas portal, header halaman SIMPELL, dan halaman User Management.
- Toast tetap muncul saat ada permintaan, lalu hilang sendiri. Isinya tetap ada di lonceng sampai dibaca.
- Lonceng menyimpan permintaan akun baru dan permintaan reset password di tabel `admin_notifications`.
- Permintaan yang sudah menunggu sebelum lonceng ini dipasang ikut masuk ke daftar.
- Angka merah menghitung yang belum dibaca. **Tandai dibaca** mengosongkan angka itu.
- Menekan satu baris membuka tab yang sesuai di User Management.
- Menyetujui akun atau reset password menandai notifikasinya sebagai sudah dibaca.

### Email

- Pengiriman email tidak lagi terkunci ke Gmail. Host, port, dan pengirim diisi lewat `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, dan `SMTP_FROM`.
- Login tetap jalan kalau SMTP dikosongkan. `EMAIL_USER` dan `EMAIL_PASS` yang lama tetap dibaca, dan host-nya jatuh ke Gmail kalau `SMTP_HOST` kosong.

### Backup dan restore

- Admin bisa mengunduh cadangan dari portal, menu **Backup & Restore**.
- Arsip `.tar.gz` berisi seluruh tabel database dan folder unggahan, termasuk foto profil.
- File `.env` tidak ikut. Di server baru, variabel itu diisi dulu, aplikasi dijalankan, lalu cadangan dipulihkan dari halaman yang sama.
- Pemulihan meminta ketikan `PULIHKAN` karena data yang sedang dipakai tertimpa.
- Perintah `npm run backup` menyimpan arsip yang sama di folder `backups/`. Folder itu tidak masuk git.

### Favicon

- Tab browser memakai logo SIMPELL. Latar hitam pada berkas logo dibuat transparan supaya bentuk birunya yang tampil.

### Sidebar dan profil

- Garis di bawah logo dan nama aplikasi di sidebar dihilangkan.
- Foto di sidebar dan di header bisa diklik. Keduanya membuka `/profile` untuk ganti foto dan data akun.

### Lebar kolom tabel

- Lebar kolom di daftar bisa ditarik seperti Excel. Tarik garis di tepi judul kolom untuk melebar atau menyempit.
- Garis antar kolom terlihat. Garis di judul kolom lebih tebal, lalu berubah biru saat kursor di atasnya atau sedang ditarik.
- Lebar awal mengikuti isi kolom, paling lebar 220px, supaya kolom pendek tidak merenggang.
- Lebar yang sudah diatur tersimpan di browser dan tetap dipakai saat halaman yang sama dibuka lagi.
- Teks yang tidak muat dipotong dengan elipsis. Kalau jumlah lebar kolom melebihi kartu, tabel tetap bisa digeser ke samping.
