-- CreateTable
CREATE TABLE "role" (
    "role_id" SERIAL NOT NULL,
    "nama_role" VARCHAR(100) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "mahasiswa" (
    "mahasiswa_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "nim" VARCHAR(50) NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "angkatan" INTEGER NOT NULL,
    "ipk" DECIMAL(3,2) NOT NULL,
    "minat_bidang" VARCHAR(100) NOT NULL,
    "domisili_latitude" DECIMAL(8,6),
    "domisili_longitude" DECIMAL(9,6),
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mahasiswa_pkey" PRIMARY KEY ("mahasiswa_id")
);

-- CreateTable
CREATE TABLE "kompetensi" (
    "kompetensi_id" SERIAL NOT NULL,
    "kode_kompetensi" VARCHAR(10) NOT NULL,
    "nama_kompetensi" VARCHAR(255) NOT NULL,
    "kategori" VARCHAR(100) NOT NULL,
    "deskripsi" TEXT,
    "skala_maksimum" INTEGER NOT NULL,

    CONSTRAINT "kompetensi_pkey" PRIMARY KEY ("kompetensi_id")
);

-- CreateTable
CREATE TABLE "kompetensi_mahasiswa" (
    "km_id" SERIAL NOT NULL,
    "mahasiswa_id" INTEGER NOT NULL,
    "kompetensi_id" INTEGER NOT NULL,
    "level_penguasaan" INTEGER NOT NULL,

    CONSTRAINT "kompetensi_mahasiswa_pkey" PRIMARY KEY ("km_id")
);

-- CreateTable
CREATE TABLE "tempat_magang" (
    "tempat_id" SERIAL NOT NULL,
    "kode_tempat" VARCHAR(10) NOT NULL,
    "nama_perusahaan" VARCHAR(255) NOT NULL,
    "bidang_industri" VARCHAR(100) NOT NULL,
    "lokasi" VARCHAR(255) NOT NULL,
    "benefit_finansial" DECIMAL(8,2),
    "reputasi" INTEGER,
    "deskripsi" TEXT,
    "posisi" VARCHAR(255) NOT NULL,
    "mode_kerja" VARCHAR(100),
    "status_alternatif" VARCHAR(50) NOT NULL,
    "alasan_dikeluarkan" TEXT,
    "sumber_url" VARCHAR(500),
    "tanggal_akses" DATE,
    "latitude" DECIMAL(8,6),
    "longitude" DECIMAL(9,6),

    CONSTRAINT "tempat_magang_pkey" PRIMARY KEY ("tempat_id")
);

-- CreateTable
CREATE TABLE "kebutuhan_kompetensi" (
    "kebutuhan_id" SERIAL NOT NULL,
    "tempat_id" INTEGER NOT NULL,
    "kompetensi_id" INTEGER NOT NULL,
    "level_minimum" INTEGER NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL,

    CONSTRAINT "kebutuhan_kompetensi_pkey" PRIMARY KEY ("kebutuhan_id")
);

-- CreateTable
CREATE TABLE "hasil_cga" (
    "cga_id" SERIAL NOT NULL,
    "mahasiswa_id" INTEGER NOT NULL,
    "tempat_id" INTEGER NOT NULL,
    "compatibility_score" DECIMAL(7,4) NOT NULL,
    "tanggal_hitung" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hasil_cga_pkey" PRIMARY KEY ("cga_id")
);

-- CreateTable
CREATE TABLE "hasil_cga_detail" (
    "detail_id" SERIAL NOT NULL,
    "cga_id" INTEGER NOT NULL,
    "kompetensi_id" INTEGER NOT NULL,
    "level_mahasiswa" INTEGER,
    "level_minimum" INTEGER NOT NULL,
    "gap" INTEGER,
    "nilai_bobot" DECIMAL(3,1),
    "is_mandatory" BOOLEAN NOT NULL,

    CONSTRAINT "hasil_cga_detail_pkey" PRIMARY KEY ("detail_id")
);

-- CreateTable
CREATE TABLE "hasil_topsis" (
    "topsis_id" SERIAL NOT NULL,
    "cga_id" INTEGER NOT NULL,
    "nilai_preferensi" DECIMAL(10,8) NOT NULL,
    "ranking" INTEGER NOT NULL,
    "tanggal_hitung" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hasil_topsis_pkey" PRIMARY KEY ("topsis_id")
);

-- CreateTable
CREATE TABLE "kriteria_topsis" (
    "kriteria_id" SERIAL NOT NULL,
    "kode_kriteria" VARCHAR(10) NOT NULL,
    "nama_kriteria" VARCHAR(255) NOT NULL,
    "bobot" DECIMAL(5,4) NOT NULL,
    "tipe" VARCHAR(10) NOT NULL,

    CONSTRAINT "kriteria_topsis_pkey" PRIMARY KEY ("kriteria_id")
);

-- CreateTable
CREATE TABLE "pemetaan_bidang" (
    "pemetaan_id" SERIAL NOT NULL,
    "minat_bidang" VARCHAR(100) NOT NULL,
    "bidang_industri" VARCHAR(100) NOT NULL,
    "nilai_kesesuaian" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "pemetaan_bidang_pkey" PRIMARY KEY ("pemetaan_id")
);

-- CreateTable
CREATE TABLE "pengajuan" (
    "pengajuan_id" SERIAL NOT NULL,
    "mahasiswa_id" INTEGER NOT NULL,
    "tempat_id" INTEGER NOT NULL,
    "topsis_id" INTEGER NOT NULL,
    "tanggal_pengajuan" DATE NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "catatan_koordinator" TEXT,

    CONSTRAINT "pengajuan_pkey" PRIMARY KEY ("pengajuan_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mahasiswa_user_id_key" ON "mahasiswa"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "kompetensi_kode_kompetensi_key" ON "kompetensi"("kode_kompetensi");

-- CreateIndex
CREATE UNIQUE INDEX "kompetensi_mahasiswa_mahasiswa_id_kompetensi_id_key" ON "kompetensi_mahasiswa"("mahasiswa_id", "kompetensi_id");

-- CreateIndex
CREATE UNIQUE INDEX "tempat_magang_kode_tempat_key" ON "tempat_magang"("kode_tempat");

-- CreateIndex
CREATE UNIQUE INDEX "kebutuhan_kompetensi_tempat_id_kompetensi_id_key" ON "kebutuhan_kompetensi"("tempat_id", "kompetensi_id");

-- CreateIndex
CREATE UNIQUE INDEX "kriteria_topsis_kode_kriteria_key" ON "kriteria_topsis"("kode_kriteria");

-- CreateIndex
CREATE UNIQUE INDEX "pemetaan_bidang_minat_bidang_bidang_industri_key" ON "pemetaan_bidang"("minat_bidang", "bidang_industri");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mahasiswa" ADD CONSTRAINT "mahasiswa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kompetensi_mahasiswa" ADD CONSTRAINT "kompetensi_mahasiswa_mahasiswa_id_fkey" FOREIGN KEY ("mahasiswa_id") REFERENCES "mahasiswa"("mahasiswa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kompetensi_mahasiswa" ADD CONSTRAINT "kompetensi_mahasiswa_kompetensi_id_fkey" FOREIGN KEY ("kompetensi_id") REFERENCES "kompetensi"("kompetensi_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kebutuhan_kompetensi" ADD CONSTRAINT "kebutuhan_kompetensi_tempat_id_fkey" FOREIGN KEY ("tempat_id") REFERENCES "tempat_magang"("tempat_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kebutuhan_kompetensi" ADD CONSTRAINT "kebutuhan_kompetensi_kompetensi_id_fkey" FOREIGN KEY ("kompetensi_id") REFERENCES "kompetensi"("kompetensi_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_cga" ADD CONSTRAINT "hasil_cga_mahasiswa_id_fkey" FOREIGN KEY ("mahasiswa_id") REFERENCES "mahasiswa"("mahasiswa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_cga" ADD CONSTRAINT "hasil_cga_tempat_id_fkey" FOREIGN KEY ("tempat_id") REFERENCES "tempat_magang"("tempat_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_cga_detail" ADD CONSTRAINT "hasil_cga_detail_cga_id_fkey" FOREIGN KEY ("cga_id") REFERENCES "hasil_cga"("cga_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_cga_detail" ADD CONSTRAINT "hasil_cga_detail_kompetensi_id_fkey" FOREIGN KEY ("kompetensi_id") REFERENCES "kompetensi"("kompetensi_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_topsis" ADD CONSTRAINT "hasil_topsis_cga_id_fkey" FOREIGN KEY ("cga_id") REFERENCES "hasil_cga"("cga_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan" ADD CONSTRAINT "pengajuan_mahasiswa_id_fkey" FOREIGN KEY ("mahasiswa_id") REFERENCES "mahasiswa"("mahasiswa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan" ADD CONSTRAINT "pengajuan_tempat_id_fkey" FOREIGN KEY ("tempat_id") REFERENCES "tempat_magang"("tempat_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan" ADD CONSTRAINT "pengajuan_topsis_id_fkey" FOREIGN KEY ("topsis_id") REFERENCES "hasil_topsis"("topsis_id") ON DELETE RESTRICT ON UPDATE CASCADE;
