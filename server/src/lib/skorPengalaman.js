/**
 * C7 (Pengalaman & Sertifikasi) score.
 *
 * Table 3.2 of the thesis defines C7 as "skor terakumulasi dari pengalaman proyek
 * dan sertifikasi profesional relevan": only projects and certifications that
 * are relevant to the IT field are counted (the profile form says so).
 *
 * PROVISIONAL: the weighting ("pembobotan pada data master", §2.6.3) is not
 * decided. This is the ONLY place the formula lives. The server uses it to build
 * the engine profile and the client mock imports this very file (see
 * client/vite.config.js), so changing the weights here changes both.
 * C7 is the same for every lowongan of one mahasiswa, so it does not change the
 * ranking (known open issue).
 */
export const BOBOT_PROYEK = 1;
export const BOBOT_SERTIFIKASI = 1;

export const hitungSkorPengalaman = (jumlahProyek, jumlahSertifikasi) =>
  jumlahProyek * BOBOT_PROYEK + jumlahSertifikasi * BOBOT_SERTIFIKASI;
