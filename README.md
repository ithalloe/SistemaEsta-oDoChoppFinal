# Estação do Chopp

Sistema de gestão de pedidos e entregas para uma distribuidora de chopp. Centraliza
clientes, produtos, pedidos, estoque e relatórios financeiros, com login e dois níveis
de acesso: administrador (acesso completo) e funcionário (parte operacional, sem o
financeiro e sem a gestão de usuários).

## Funcionalidades

**Dashboard** com total de clientes, pedidos do dia, pedidos pendentes e pedidos
recentes. O faturamento aparece apenas para o administrador.

**Clientes** com cadastro, edição, busca por nome, email ou telefone e exclusão.

**Pedidos** seguem um fluxo de status: Pendente → Em andamento → Concluído. Ao concluir,
o estoque dos produtos é baixado automaticamente; ao cancelar um pedido já concluído, o
estoque é devolvido. Pedidos podem ser editados (inclusive os concluídos, com o estoque
ajustado pela diferença), e o preço de cada item é sempre o do cadastro do produto.
Operações simultâneas no mesmo pedido (como dois cliques em "avançar") são tratadas
para que o estoque nunca seja baixado ou devolvido duas vezes.

**Estoque** mantém o saldo de cada produto e o histórico completo de movimentações
(entradas, saídas e ajustes), permitindo rastrear como o saldo foi formado.

**Relatórios** (restritos ao administrador): vendas por período e cliente, resumo mensal,
ticket médio e ranking de produtos por faturamento. Todos exportáveis em PDF e Excel.

**Usuários** (restrito ao administrador): cadastro de administradores e funcionários.
Excluir um usuário ou mudar seu papel vale imediatamente, mesmo que ele esteja logado.

As exclusões são lógicas (soft delete): os registros não são apagados do banco, apenas
marcados como excluídos, preservando o histórico de pedidos. Cadastrar novamente um
email (ou nome de produto) excluído reativa o registro antigo.

## Tecnologias

Backend em Node.js com Express e TypeScript, Prisma como ORM e PostgreSQL 16 como banco
(local ou no Supabase). Autenticação com JWT e senhas protegidas com bcrypt. Relatórios
gerados com PDFKit (PDF) e ExcelJS (Excel).

Frontend em React com TypeScript e Vite, usando React Router e Axios. Interface responsiva
para desktop e celular.

## Estrutura

```
backend/
  prisma/        schema, migrations e seed
  src/
    assets/      logo usada nos PDFs
    middleware/  autenticação e autorização
    routes/      rotas da API
    utils/       regras de estoque, cálculo e exportação de relatórios
    prisma.ts    conexão única com o banco
frontend/
  src/
    components/  componentes reutilizáveis
    context/     contexto de autenticação
    pages/       telas
    services/    cliente HTTP e download de arquivos
    styles/      arquivos CSS (estilos globais e CSS Modules de cada tela)
    utils/       funções auxiliares (formatação de telefone)
```

## Como rodar

Pré-requisitos: Node.js 18+ e um banco PostgreSQL (local ou Supabase).

Comece configurando as variáveis de ambiente do backend. Copie o `.env.example` para
`.env` e preencha com a conexão do banco e uma chave aleatória para o JWT:

```bash
cd backend
cp .env.example .env
```

O `.env` é ignorado pelo git, então os valores reais ficam seguros.

Em seguida, instale as dependências, prepare o banco e inicie a API:

```bash
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

O seed popula o banco com usuários, produtos e clientes de exemplo.

Em outro terminal, inicie o frontend:

```bash
cd frontend
npm install
npm run dev
```

O sistema fica disponível em http://localhost:5173 e a API em http://localhost:3001.

## Acesso

O seed cria dois usuários:

- Administrador: `admin@estacaodochopp.com` / `admin123`
- Funcionário: `funcionario@estacaodochopp.com` / `func123`

São credenciais de desenvolvimento. Troque-as antes de qualquer uso real.

## Build de produção

No backend, `npm run build` compila para `dist/` (incluindo os assets, como a logo usada
nos PDFs) e `npm start` executa a versão compilada. No frontend, `npm run build` gera os
arquivos estáticos e `npm run preview` permite visualizá-los localmente.
