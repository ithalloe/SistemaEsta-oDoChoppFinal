/*
  Warnings:

  - Added the required column `usuarioId` to the `Pedido` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "usuarioId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "RelatorioVendas" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "totalPedidos" INTEGER NOT NULL,
    "totalReceita" DOUBLE PRECISION NOT NULL,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelatorioVendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteResumo" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "nomeCliente" TEXT NOT NULL,
    "totalPedidos" INTEGER NOT NULL,
    "totalReceita" DOUBLE PRECISION NOT NULL,
    "ticketMedio" DOUBLE PRECISION NOT NULL,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteResumo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatorioVendas" ADD CONSTRAINT "RelatorioVendas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteResumo" ADD CONSTRAINT "ClienteResumo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
