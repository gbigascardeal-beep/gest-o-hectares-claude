# Gestão Hectares

Sistema de gestão de estoque e compras (produtos, movimentações, ordens de compra, requisições, relatórios e patrimônio).
Roda sozinho, sem depender do Manus: login próprio por e-mail e senha.

## O que você precisa
- Node.js 20 ou mais novo
- pnpm (`npm i -g pnpm`)
- Um banco MySQL vazio (local, Railway, Render, TiDB Cloud, etc.)

## Primeira vez
1. `pnpm install`
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL`, `JWT_SECRET` (`openssl rand -hex 32`) e os dados do primeiro administrador (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
3. (As tabelas são criadas sozinhas quando o sistema liga.)
4. `pnpm dev` e abra http://localhost:3000
5. Entre com o e-mail e a senha do `.env`. Em **Usuários** você cadastra o resto da equipe.

Depois do primeiro acesso, cadastre pelo menos um centro de custo em **Configurações** (as retiradas por requisição de saída usam o centro "Estoque", ou o primeiro ativo).

## Colocar no ar
- `pnpm build` e depois `pnpm start` (usa a variável `PORT`).
- Configure as mesmas variáveis do `.env` no painel da hospedagem. Use HTTPS.

## Esqueceu a senha do administrador?
`pnpm set-password email@empresa.com NovaSenha123`

## Perfis
- **Administrador**: tudo, inclusive usuários e configurações.
- **Supervisor**: uso normal e também pode excluir e cancelar registros.
- **Usuário**: uso do dia a dia, sem excluir nem cancelar.

## Pendências conhecidas
- As logos ainda apontam para o CDN do Manus (`files.manuscdn.com`): baixe as imagens, coloque em `client/public/` e troque o endereço em `DashboardLayout.tsx` e `PurchaseOrderPrint.tsx`.
- O botão "enviar relatório por notificação" (em Relatórios) usava o serviço do Manus e não funciona fora dele.
- Upload de arquivos (anexos) nunca chegou a ser concluído no projeto original.
