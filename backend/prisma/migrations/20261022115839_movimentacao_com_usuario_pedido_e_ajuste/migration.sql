-- AlterEnum
ALTER TYPE "TipoMovimentacao" ADD VALUE 'AJUSTE';

-- AlterTable
ALTER TABLE "MovimentacaoEstoque" ADD COLUMN     "pedidoId" INTEGER,
ADD COLUMN     "usuarioId" INTEGER;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
