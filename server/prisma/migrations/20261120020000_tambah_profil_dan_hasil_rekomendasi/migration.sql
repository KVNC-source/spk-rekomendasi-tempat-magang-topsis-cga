-- AlterTable
ALTER TABLE "mahasiswa" ADD COLUMN     "jumlah_proyek" INTEGER,
ADD COLUMN     "jumlah_sertifikasi" INTEGER,
ADD COLUMN     "kota_domisili" VARCHAR(100),
ALTER COLUMN "ipk" DROP NOT NULL,
ALTER COLUMN "minat_bidang" DROP NOT NULL;

-- CreateTable
CREATE TABLE "hasil_rekomendasi" (
    "hasil_rekomendasi_id" SERIAL NOT NULL,
    "mahasiswa_id" INTEGER NOT NULL,
    "hasil" JSONB NOT NULL,
    "dihitung_pada" TIMESTAMP(3) NOT NULL,
    "profil_diperbarui_pada" TIMESTAMP(3) NOT NULL,
    "sidik_profil" VARCHAR(64) NOT NULL,
    "sidik_data" VARCHAR(64) NOT NULL,

    CONSTRAINT "hasil_rekomendasi_pkey" PRIMARY KEY ("hasil_rekomendasi_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hasil_rekomendasi_mahasiswa_id_key" ON "hasil_rekomendasi"("mahasiswa_id");

-- AddForeignKey
ALTER TABLE "hasil_rekomendasi" ADD CONSTRAINT "hasil_rekomendasi_mahasiswa_id_fkey" FOREIGN KEY ("mahasiswa_id") REFERENCES "mahasiswa"("mahasiswa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
