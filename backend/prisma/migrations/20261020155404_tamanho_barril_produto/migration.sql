-- CreateEnum
CREATE TYPE "TamanhoBarril" AS ENUM ('BARRIL_30L', 'BARRIL_50L');

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "tamanho" "TamanhoBarril" NOT NULL DEFAULT 'BARRIL_30L';
