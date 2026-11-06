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

## Catálogo de fornecedores
- **Meu catálogo** (fornecedores cadastrados, favoritos, categorias) funciona sem configuração extra.
- **Encontrar fornecedores** funciona sem cadastro nenhum: usa o mapa gratuito do OpenStreetMap (alcance de até 100 km). A cobertura de empresas é menor que a do Google e telefone/site nem sempre aparecem.
- Opcional: para uma busca mais completa e com "Todo o Brasil", crie uma chave da "Places API (New)" no Google Cloud e coloque em `GOOGLE_PLACES_API_KEY`. O Google cobra acima da cota gratuita mensal.
- **Cadastro por CNPJ**: ao digitar o CNPJ no cadastro de fornecedor (catálogo ou nova ordem de compra), razão social, nome fantasia, endereço, CEP, cidade, UF, telefone e e-mail são preenchidos com os dados públicos da Receita (BrasilAPI, com ReceitaWS como reserva). Não precisa de chave nem configuração.

## Esqueceu a senha do administrador?
`pnpm set-password email@empresa.com NovaSenha123`

## Perfis e fluxo de compras
- **Administrador**: tudo, inclusive usuários e configurações.
- **Comprador**: atende as solicitações de compra (atualiza o status), cria e edita ordens de compra e cadastra fornecedores.
- **Supervisor (centro de custo)**: abre solicitações de compra e requisições de saída.
- **Supervisor de almoxarifado**: entrega as requisições de saída (dá baixa no estoque) e controla o estoque.
- **Usuário**: somente consulta.

Fluxo: solicitação de compra → comprador cota fora do sistema e faz a **ordem de compra** (status *Solicitado*) → ao marcar **Entregue** (comprador, almoxarifado ou administrador), cada item entra no estoque, e produto ainda não cadastrado é criado. Itens marcados como **uso específico** não entram no saldo. Voltar para *Solicitado* desfaz a entrada (só se os itens ainda estiverem no estoque). A saída de estoque só acontece por **Requisição de Saída**.


## Pendências conhecidas
- As logos ainda apontam para o CDN do Manus (`files.manuscdn.com`): baixe as imagens, coloque em `client/public/` e troque o endereço em `DashboardLayout.tsx` e `PurchaseOrderPrint.tsx`.
- O botão "enviar relatório por notificação" (em Relatórios) usava o serviço do Manus e não funciona fora dele.
- Upload de arquivos (anexos) nunca chegou a ser concluído no projeto original.
