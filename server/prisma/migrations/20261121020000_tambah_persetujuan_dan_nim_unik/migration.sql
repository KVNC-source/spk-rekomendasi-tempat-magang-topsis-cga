-- AlterTable
ALTER TABLE "mahasiswa" ADD COLUMN     "persetujuan_pada" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "mahasiswa_nim_key" ON "mahasiswa"("nim");
