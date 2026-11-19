-- CreateTable
CREATE TABLE "sesi" (
    "sesi_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kedaluwarsa_pada" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sesi_pkey" PRIMARY KEY ("sesi_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sesi_token_hash_key" ON "sesi"("token_hash");

-- CreateIndex
CREATE INDEX "sesi_kedaluwarsa_pada_idx" ON "sesi"("kedaluwarsa_pada");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
