-- Gera uma movimentação de "Saldo inicial" para cada produto que já existia
-- antes da implantação do histórico de estoque e ainda não possui nenhuma movimentação.
-- Isso garante que a soma das movimentações de cada produto reproduza o saldo atual.
INSERT INTO "MovimentacaoEstoque" ("produtoId", "tipo", "quantidade", "observacao", "criadoEm")
SELECT p."id", 'ENTRADA', p."quantidade", 'Saldo inicial (implantação do histórico)', NOW()
FROM "Produto" p
WHERE p."quantidade" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "MovimentacaoEstoque" m WHERE m."produtoId" = p."id"
  );
