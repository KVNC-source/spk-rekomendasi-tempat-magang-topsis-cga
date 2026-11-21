/**
 * Data Layer for the administrator's account scripts (reset-password). The only place that
 * talks to Prisma for them. Login and registration live in auth.repository.js.
 */
export function createAkunRepository(prisma) {
  return {
    /**
     * Replaces the password hash and deletes EVERY session of the user, in one transaction.
     * Returns how many sessions were deleted.
     */
    async ubahPasswordDanHapusSesi(userId, passwordHash) {
      return prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { user_id: userId }, data: { password: passwordHash } });
        const { count } = await tx.sesi.deleteMany({ where: { user_id: userId } });
        return { sesiDihapus: count };
      });
    },
  };
}
