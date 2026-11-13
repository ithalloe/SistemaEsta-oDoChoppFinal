/*
  Warnings:

  - You are about to alter the column `totalReceita` on the `ClienteResumo` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `ticketMedio` on the `ClienteResumo` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `precoUnitario` on the `ItemPedido` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `precoTotal` on the `ItemPedido` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `valorTotal` on the `Pedido` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `precoUnitario` on the `Produto` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `totalReceita` on the `RelatorioVendas` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[nome]` on the table `Produto` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ClienteResumo" ALTER COLUMN "totalReceita" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "ticketMedio" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ItemPedido" ALTER COLUMN "precoUnitario" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "precoTotal" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Pedido" ALTER COLUMN "valorTotal" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Produto" ALTER COLUMN "precoUnitario" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "RelatorioVendas" ALTER COLUMN "totalReceita" SET DATA TYPE DECIMAL(10,2);

-- CreateIndex
CREATE UNIQUE INDEX "Produto_nome_key" ON "Produto"("nome");
