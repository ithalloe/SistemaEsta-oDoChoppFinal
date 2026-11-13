/*
  Warnings:

  - You are about to drop the `ClienteResumo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RelatorioVendas` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA');

-- DropForeignKey
ALTER TABLE "ClienteResumo" DROP CONSTRAINT "ClienteResumo_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "RelatorioVendas" DROP CONSTRAINT "RelatorioVendas_clienteId_fkey";

-- DropTable
DROP TABLE "ClienteResumo";

-- DropTable
DROP TABLE "RelatorioVendas";

-- CreateTable
CREATE TABLE "MovimentacaoEstoque" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
