/**
 * C7 (Pengalaman & Sertifikasi) score.
 *
 * PROVISIONAL: the weighting ("pembobotan pada data master", §2.6.3) is not
 * decided. This is the ONLY place the formula lives; change it here once it is
 * set. The form collects the two counts; the server turns them into one number.
 * C7 is the same for every lowongan of one mahasiswa, so it does not change the
 * ranking (known open issue).
 */
export const BOBOT_PROYEK = 1;
export const BOBOT_SERTIFIKASI = 1;

export const hitungSkorPengalaman = (jumlahProyek, jumlahSertifikasi) =>
  jumlahProyek * BOBOT_PROYEK + jumlahSertifikasi * BOBOT_SERTIFIKASI;
