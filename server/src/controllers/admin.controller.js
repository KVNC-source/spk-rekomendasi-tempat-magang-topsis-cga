export function createAdminController({ adminService }) {
  return {
    async kriteria(req, res) {
      res.json({ kriteria: await adminService.daftarKriteria() });
    },
  };
}
