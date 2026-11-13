# METHABALANCE Dashboard: arah desain

Sumber arah: dokumen kebutuhan produk METHABALANCE, bagian 17 (karakter visual industrial dan environmental monitoring, warna tenang, angka mudah dibaca, tanpa dekorasi berlebih).

Design Read: dashboard operasional untuk operator DLH dan teknisi lapangan, bahasa visual panel instrumen industrial yang tenang, dial **ENERGY 1 / RHYTHM 2 / MOTION 1**.

- ENERGY 1: alat kerja harian, bukan halaman promosi. Angka dan status harus terbaca sebelum hal lain.
- RHYTHM 2: setiap halaman punya komposisi sesuai isinya (strip neraca, skema topologi, tabel, formulir), bukan grid kartu seragam.
- MOTION 1: hanya state hover/fokus. Grafik tanpa animasi supaya pembaruan data tidak mengganggu pembacaan.

## Keputusan dan alasannya (R-31)

| Keputusan | Alasan satu baris |
|---|---|
| Latar kertas hangat `#f3f4f1` + panel putih | Meniru lembar log lapangan; panel putih memisahkan data dari latar tanpa bayangan. |
| Warna utama hijau hutan `#1f5c45` | Identitas lingkungan/WASTECO, dipakai hemat hanya untuk navigasi aktif dan tombol utama. |
| Aksen tunggal: garis arsir kuning-hitam untuk MODE DEMO | Konvensi rambu "area kerja/bukan kondisi nyata", fungsinya memperingatkan bahwa data adalah simulasi. |
| Warna status hijau/kuning/merah/abu/biru | Ditetapkan dokumen kebutuhan 7.3; selalu disertai ikon bentuk dan teks. |
| Palet seri grafik Okabe-Ito + pola garis | Aman bagi buta warna; lima node tetap bisa dibedakan tanpa warna. |
| Font sistem (Segoe UI / Roboto / Helvetica) | Tidak butuh internet di lokasi TPAS, angka tabular tersedia, terbaca di layar ponsel. |
| Monospace hanya untuk label tag node (`MB-HD-01`) | Motif identitas: meniru pelat tag instrumen di lapangan, dipakai berulang di semua halaman. |
| Radius 6 px panel, 4 px kontrol, 2 px tag | Hierarki halus; tidak ada elemen berbentuk pil. |
| Bayangan hanya pada dialog dan drawer | Penanda elevasi untuk lapisan yang menutupi konten, bukan dekorasi. |
| Tema terang default + toggle gelap | Terang untuk ponsel di bawah matahari lapangan; gelap untuk ruang kontrol malam hari. |
| Skema topologi SVG, bukan pin peta | Koordinat belum disurvei; peta geografis baru tampil setelah koordinat diverifikasi. |
