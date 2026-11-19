/** Data Layer for the administrator endpoints. */
export function createAdminRepository(prisma) {
  return {
    findKriteria() {
      return prisma.kriteriaTopsis.findMany({ orderBy: { kode_kriteria: 'asc' } });
    },
  };
}
