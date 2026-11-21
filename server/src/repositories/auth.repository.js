/** Data Layer for login: users, roles and sessions. The only place that talks to Prisma for it. */
const sertakanPengguna = {
  role: true,
  mahasiswa: { select: { mahasiswa_id: true, nama: true, nim: true } },
};

export function createAuthRepository(prisma) {
  return {
    /** `email` is already trimmed and lower-case. */
    findUserByEmail(email) {
      return prisma.user.findUnique({ where: { email }, include: sertakanPengguna });
    },

    findMahasiswaByNim(nim) {
      return prisma.mahasiswa.findUnique({ where: { nim }, select: { mahasiswa_id: true } });
    },

    /**
     * The users row and its mahasiswa row in ONE nested create, so both exist or neither does.
     * Returns the user in the shape findUserByEmail does (role + mahasiswa).
     */
    async buatAkunMahasiswa({ namaRole, email, username, passwordHash, nama, nim, angkatan, persetujuanPada }) {
      const role = await prisma.role.findFirst({ where: { nama_role: namaRole } });
      if (!role) throw new Error(`Role "${namaRole}" tidak ada di tabel role. Jalankan seed.`);
      return prisma.user.create({
        data: {
          role_id: role.role_id,
          email,
          username,
          password: passwordHash,
          status: 'aktif',
          mahasiswa: { create: { nim, nama, angkatan, persetujuan_pada: persetujuanPada } },
        },
        include: sertakanPengguna,
      });
    },

    buatSesi({ userId, tokenHash, kedaluwarsaPada }) {
      return prisma.sesi.create({
        data: { user_id: userId, token_hash: tokenHash, kedaluwarsa_pada: kedaluwarsaPada },
      });
    },

    findSesi(tokenHash) {
      return prisma.sesi.findUnique({
        where: { token_hash: tokenHash },
        include: { user: { include: sertakanPengguna } },
      });
    },

    hapusSesi(tokenHash) {
      return prisma.sesi.deleteMany({ where: { token_hash: tokenHash } });
    },

    /** Called at every login, so the table does not fill up with dead sessions. */
    hapusSesiKedaluwarsa(sekarang) {
      return prisma.sesi.deleteMany({ where: { kedaluwarsa_pada: { lte: sekarang } } });
    },
  };
}
