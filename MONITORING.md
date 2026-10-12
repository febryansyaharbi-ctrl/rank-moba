# Monitoring Tabel

Menu MONITORING tersedia untuk semua pengunjung, tanpa login admin. Data berasal dari listener pemain dan tim yang sudah digunakan website; fitur ini tidak menulis ke Firestore.

## Perhitungan

Saldo tanggal d = saldo tanggal d-1 + poin tanggal d bulan terpilih - poin tanggal d bulan sebelumnya.
Saldo awal setiap bulan adalah 0. Saldo positif ditampilkan sebagai GROWTH, nol IMPAS, negatif TERTINGGAL. Contoh saldo sebelumnya -3 dan lawan 4: poin 7 menghasilkan 0; 8 menghasilkan +1; 6 menghasilkan -1.

Target impas = max(0, lawan - saldo sebelumnya).
Target unggul = max(0, lawan - saldo sebelumnya + 1), untuk poin bilangan bulat.
Target merupakan total poin yang dibutuhkan pada hari tersebut, bukan tambahan poin. Detail sel juga menampilkan tambahan yang masih diperlukan.

Tim menjumlahkan poin seluruh anggota yang saat ini memiliki guild_id tim tersebut, termasuk pembanding bulan lalu. Riwayat perpindahan tim belum tersedia pada skema lama; hasil bukan rekonstruksi keanggotaan historis. Pemain tanpa tim atau dengan referensi tim yang sudah tidak ada ditampilkan di Tanpa tim.

Nilai kosong dihitung 0 dengan tanda * pada saldo sementara; nol yang diinput dibedakan dari data kosong. Tanggal masa depan tidak diberi hasil saldo. Jika bulan lalu tidak memiliki tanggal pasangan (misalnya 31 Maret versus Februari), lawan dihitung 0 dan detail menjelaskannya. Hari berjalan mengikuti Asia/Jakarta.

## Tampilan

Filter bulan/tim, pencarian nama pemain, fokus tanggal, ringkasan poin/saldo/target, kolom nama dan header tanggal tetap terlihat saat menggulir tabel. Klik header tanggal untuk fokus ringkasan. Klik baris tim untuk buka/tutup anggota. Klik sel untuk rincian perhitungan. Pencarian pemain hanya menyaring baris, tidak mengubah total tim atau ringkasan tim.

## Validasi dan batas akses

Jalankan `node --test tests/*.test.cjs` (Node 18+). Ada 15 pengujian perhitungan dan render/interaksi memakai DOM tiruan. Belum ada verifikasi visual browser penuh; pengunduhan browser pengujian tidak berhasil.

Fitur ini mengikuti izin Firestore yang ada. Rules kedaluwarsa yang sebelumnya diberikan pengguna tetap harus diperbaiki di Firebase Console agar data bisa dibaca. Fitur tidak mengubah Rules, login, PIN, atau data database.

## Cadangan sebelum perubahan

Seluruh kode main sebelum fitur tersimpan di branch `backup/before-monitoring-2026-10-13`, commit `fd8c66a0f20a07b2846fad52652c5855a67d99c9`. Branch perbaikan Firebase sebelumnya tetap terpisah. Cadangan kode tidak mencakup data Firestore karena izin baca database ditolak. Untuk rollback gunakan revert commit fitur sehingga riwayat dan perubahan sesudahnya tetap terjaga.
