/*
  Warnings:

  - You are about to drop the `pengajuan` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "pengajuan" DROP CONSTRAINT "pengajuan_mahasiswa_id_fkey";

-- DropForeignKey
ALTER TABLE "pengajuan" DROP CONSTRAINT "pengajuan_tempat_id_fkey";

-- DropForeignKey
ALTER TABLE "pengajuan" DROP CONSTRAINT "pengajuan_topsis_id_fkey";

-- DropTable
DROP TABLE "pengajuan";

-- CreateTable
CREATE TABLE "pilihan" (
    "pilihan_id" SERIAL NOT NULL,
    "mahasiswa_id" INTEGER NOT NULL,
    "tempat_id" INTEGER NOT NULL,
    "topsis_id" INTEGER,
    "dipilih_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pilihan_pkey" PRIMARY KEY ("pilihan_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pilihan_mahasiswa_id_key" ON "pilihan"("mahasiswa_id");

-- AddForeignKey
ALTER TABLE "pilihan" ADD CONSTRAINT "pilihan_mahasiswa_id_fkey" FOREIGN KEY ("mahasiswa_id") REFERENCES "mahasiswa"("mahasiswa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilihan" ADD CONSTRAINT "pilihan_tempat_id_fkey" FOREIGN KEY ("tempat_id") REFERENCES "tempat_magang"("tempat_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilihan" ADD CONSTRAINT "pilihan_topsis_id_fkey" FOREIGN KEY ("topsis_id") REFERENCES "hasil_topsis"("topsis_id") ON DELETE SET NULL ON UPDATE CASCADE;
