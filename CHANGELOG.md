# Changelog

Catatan perubahan yang dikerjakan pada kode SIMPELL ini. Belum ada tag versi baru. Dasarnya tetap rilis `1.0.0` yang sudah ada.

## 2026-11-13

### Manage Service FO Kepri

- Data MS FO Kepri memakai kolom sheet DATA MS FO KEPRI: nomor, no jaringan, customer, service, bandwidth, akses, node, status, kota, lat long, PJ MS FO, dan keterangan.
- Pendingan MS FO Kepri memakai kolom sheet PENDINGAN MS FO KEPRI: tanggal, no tiket, no jaringan, customer, rincian, akses, PJ, status, dan keterangan.
- Kedua daftar bisa dicari, diurutkan, dan disaring per kolom. Tanda `-` mencari sel kosong.
- Saat tabel masih kosong, aplikasi mengimpor baris dari `SIMPELL.xlsx`. Sel `-` disimpan sebagai kosong.
- Data PM MS FO Kepri mengikuti blok di sheet: jenis, periode, target, nomor, tanggal, no tiket, no jaringan, customer, dan rincian. Slot target yang masih kosong ikut tersimpan.
- Kolom No. tidak lagi tampil di daftar, form, dan detail Data PM MS FO Kepri. Nomor yang sudah tersimpan tetap ada dan ikut ke unduhan Excel.
- Data PM MS FO Kepri punya kolom PJ tepat sebelum Aksi. Pilihan awalnya JOINTER dan TA. Nama PJ baru bisa diketik, lalu ikut tersimpan dan muncul lagi di pilihan berikutnya.
- Isian No Jaringan di Data PM MS FO Kepri bisa dicari dari nomor jaringan atau nama customer, sama seperti di Record Gangguan. Memilih hasil pencarian mengisi nama customer.
- Kolom PJ di Data MS FO Kepri dan Pendingan MS FO Kepri juga berada tepat sebelum Aksi. Isiannya memakai pilihan yang sama: JOINTER, TA, atau nama baru yang diketik.

### Data Spliter

- Menu Data Spliter menggantikan halaman kerangka. Isiannya mengikuti sheet DATA SPLITTER: lokasi, kartu, OLT, tray, core, no spliter, port, warna, deskripsi, destination, template, dan keterangan.
- Daftar menampilkan legenda warna inti optik. Port 1 sampai 12 memakai urutan biru, oranye, hijau, coklat, abu, putih, merah, hitam, kuning, ungu, pink, dan aqua.
- Warna bisa dipilih langsung di form. Mengisi nomor port 1 sampai 12 mengisi warna yang sesuai, dan pilihan itu masih bisa diganti.
- Saat tabel masih kosong, aplikasi mengimpor blok lokasi dari `SIMPELL.xlsx`. Baris judul, kartu, dan legend template tidak ikut disimpan.

### Data customer

- Daftar Data Customer menampilkan kolom Bandwidth di antara Service dan Akses. Kolom itu bisa diurutkan dan disaring.
- Impor sheet DATA CUSTOMER menyimpan setiap baris. Dua customer boleh memakai nomor jaringan yang sama asal namanya berbeda.
- Nomor `2025494235` punya dua nama Pegadaian, jadi 952 baris di Excel masuk sebagai 952 customer.
- Impor ulang hanya memperbarui baris yang nomor jaringan dan namanya sama.
- Alamat, kontak, dan email yang sudah tersimpan tidak ditimpa oleh sheet itu.
- Judul kolom di daftar Data Customer bisa diklik untuk mengurutkan naik atau turun.
- Kotak filter di bawah judul kolom menyaring seluruh data, bukan hanya 25 baris yang sedang tampil.
- Kolom Status memakai pilihan Active, Inactive, dan Suspended. Tanda `-` mencari sel yang kosong.
- Reset menghapus pencarian, filter kolom, dan urutan.

### Record GGN & PM

- Kolom Status dipindah ke depan kolom Durasi Progres. Urutan unduhan Excel mengikuti daftar.

### CPE/SDWAN

- Halaman daftar tidak lagi error 500. Jumlah data di judul diambil dari total baris yang sedang ditampilkan.

### Header

- Header punya tombol Logout di samping tombol portal.
- Logout meminta konfirmasi, lalu langsung membuka halaman login.

### Dashboard

- Dashboard menampilkan tiga grafik Record GGN & PM untuk tahun yang dipilih: perbandingan batang GGN dan PM per bulan, tren garis GGN, dan tren garis PM.
- GGN berwarna merah dan PM berwarna hijau toska. Case yang mengandung PM masuk seri PM. Record lain dihitung sebagai GGN.
- Januari sampai Desember tetap tampil. Bulan tanpa tiket bernilai nol. Grafik PM memakai skala sendiri.
- Di layar desktop, ketiga grafik tampil dalam satu baris. Di layar yang lebih sempit, grafik tersusun ke bawah.
- Unduhan Excel dashboard memuat jumlah GGN dan PM per tahun dan per bulan.

### Koordinat

- Latitude, longitude, dan lat long boleh dikosongkan. Isian kosong disimpan sebagai kosong dan tidak lagi membuat simpan gagal.
- Form yang tercakup: Data HH, Data ODP, Data Closure, ODC, M2M/SOLTEM, Pending GGN, sector Data Core, Radio Link, Data Customer, dan Data MS FO.
- Tanggal yang dikosongkan pada form tersebut juga tidak menghalangi simpan.

### Manajemen

- Grup Manajemen punya menu Changelog. Halaman itu menampilkan catatan perubahan ini.

### Menu

- Judul grup menu memakai latar biru seperti banner Selamat Datang, supaya berbeda dari submenu.

### Nomor jaringan

- Isian nomor jaringan di Data MS FO Kepri, Pendingan MS FO Kepri, Data Core, dan QC PSB bisa dicari dari nomor jaringan atau nama customer.
- Memilih hasil pencarian mengisi nama customer. Di Data Core, hasil itu mengisi nama lokasi.
- Nomor yang tidak ada di Data Customer tetap bisa diketik dan disimpan.

### QC PSB & Project

- Nama customer berada tepat setelah nomor jaringan di form, daftar, detail, dan unduhan Excel.
- Nomor tiket tidak lagi tampil di form, daftar, detail, pencarian, dan unduhan Excel. Nomor yang sudah tersimpan tidak dihapus saat data diubah.

### Header

- Header dashboard punya tombol tema terang dan gelap. Pilihan itu tersimpan di peramban dan di akun.

### Pendingan GGN & PM

- Urutan kolom daftar dan unduhan Excel menjadi Tanggal, No Ticket, No Jaringan, Customer, Rincian, Akses, PJ, Status, dan Keterangan.

### Akses Network

- Di P2P/FO Core, Direct LAN, dan FO Xconnect, kolom SN Modem pada detail node, form port, dan unduhan Excel berjudul NODE. Isinya tetap data yang sama.
- Menu Akses FO tetap memakai judul SN Modem.

## 2026-11-12

### Menu sesuai workbook

- Menu **QC PSB & Project** ditambah di Ticket & Monitoring.
- Grup Manage Service FO Kepri berisi Data MS FO Kepri, Pendingan MS FO Kepri, dan Data PM MS FO Kepri. Data PM MS FO Kepri masih menampilkan kolom dari sheet Excel.
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
