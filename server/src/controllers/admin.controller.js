export function createAdminController({ adminService }) {
  return {
    // --- kriteria
    async kriteria(req, res) {
      res.json(await adminService.daftarKriteria());
    },
    async ubahKriteria(req, res) {
      res.json(await adminService.ubahBobot(req.body));
    },

    // --- referensi (lists for the forms)
    async referensi(req, res) {
      res.json(await adminService.referensi());
    },

    // --- kompetensi
    async daftarKompetensi(req, res) {
      res.json({ kompetensi: await adminService.daftarKompetensi() });
    },
    async buatKompetensi(req, res) {
      res.status(201).json(await adminService.buatKompetensi(req.body));
    },
    async ubahKompetensi(req, res) {
      res.json(await adminService.ubahKompetensi(req.params.kode, req.body));
    },
    async hapusKompetensi(req, res) {
      await adminService.hapusKompetensi(req.params.kode);
      res.status(204).end();
    },

    // --- tempat magang
    async daftarTempat(req, res) {
      res.json({ tempat: await adminService.daftarTempat() });
    },
    async ambilTempat(req, res) {
      res.json(await adminService.ambilTempat(req.params.kode));
    },
    async buatTempat(req, res) {
      res.status(201).json(await adminService.buatTempat(req.body));
    },
    async ubahTempat(req, res) {
      res.json(await adminService.ubahTempat(req.params.kode, req.body));
    },
    async hapusTempat(req, res) {
      await adminService.hapusTempat(req.params.kode);
      res.status(204).end();
    },
  };
}
