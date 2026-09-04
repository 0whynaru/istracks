# ISTrack

ISTrack adalah pos kendali pribadi untuk memantau Stasiun Luar Angkasa Internasional (ISS) secara langsung — posisi di globe 3D, kecepatan & ketinggian, jadwal lintasan di atas lokasimu, cuaca di titik orbitnya, awak yang sedang bertugas, sampai mode Augmented Reality untuk mencari ISS di langit malam lewat kamera HP. Dibuat sebagai situs statis (HTML/CSS/JS murni), tanpa build step, tanpa backend.

🔗 Coba langsung di browser dengan menjalankan `index.html` lewat local server (lihat bagian [Menjalankan Secara Lokal](#menjalankan-secara-lokal)).

## Fitur

### Pelacak ISS (`index.html`)
- **Globe 3D interaktif** (Three.js) dengan tekstur siang/malam, label kota, dan animasi orbit.
- **Posisi & kecepatan real-time** dari data TLE (Two-Line Element), dihitung dengan `satellite.js` (SGP4).
- **Jadwal lintasan** — kapan ISS terlihat dari lokasimu (harus tersinari matahari, cukup tinggi di langit, langit sudah gelap).
- **Transit matahari/bulan** — prediksi momen langka ISS lewat tepat di depan piringan matahari atau bulan.
- **Histori ketinggian & kecepatan** dalam bentuk chart (Chart.js), terkumpul selama sesi berjalan.
- **Cuaca di titik orbit** tepat di koordinat yang sedang dilintasi ISS (Open-Meteo).
- **Awak di luar angkasa** — daftar orang yang sedang berada di luar atmosfer Bumi beserta negara asal & lama misi.
- **Aktivitas ISS** — jadwal spacewalk (EVA) dan docking pesawat terbaru.
- **Bandingkan satelit lain** — cari & tampilkan satelit selain ISS di globe yang sama.
- **Data TLE mentah** untuk verifikasi manual atau diimpor ke software lain (Skyfield, STK, GMAT, Stellarium, dll).
- **Playback orbit 24 jam terakhir** di globe.
- **Foto luar angkasa harian** (NASA Astronomy Picture of the Day).
- **Kartu berbagi (share card)** — ekspor status ISS saat ini sebagai gambar.
- **Mode AR** — arahkan kamera HP ke langit untuk melihat penanda posisi ISS, satelit lain, matahari, bulan, dan planet secara live overlay.
- **Baca status ISS** dengan text-to-speech untuk aksesibilitas.

### Warta (`news.html`)
Ringkasan berita seputar dunia, politik, bisnis, teknologi, olahraga, hiburan, kesehatan, dan sains, dengan pencarian topik — didukung oleh [NewsData.io](https://newsdata.io/) (butuh API key gratis, disimpan hanya di peramban pengguna).

### Pengaturan (`settings.html`)
- Ganti bahasa antarmuka (Indonesia / English).
- Satuan metrik atau imperial.
- Tema tampilan: Gelap (default), True Black (OLED), atau Kontras tinggi.
- Warna aksen menu navigasi.
- Mode aksesibilitas: pembacaan status otomatis & palet warna ramah buta-warna untuk marker satelit.

Semua preferensi disimpan di `localStorage` peramban dan berlaku di seluruh halaman.

## Struktur Proyek

```
.
├── index.html          Halaman utama — globe, panel data, mode AR
├── news.html            Halaman Warta (berita)
├── settings.html         Halaman Pengaturan
├── splash.html           Halaman splash/landing
├── style.css             Gaya utama situs
├── news.css              Gaya khusus halaman Warta
├── splash.css             Gaya khusus halaman splash
├── script.js              Logika utama: TLE, posisi ISS, panel data, API
├── globe.js               Render & interaksi globe 3D
├── ar.js                  Logika mode AR
├── astro.js                Perhitungan posisi matahari/bulan/planet
├── map-controls.js        Kontrol zoom/layer/filter peta
├── news.js                 Logika halaman Warta
├── share-card.js            Pembuatan kartu berbagi
├── starfield-data.js         Data bintang untuk latar canvas
├── i18n.js                    Terjemahan & util bahasa
├── theme.js                    Util tema
├── menu-color.js                Util warna menu navigasi
├── motion.js                     Util animasi/reduced-motion
├── botpress-widget.js             Penyesuaian widget chat Botpress agar tidak tumpang tindih dengan mode AR
└── assets/                         Logo & gambar
```

## Menjalankan Secara Lokal

Karena situs ini murni statis, cukup sajikan foldernya lewat server lokal (tidak bisa dibuka langsung via `file://` karena beberapa fitur butuh konteks HTTP/HTTPS, seperti akses lokasi & kamera).

```bash
# Python
python3 -m http.server 8080

# atau Node.js
npx serve .
```

Lalu buka `http://localhost:8080` di browser.

> **Catatan:** Mode AR butuh izin akses kamera & sensor orientasi perangkat, yang biasanya hanya diizinkan browser di konteks **HTTPS** (atau `localhost`). Untuk mengetes di HP, deploy dulu ke hosting HTTPS (GitHub Pages, Netlify, Vercel, dll) atau gunakan tunnel seperti `ngrok`.

## Sumber Data & API Pihak Ketiga

| Layanan | Kegunaan |
|---|---|
| [wheretheiss.at](https://api.wheretheiss.at/) | Posisi & TLE ISS |
| [CelesTrak](https://celestrak.org/) & [tle.ivanstanojevic.me](https://tle.ivanstanojevic.me/) | Data TLE satelit (termasuk pencarian satelit lain) |
| [Open-Meteo](https://open-meteo.com/) | Cuaca di titik orbit |
| [The Space Devs — Launch Library](https://ll.thespacedevs.com/) | Jadwal spacewalk & docking |
| [International Space Station APIs](https://github.com/corquaid/international-space-station-APIs) | Data awak di luar angkasa |
| [BigDataCloud](https://www.bigdatacloud.com/) | Reverse geocoding lokasi pengguna |
| [NASA APOD API](https://api.nasa.gov/) | Foto luar angkasa harian |
| [NewsData.io](https://newsdata.io/) | Berita di halaman Warta (butuh API key sendiri) |
| [Wikipedia REST API](https://www.mediawiki.org/wiki/API:REST_API) | Ringkasan info satelit |

Beberapa permintaan ke CelesTrak/TLE API di-proxy lewat [corsproxy.io](https://corsproxy.io/) untuk menghindari isu CORS di browser.

## Widget Chat (Botpress)

Situs ini menyematkan widget chat [Botpress](https://botpress.com/) di halaman `index.html`, `news.html`, dan `settings.html`. Untuk menghindari tumpang tindih dengan mode AR (yang memakai overlay kamera layar penuh), `botpress-widget.js` otomatis menyembunyikan widget saat mode AR aktif dan menampilkannya kembali setelah ditutup. Tombol aktivasi AR (`.ar-fab-btn`) juga sengaja diposisikan di kiri-bawah supaya tidak bertumpuk dengan launcher widget chat yang ada di kanan-bawah.

Untuk mengganti widget chat dengan milikmu sendiri, cukup ganti dua tag `<script>` Botpress di bagian bawah tiap halaman.

## Aksesibilitas

- Navigasi bisa sepenuhnya dengan keyboard, termasuk skip-link ke konten utama.
- Status ISS bisa dibacakan lewat text-to-speech (manual atau otomatis tiap 60 detik).
- Mode kontras tinggi & True Black tersedia di Pengaturan.
- Palet warna marker satelit ramah buta-warna (protanopia, deuteranopia, tritanopia) sebagai opsi.
- Menghormati preferensi `prefers-reduced-motion` sistem pengguna.

## Bahasa

Antarmuka tersedia dalam Bahasa Indonesia (default) dan English, bisa diganti kapan saja lewat halaman Pengaturan.

## Lisensi

Belum ditentukan — tambahkan berkas `LICENSE` sesuai kebutuhanmu sebelum membuat repositori ini publik.
