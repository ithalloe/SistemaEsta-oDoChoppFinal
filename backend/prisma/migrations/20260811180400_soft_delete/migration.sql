-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "excluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "excluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "excluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "excluidoEm" TIMESTAMP(3);
