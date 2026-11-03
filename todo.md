# Sistema de Gestão de Estoque e Compras - TODO

## Fase 1: Banco de Dados e Estrutura
- [x] Definir schema de banco de dados completo
- [x] Criar tabelas: produtos, centros_custo, movimentacoes, ordens_compra, itens_ordem, arquivos
- [x] Executar migrações (pnpm db:push)
- [x] Criar helpers de query em server/db.ts

## Fase 2: Autenticação e Permissões
- [x] Implementar sistema de roles (Admin/Supervisor)
- [x] Criar protectedProcedure com verificação de permissões
- [x] Implementar adminProcedure para operações críticas
- [x] Criar página de login com redirecionamento (via OAuth Manus)

## Fase 3: Layout Base e Navegação
- [x] Configurar DashboardLayout com sidebar
- [x] Criar menu de navegação com links para módulos
- [x] Implementar header com dados do usuário
- [x] Configurar tema visual (cores, tipografia)

## Fase 4: Cadastro de Produtos
- [x] Criar formulário de cadastro de produtos
- [x] Implementar listagem com filtros e busca
- [x] Corrigir erro na página de produtos (valores padrão para arrays)
- [x] Adicionar edição e exclusão de produtos
- [x] Criar validações de estoque mínimo/máximo
- [x] Escrever testes (vitest) para operações de produtos

## Fase 5: Cadastro de Centros de Custo
- [x] Criar CRUD de centros de custo
- [x] Implementar validações
- [x] Adicionar ao formulário de movimentações
- [x] Escrever testes para centros de custo

## Fase 6: Controle de Estoque
- [x] Criar interface de entrada de produtos
- [x] Criar interface de saída de produtos
- [x] Implementar histórico de movimentações
- [x] Adicionar alertas visuais (estoque mínimo/máximo)
- [x] Criar listagem de movimentações com filtros
- [x] Escrever testes para movimentações

## Fase 7: Ordens de Compra
- [x] Criar formulário de cadastro de ordem de compra
- [x] Implementar gestão de status (Pendente/Aprovada/Finalizada)
- [ ] Adicionar geração de PDF
- [x] Criar listagem de ordens com filtros
- [ ] Implementar edição e cancelamento
- [ ] Escrever testes para ordens de compra

## Fase 8: Relatórios
- [x] Criar relatório de estoque atual
- [x] Criar relatório de entradas e saídas por período
- [x] Criar relatório de gastos por centro de custo
- [x] Criar relatório de sugestões de compra
- [x] Implementar filtros por período
- [x] Adicionar exportação de dados (CSV)

## Fase 9: Dashboard
- [x] Criar gráfico de quantidade total em estoque
- [x] Criar indicador de produtos abaixo do mínimo
- [ ] Criar gráfico de gastos por centro de custo
- [x] Criar gráfico de entradas/saídas por período
- [x] Adicionar cards com KPIs
- [ ] Implementar atualização em tempo real

## Fase 10: Upload de Arquivos
- [ ] Implementar upload para produtos
- [ ] Implementar upload para ordens de compra
- [ ] Criar gerenciador de arquivos
- [ ] Adicionar validações de tipo e tamanho
- [ ] Implementar visualização de arquivos

## Fase 11: Testes e Refinamentos
- [x] Executar suite completa de testes (7 testes passando)
- [ ] Validar responsividade em dispositivos
- [ ] Testar fluxos críticos
- [ ] Ajustes de performance
- [ ] Documentação final


## BUGS REPORTADOS
- [ ] Erro inesperado ao acessar página de produtos - não carrega lista e não permite cadastro

- [x] Substituir centros de custo de teste pelos centros reais (Estoque, Limpeza, Manutenção, Uso e consumo, Jardinagem)

- [x] Adicionar botões de editar e excluir produtos na página de produtos

- [x] Adicionar botões de editar e excluir movimentações de estoque na página de estoque

- [x] BUG: Campo "Abaixo do Mínimo" no dashboard não está indicando corretamente a quantidade de produtos abaixo do estoque mínimo (Corrigido: alterada condição de eq(minStock, 0) para gt(minStock, 0))


## Fase 12: Renomeação e Páginas de Autenticação
- [x] Renomear o sistema para "Gestão Hectares" em todas as páginas
- [x] Criar página de login com branding do sistema
- [x] Criar página de cadastro de acesso
- [x] Atualizar rotas para redirecionar usuários não autenticados para login
- [x] Adicionar logout com redirecionamento para login


## Fase 13: Redesenho da Página de Ordens de Compra
- [x] Redesenhar página com seção "Dados Gerais" (Número OC, Fornecedor, Data Emissão, Centro de Custo, NF-e)
- [x] Implementar seção "Produtos" com tabela (Produto, Detalhes, Quantidade, Unidade, Valor Unitário, Desconto, Subtotal)
- [x] Adicionar cálculo automático de Subtotal (Qtd × Valor - Desconto)
- [x] Implementar opção de cadastro rápido de fornecedor
- [x] Adicionar botão "Adicionar Produto" com validações
- [x] Implementar campo de Unidade com opções (UND, CX, KL, PCT, etc)


## Fase 14: Adição de Seções de Transporte e Total na Ordem de Compra
- [x] Adicionar seção "Transporte" com campos Valor do Frete, Checkbox "Somar ao total" e Transportadora
- [x] Implementar seção "Total" com campos Produtos, Serviços, Impostos, Desconto (R$ e %), Valor Total
- [x] Integrar cálculos automáticos de frete, impostos e descontos
- [x] Validar e testar todos os cálculos


## Fase 15: Adição de Seção de Pagamento na Ordem de Compra
- [x] Adicionar seção "Pagamento" com opções À Vista e Parcelado
- [x] Implementar campos condicionais para À Vista (Vencimento, Valor, Forma de Pagamento)
- [x] Implementar campos condicionais para Parcelado (Forma de Pagamento, Intervalo, Qtd, Data 1ª, Botão Gerar)
- [x] Integrar cálculos de parcelas e geração automática de datas
- [x] Adicionar as 16 opções de forma de pagamento (Pix e Boleto para cada centro de custo)


## Fase 16: Correções na Página de Ordens de Compra
- [x] Adicionar campo de busca/pesquisa para produtos na seção de Produtos
- [x] Implementar exibição de tabela de parcelas geradas com colunas de Vencimento, Valor, Forma de Pagamento, Plano de Contas e Observação
- [x] Adicionar funcionalidade de editar e deletar parcelas


## Fase 17: Adição de Seção de Observações na Ordem de Compra
- [x] Adicionar seção "Observações" com dois campos de texto (Observações e Observações Internas)
- [x] Implementar botões "Cadastrar" (verde) e "Cancelar" (vermelho) com funcionalidades corretas
- [x] Integrar submit de ordem de compra com observações


## Fase 18: Otimização da Página de Ordens de Compra para Resolução 1366x768
- [x] Ajustar tamanhos de fontes para melhor legibilidade
- [x] Otimizar espaçamento entre campos e seções
- [x] Adaptar layout para caber simetricamente na resolução 1366x768
- [x] Testar responsividade e fazer ajustes finais


## Fase 19: Redesenho Completo do Formulário de Ordens de Compra
- [x] Implementar Stepper/Wizard com 5 etapas (Dados Gerais, Produtos, Transporte, Impostos, Pagamento)
- [x] Redesenhar seção Dados Gerais com layout 2x2 grid
- [x] Redesenhar seção Produtos com tabela limpa e compacta
- [x] Redesenhar seção Transporte com campos bem espaçados
- [x] Redesenhar seção Impostos e Descontos com layout claro
- [x] Redesenhar seção Pagamento com opções bem definidas
- [x] Adicionar ícones sutis por seção (FileText, Package, Truck, Percent, CreditCard)
- [x] Aplicar divisores visuais entre seções
- [x] Implementar tipografia hierárquica (títulos, subtítulos, campos)
- [x] Aplicar espaçamentos generosos (padding/margin)
- [x] Padronizar tamanhos de campos e alinhamentos
- [x] Testar responsividade em 1366x768
- [x] Validar que todos os campos foram mantidos


## Fase 20: Melhorias Visuais do Formulário de Ordens de Compra
- [x] Estender largura do diálogo até a margem direita (max-w-6xl ou similar)
- [x] Melhorar visibilidade dos campos circulados em amarelo (Produto e Qtd)
- [x] Corrigir corte de texto em verde (linha vermelha)
- [x] Aumentar padding e espaçamento para melhor legibilidade
- [x] Testar e validar o novo layout

## Fase 21: Reestruturação do Formulário de Ordens de Compra como Página Dedicada

- [x] Criar página NewPurchaseOrder.tsx com layout full-width
- [x] Implementar stepper horizontal no topo com 5 etapas
- [x] Redesenhar etapa Dados Gerais com espaçamento generoso
- [x] Redesenhar etapa Produtos com formulário espaçado (não tabela compacta)
- [x] Implementar lista de produtos adicionados com boa legibilidade
- [x] Redesenhar etapas Transporte, Impostos e Pagamento
- [x] Implementar navegação entre etapas com validações
- [x] Atualizar rotas e remover modal da página anterior
- [x] Testar responsividade e fazer ajustes finais
- [x] Validar que todos os campos e regras de negócio foram mantidos


## Fase 22: Correções na Página de Nova Ordem de Compra

- [x] Adicionar botão "Cadastrar Novo Fornecedor" na seção Dados Gerais
- [x] Implementar modal/dialog para cadastro rápido de fornecedor
- [x] Adicionar botão "Gerar Parcelas" na seção Pagamento (quando Parcelado selecionado)
- [x] Implementar lógica de geração de parcelas com tabela
- [x] Testar funcionalidades e fazer ajustes finais


## Fase 23: Implementação de Listagem de Ordens de Compra Cadastradas

- [x] Criar tRPC procedure para listar ordens de compra com dados do fornecedor
- [x] Implementar tabela na página PurchaseOrders.tsx
- [x] Adicionar colunas: Código, Fornecedor, Data, Situação, Valor, Cadastrado em
- [x] Implementar coluna Ações com botões (Visualizar, Editar, Excluir, Imprimir)
- [x] Adicionar filtros por situação e período
- [x] Adicionar busca por código ou fornecedor
- [x] Testar funcionalidades e fazer ajustes finais


## Fase 24: Implementação de Funcionalidades de Ações na Listagem de Ordens de Compra

- [x] Implementar botão Visualizar com modal mostrando detalhes da ordem
- [x] Implementar botão Editar com redirecionamento para página de edição
- [x] Implementar botão Excluir com diálogo de confirmação
- [x] Implementar botão Imprimir com geração de PDF
- [x] Criar tRPC procedures para obter, atualizar e deletar ordens
- [x] Testar todas as funcionalidades

## Fase 25: Melhoria do Layout de Impressão de Ordem de Compra

- [ ] Analisar modelo PDF fornecido e documentar requisitos
- [ ] Criar novo componente de impressão com layout profissional
- [ ] Adicionar logo e informações da empresa no cabeçalho
- [ ] Implementar tabela de produtos com colunas: ITEM, NOME, UND., QTD., VR. UNIT., SUBTOTAL
- [ ] Adicionar seção de dados do pagamento (Vencimento, Valor da Parcela, Forma de Pagamento, Observação)
- [ ] Adicionar resumo financeiro (Valor dos Produtos, Total da Compra)
- [ ] Adicionar seção de observações
- [ ] Integrar novo componente na página de Ordens de Compra
- [ ] Testar impressão com dados reais


## Fase 26: Melhorias no Cadastro de Fornecedor e Produtos

- [x] Adicionar campos de Telefone e Email ao modal de cadastro de fornecedor
- [x] Adicionar campo de CEP com busca automatica de endereco
- [x] Integrar API de CEP para preenchimento automatico de endereco
- [ ] Garantir que os campos de fornecedor aparecem na impressao
- [x] Transformar campo de produtos em busca/autocomplete
- [x] Implementar busca de produtos cadastrados no sistema
- [x] Permitir selecao de produtos da lista
- [ ] Corrigir problema de produtos nao serem salvos na ordem de compra
- [ ] Corrigir problema de valor total ficar em branco/zero
- [ ] Testar todas as funcionalidades

## Fase 27: Correção de Salvamento de Produtos na Ordem de Compra

- [x] Analisar fluxo de salvamento de produtos
- [x] Identificar onde os produtos estão sendo perdidos
- [x] Corrigir código para salvar produtos corretamente
- [x] Testar salvamento de produtos
- [x] Validar impressão com produtos salvos


## Fase 28: Correção de Erro de Inserção em Ordens de Compra

- [ ] Analisar erro de inserção na tabela purchase_orders
- [ ] Identificar campos obrigatórios faltando ou com valores inválidos
- [ ] Corrigir schema ou função de inserção
- [ ] Testar cadastro de nova ordem de compra


## Fase 29: Correção da Funcionalidade de Impressão de Ordens de Compra

- [x] Corrigir função getPurchaseOrders para retornar items com cada ordem
- [x] Remover campos inexistentes (unit, discount) da interface OrderItem
- [x] Atualizar componente PurchaseOrderPrint para usar apenas campos disponíveis
- [x] Criar testes unitários para verificar se items estão sendo retornados
- [x] Validar que os dados estão sendo salvos corretamente no banco de dados
- [x] Confirmar que a impressão agora exibe os produtos corretamente


## Fase 30: Integração da Logo da Associação Hectares no Cabeçalho da Ordem de Compra

- [x] Converter logo PDF para imagem PNG
- [x] Fazer upload da logo para S3 e obter URL pública
- [x] Atualizar componente PurchaseOrderPrint com a nova logo
- [x] Ajustar layout do cabeçalho conforme referência fornecida
- [x] Criar teste unitário para validar inclusão da logo
- [x] Confirmar que a logo aparece corretamente na impressão


## Fase 31: Substituição da Logo por Versão Melhorada

- [x] Fazer upload da nova logo (design de árvore dourada) para S3
- [x] Atualizar componente PurchaseOrderPrint com a nova URL da logo
- [x] Atualizar teste unitário com a nova URL
- [x] Validar que a nova logo aparece corretamente na impressão


## Fase 32: Substituição da Logo por Versão com Fundo Transparente

- [x] Fazer upload da nova logo com fundo transparente para S3
- [x] Atualizar componente PurchaseOrderPrint com a nova URL da logo
- [x] Atualizar teste unitário com a nova URL
- [x] Validar que a nova logo aparece corretamente na impressão


## Fase 33: Remoção do Rodapé com Informação do GestãoClick

- [x] Localizar o texto "Compra emitida no GestãoClick - www.gestaoclick.com.br" no componente
- [x] Remover a informação do rodapé da impressão
- [x] Testar que o rodapé foi removido corretamente


## Fase 34: Centralização do Título "PEDIDO DE COMPRA Nº"

- [x] Ajustar CSS da classe .order-title para usar position: relative
- [x] Adicionar flex: 1 e text-align: center à classe .order-number
- [x] Usar position: absolute e right: 12px para a classe .order-date
- [x] Atualizar HTML para usar classes no título
- [x] Testar que o layout está centralizado corretamente


## Fase 35: Correção da Exibição de Pagamento Parcelado na Impressão

- [x] Analisar código atual de pagamento no componente
- [x] Implementar função generateInstallments para gerar parcelas
- [x] Gerar datas de vencimento com incremento mensal para cada parcela
- [x] Calcular valor de cada parcela dividindo o total pelo número de parcelas
- [x] Atualizar HTML para exibir tabela com todas as parcelas
- [x] Testar geração de parcelas com teste unitário


## Fase 36: Adição do Campo de Frete na Impressão da Ordem de Compra

- [x] Adicionar campo freightValue à tabela purchaseOrders no schema
- [x] Executar pnpm db:push para migrar o novo campo
- [x] Adicionar campo freightValue à interface PurchaseOrderPrintProps
- [x] Atualizar seção de totais para exibir VALOR DO FRETE
- [x] Testar que o frete aparece corretamente na impressão


## Fase 37: Correção da Recuperação do Valor do Frete

- [x] Adicionar campo freightValue à função getPurchaseOrders
- [x] Adicionar campo freightValue à função createPurchaseOrder
- [x] Adicionar campo freightValue à função updatePurchaseOrder
- [x] Implementar conversão de freightValue para string nas funções
- [x] Testar que o frete é recuperado e exibido corretamente


## Fase 38: Correção Completa do Fluxo de Frete

- [x] Adicionar cálculo de frete no handleSubmit do formulário NewPurchaseOrder
- [x] Adicionar freightValue ao payload enviado para o backend
- [x] Adicionar campo freightValue ao schema de entrada do procedimento tRPC create
- [x] Passar freightValue para a função createPurchaseOrder
- [x] Executar testes para validar o fluxo completo


## Fase 39: Correção da Exibição de Parcelas na Impressão

- [x] Criar tabela purchaseOrderInstallments no banco de dados
- [x] Adicionar funções de gerenciamento de parcelas em db.ts
- [x] Corrigir handleSubmit para enviar paymentMethod e installments corretos
- [x] Adicionar campo installmentDetails ao schema tRPC
- [x] Implementar salvamento de parcelas no procedimento create
- [x] Executar testes para validar o fluxo completo


## Fase 40: Adição da Logo no Cabeçalho

- [x] Fazer upload da logo para S3
- [x] Adicionar logo ao lado do nome "Gestão Hectares" no DashboardLayout
- [x] Testar o layout do cabeçalho


## Fase 41: Ajuste do Layout da Logo

- [x] Aumentar tamanho da logo para h-12 w-12
- [x] Posicionar logo acima do nome "Gestão Hectares"
- [x] Centralizar logo e nome no cabeçalho
- [x] Testar o layout


## Bug: Erro de Validação de Quantidade na Página de Estoque

- [x] Corrigir validação de quantidade que rejeita valores < 1
- [x] Testar a correção na página de estoque


## Fase 42: Adição do Campo de Lote em Produtos

- [x] Adicionar campo lote na tabela products
- [x] Atualizar funções de banco de dados
- [x] Adicionar campo no formulário de cadastro
- [x] Adicionar coluna na listagem de produtos
- [x] Testar a funcionalidade completa


## Fase 43: Adição do Campo de Local de Alocação em Produtos

- [ ] Adicionar campo local de alocação na tabela products
- [ ] Atualizar funções de banco de dados
- [ ] Adicionar campo no formulário de cadastro
- [ ] Adicionar coluna na listagem de produtos
- [ ] Testar a funcionalidade completa


## Fase 43: Adição do Campo de Local de Alocação em Produtos

- [x] Adicionar campo localAlocacao na tabela products
- [x] Atualizar funções de banco de dados (createProduct, updateProduct)
- [x] Adicionar campo no formulário de cadastro de produtos
- [x] Adicionar coluna na listagem de produtos
- [x] Testar a funcionalidade completa


## Fase 44: Remoção do Campo de Lote do Cadastro de Produtos

- [ ] Remover campo lote da tabela products no banco de dados
- [ ] Atualizar funções de banco de dados (createProduct, updateProduct)
- [ ] Remover campo lote do formulário de cadastro de produtos
- [ ] Remover coluna lote da listagem de produtos
- [ ] Testar as alterações


## Fase 39: Remoção do Campo "Lote" do Cadastro de Produtos

- [x] Remover campo `lote` da tabela `products` no schema (drizzle/schema.ts)
- [x] Executar `pnpm db:push` para migrar a remoção do campo
- [x] Remover referências ao campo `lote` da função `createProduct` em server/db.ts
- [x] Remover referências ao campo `lote` da função `updateProduct` em server/db.ts
- [x] Remover campo `lote` do schema de entrada do procedimento `create` em server/routers.ts
- [x] Remover campo `lote` do schema de entrada do procedimento `update` em server/routers.ts
- [x] Remover campo `lote` do estado do formulário em client/src/pages/Products.tsx
- [x] Remover input de `lote` do formulário de criação e edição
- [x] Remover coluna "Lote" da tabela de listagem de produtos
- [x] Atualizar handleSubmit e handleEditSubmit para não enviar campo `lote`
- [x] Atualizar openEditDialog para não carregar o campo `lote`
- [x] Executar testes (pnpm test) - todos passaram com sucesso
- [x] Validar que o servidor de desenvolvimento continua funcionando
- [x] Manter o campo "Local de Alocação" (storage location) conforme solicitado

**Justificativa:** O campo "Lote" foi removido porque as informações de lote variam por compra, não sendo uma propriedade permanente do produto. A informação de lote será capturada no momento da compra, não no cadastro do produto.


## Fase 40: Adição de Campos de Lote e Preço na Movimentação de Estoque

- [x] Adicionar campos `lote` e `pricePerUnit` à tabela `stockMovements` no schema (drizzle/schema.ts)
- [x] Executar `pnpm db:push` para migrar os novos campos
- [x] Atualizar função `createStockMovement` em server/db.ts para aceitar lote e preço
- [x] Atualizar função `updateStockMovement` em server/db.ts para aceitar lote e preço
- [x] Adicionar campos `lote` e `pricePerUnit` ao schema de entrada do procedimento `create` em server/routers.ts
- [x] Adicionar campos `lote` e `pricePerUnit` ao procedimento `update` em server/routers.ts
- [x] Adicionar campos `lote` e `pricePerUnit` ao estado do formulário em client/src/pages/Stock.tsx
- [x] Adicionar inputs de `lote` e `pricePerUnit` no formulário de criação de movimentação
- [x] Adicionar inputs de `lote` e `pricePerUnit` no formulário de edição de movimentação
- [x] Atualizar handleSubmit para enviar campos `lote` e `pricePerUnit`
- [x] Atualizar handleEditSubmit para enviar campos `lote` e `pricePerUnit`
- [x] Atualizar openEditDialog para carregar os campos `lote` e `pricePerUnit`
- [x] Executar testes (pnpm test) - todos passaram com sucesso
- [x] Validar que o servidor de desenvolvimento continua funcionando

**Justificativa:** Os campos de lote e preço são importantes para rastrear a origem dos produtos e o custo de aquisição, facilitando a gestão de estoque e análise de custos.


## Fase 41: Remoção do Campo de Valor Unitário do Cadastro de Produtos

- [x] Remover campo `unitValue` da tabela `products` no schema (drizzle/schema.ts)
- [x] Executar `pnpm db:push` para migrar a remoção do campo
- [x] Atualizar função `createProduct` em server/db.ts para remover unitValue
- [x] Atualizar função `updateProduct` em server/db.ts para remover unitValue
- [x] Remover campo `unitValue` do schema de entrada do procedimento `create` em server/routers.ts
- [x] Remover campo `unitValue` do schema de entrada do procedimento `update` em server/routers.ts
- [x] Remover referências a unitValue nos procedimentos de relatórios (currentStock, suggestedPurchases)
- [x] Remover campo `unitValue` do estado do formulário em client/src/pages/Products.tsx
- [x] Remover input de `unitValue` do formulário de criação de produto
- [x] Remover input de `unitValue` do formulário de edição de produto
- [x] Remover coluna de Valor Unitário da tabela de produtos
- [x] Remover coluna de Total da tabela de produtos
- [x] Remover referências a unitValue em client/src/pages/Home.tsx
- [x] Remover referências a unitValue em client/src/pages/Reports.tsx
- [x] Executar testes (pnpm test) - todos passaram com sucesso
- [x] Validar que o servidor de desenvolvimento está funcionando

**Justificativa:** O preço unitário agora é capturado na movimentação de estoque, não no cadastro do produto. Isso permite rastrear variações de preço ao longo do tempo e associar cada entrada de estoque ao seu preço de aquisição específico.


## Fase 42: Sistema de Classificação de Produtos

- [x] Adicionar campo `classification` à tabela `products` no schema (drizzle/schema.ts)
- [x] Executar `pnpm db:push` para migrar o novo campo
- [x] Atualizar função `createProduct` em server/db.ts para aceitar classificação
- [x] Atualizar função `updateProduct` em server/db.ts para aceitar classificação
- [x] Adicionar campo `classification` ao schema de entrada do procedimento `create` em server/routers.ts
- [x] Adicionar campo `classification` ao schema de entrada do procedimento `update` em server/routers.ts
- [x] Adicionar campo `classification` ao estado do formulário em client/src/pages/Products.tsx
- [x] Adicionar seletor de classificação ao formulário de criação de produto
- [x] Adicionar seletor de classificação ao formulário de edição de produto
- [x] Adicionar coluna de classificação ao cabeçalho da tabela de produtos
- [x] Adicionar coluna de classificação aos dados da tabela com badges coloridas
- [x] Executar testes (pnpm test) - todos passaram com sucesso
- [x] Validar que o servidor de desenvolvimento está funcionando

**Categorias Implementadas:**
- **Estoque**: Produtos que fazem parte do estoque regular (badge azul)
- **Uso Específico**: Produtos para uso específico ou projetos (badge roxo)

**Benefícios:**
- Classificação clara dos produtos no sistema
- Facilita filtragem e organização de produtos
- Permite análise separada de estoque vs produtos de uso específico
- Interface visual com badges coloridas para fácil identificação


## Fase 43: Alertas de Estoque Mínimo por Classificação

- [x] Adicionar campos `minStockEstoque` e `minStockUsoEspecifico` ao schema de produtos
- [x] Executar `pnpm db:push` para migrar os novos campos
- [x] Atualizar função `createProduct` para aceitar limites por classificação
- [x] Atualizar função `updateProduct` para aceitar limites por classificação
- [x] Criar função de validação que retorna se o produto está abaixo do limite
- [x] Adicionar campos ao schema de entrada do procedimento `create` em server/routers.ts
- [x] Adicionar campos ao schema de entrada do procedimento `update` em server/routers.ts
- [x] Adicionar interface de configuração de limites no formulário de produtos
- [x] Implementar alertas visuais na tabela de produtos (cores de alerta)
- [x] Adicionar indicadores de alerta no dashboard (Home.tsx)
- [x] Criar função para contar produtos em alerta por classificação
- [x] Executar testes (pnpm test) - todos passaram com sucesso
- [x] Validar que o servidor está funcionando


## Fase 44: Submenu de Produtos com Subcategorias

- [x] Criar página ProductsEstoque.tsx com filtro automático para "estoque"
- [x] Criar página ProductsEspecificos.tsx com filtro automático para "uso_especifico"
- [x] Atualizar rotas no App.tsx para incluir as novas páginas
- [x] Adicionar submenu de navegação no DashboardLayout
- [x] Implementar links para as subcategorias no menu
- [x] Testar navegação entre as páginas
- [x] Executar testes (pnpm test) - todos passaram com sucesso
- [x] Validar que o servidor está funcionando


## Fase 45: Correção de Layout e Responsividade

- [x] Analisar estrutura de layout do DashboardLayout.tsx
- [x] Revisar CSS global em index.css para problemas de width/padding
- [x] Corrigir overflow horizontal nas páginas de produtos
- [x] Ajustar containers para garantir espaço adequado
- [x] Implementar responsividade para telas menores (mobile)
- [x] Revisar tabelas para não causar overflow
- [x] Testar em diferentes resoluções
- [x] Executar testes (pnpm test) - todos passaram com sucesso
- [x] Validar que o servidor está funcionando


## Bug: Erro de Componente Controlado/Não Controlado na Página de Nova Ordem de Compra

- [x] Investigar página /purchase-orders/new para encontrar input alternando entre controlado e não controlado
- [x] Corrigir estado inicial de inputs para evitar undefined -> defined transitions
- [x] Garantir que todos os inputs tenham valores iniciais definidos ('' ou 0)
- [x] Testar página de criação de ordem de compra - CORRIGIDO: unitValue coalesce com ?? ""


## Fase 46: Substituição de Coluna Classificação por Centro de Custo

- [x] Substituir coluna "Classificação" por "Centro de Custo" na tabela de produtos (Products.tsx)
- [x] Implementar lookup de Centro de Custo usando costCenterId
- [x] Executar testes (pnpm test) - todos passaram com sucesso
- [x] Validar que o servidor está funcionando


## Fase 47: Desenvolvimento da Funcionalidade de Solicitação de Compras

### Fase 47.1: Schema de Banco de Dados
- [x] Criar tabela `purchase_requests` com campos: id, number (auto), date, requester_id, sector, cost_center_id, priority, desired_date, observations, status, created_at, updated_at
- [x] Criar tabela `purchase_request_items` com campos: id, request_id, product_code, description, quantity, unit, desired_brand, suggested_supplier, estimated_value, item_observation
- [x] Criar tabela `purchase_request_history` com campos: id, request_id, old_status, new_status, changed_by, changed_at, observation
- [x] Criar tabela `purchase_request_attachments` com campos: id, request_id, file_url, file_name, uploaded_by, uploaded_at
- [x] Criar tabela `purchase_request_comments` com campos: id, request_id, user_id, message, created_at
- [x] Executar `pnpm db:push` para migrar as novas tabelas

### Fase 47.2: Backend API (tRPC Procedures)
- [x] Criar procedures para CRUD de solicitações
- [x] Implementar geração automática de número de solicitação
- [x] Criar procedures para gerenciar itens da solicitação
- [x] Implementar procedures de histórico e auditoria
- [x] Criar procedures de comentários
- [x] Implementar validações de regras de negócio

### Fase 47.3: Página de Listagem
- [x] Criar página PurchaseRequests.tsx
- [x] Implementar tabela com colunas: Número, Data, Solicitante, Setor, Qtd Itens, Valor Estimado, Prioridade, Status
- [x] Adicionar filtros: Status, Setor, Solicitante, Prioridade, Data Inicial, Data Final
- [x] Implementar busca por: Número, Produto, Descrição, Solicitante, Fornecedor, Centro de Custo, Setor
- [x] Adicionar botões de ação: Visualizar, Editar, Duplicar, Imprimir, Cancelar
- [x] Implementar paginação e ordenação

### Fase 47.4: Formulário de Cadastro
- [x] Criar página NewPurchaseRequest.tsx
- [x] Implementar seção "Dados da Solicitação" com campos automáticos e manuais
- [x] Criar seção "Itens da Solicitação" com adição/remoção dinâmica
- [x] Implementar cálculos automáticos: Quantidade total, Valor estimado total
- [x] Adicionar validações: Mínimo 1 item, quantidade > 0
- [x] Implementar botões Salvar e Cancelar

### Fase 47.5: Página de Detalhes
- [x] Criar página PurchaseRequestDetails.tsx
- [x] Exibir todos os dados da solicitação
- [x] Implementar abas: Itens, Histórico, Comentários, Anexos, Detalhes
- [x] Criar seção de comentários tipo chat
- [x] Adicionar aba de anexos com placeholder
- [x] Adicionar histórico de alterações com data, hora, usuário

### Fase 47.6: Página de Edição
- [x] Criar página EditPurchaseRequest.tsx
- [x] Carregar dados da solicitação existente
- [x] Permitir edição de campos
- [x] Gerenciar itens (adicionar/remover)
- [x] Validar dados antes de salvar
- [x] Redirecionar após salvar

### Fase 47.7: Dashboard
- [x] Adicionar cards com indicadores: Pendentes, Em Cotação, Urgentes, Compradas no Mês
- [x] Implementar gráficos de tendências
- [x] Adicionar filtros por período

### Fase 47.7: Notificações
- [x] Implementar notificações para: Nova solicitação, Status alterado, Aprovação, Compra concluída, Comentário
- [x] Integrar com sistema de notificações existente

### Fase 47.8: Testes e Validação
- [x] Escrever testes unitários (vitest)
- [x] Testar fluxos completos
- [x] Validar responsividade
- [x] Executar suite de testes

## Fase 48: Alterar Status de Solicitação de Compra
- [x] Atualizar schema do banco de dados com novos status
- [x] Adicionar botão de alterar status na listagem de solicitações
- [x] Implementar dialog para selecionar novo status (Em Negociação, Aguardando Entrega, Aguardando Aprovação, Finalizado, Aguardando Detalhes do Pedido)
- [x] Registrar histórico de alteração de status

## Fase 49: Módulo de Requisição de Saída

### Fase 49.1: Schema de Banco de Dados
- [x] Criar tabela `exit_requests` com campos: id, number (auto), date, supervisor_id, sector, collaborator_name, expected_date, observations, status, created_at, updated_at
- [x] Criar tabela `exit_request_items` com campos: id, request_id, product_id, quantity_requested, quantity_delivered, item_observation, status
- [x] Criar tabela `exit_request_history` com campos: id, request_id, action, performed_by, performed_at, observation
- [x] Executar `pnpm db:push` para migrar as novas tabelas

### Fase 49.2: Backend API (tRPC Procedures)
- [x] Criar funções de banco para CRUD de requisições de saída
- [x] Implementar geração automática de número (RS-000001)
- [x] Criar procedure de listagem com filtros
- [x] Criar procedure de criação com validação de estoque
- [x] Criar procedure de marcar item como "Retirado"
- [x] Implementar integração automática com movimentações de estoque
- [x] Criar procedure de exclusão

### Fase 49.3: Página de Listagem
- [x] Criar página ExitRequests.tsx
- [x] Implementar tabela com colunas: Número, Data, Supervisor, Setor, Colaborador, Qtd Itens, Status
- [x] Adicionar filtros: Status, Setor, Supervisor
- [x] Adicionar botões de ação: Visualizar, Excluir
- [x] Adicionar ao menu de navegação

### Fase 49.4: Formulário de Criação
- [x] Criar página NewExitRequest.tsx
- [x] Implementar select de produtos do estoque (com busca)
- [x] Validar quantidade disponível em estoque
- [x] Adicionar campos: Setor, Colaborador, Data Prevista, Observações
- [x] Implementar adição/remoção dinâmica de itens

### Fase 49.5: Página de Detalhes com Botão Retirado
- [x] Criar página ExitRequestDetails.tsx
- [x] Exibir todos os dados da requisição
- [x] Implementar botão "Retirado" por item
- [x] Ao marcar como retirado, criar movimentação de saída automaticamente
- [x] Atualizar estoque do produto automaticamente
- [x] Implementar retirada parcial (item por item)
- [x] Registrar histórico de quem liberou cada item

### Fase 49.6: Testes e Validação
- [ ] Escrever testes unitários (vitest)
- [ ] Testar fluxo completo: criar requisição → marcar retirado → verificar baixa no estoque
- [ ] Validar integração com movimentações

## Fase 50: Melhorias Completas na Página de Relatórios

### Fase 50.1: Filtros Avançados
- [x] Adicionar filtro por Setor
- [x] Adicionar filtro por Centro de Custo
- [x] Adicionar filtro por Produto específico
- [x] Adicionar filtro por Tipo de Movimentação (entrada/saída)
- [x] Adicionar filtro por Colaborador
- [x] Adicionar filtro por Classificação do Produto (estoque/uso específico)
- [x] Adicionar filtros rápidos de período (Hoje, Última Semana, Último Mês, Último Trimestre, Último Ano)

### Fase 50.2: Exportação CSV Melhorada
- [x] Headers traduzidos para português
- [x] Valores monetários formatados (R$ 1.234,56)
- [x] Datas no formato brasileiro (DD/MM/AAAA)
- [x] BOM UTF-8 para compatibilidade com Excel
- [x] Separador ponto-e-vírgula (padrão brasileiro)
- [x] Rodapé com data de geração e filtros aplicados

### Fase 50.3: Novos Relatórios
- [x] Relatório de Requisições de Saída por Setor
- [x] Relatório de Consumo por Produto (ranking dos mais consumidos)
- [x] Relatório de Histórico de Preços
- [x] Relatório de Produtos Sem Movimentação (capital imobilizado)
- [x] Relatório de Requisições de Saída por Colaborador
- [x] Relatório de Solicitações de Compra por Status

### Fase 50.4: Exportação por Email
- [x] Configurar serviço de notificação/email (via notifyOwner)
- [x] Implementar geração de relatório no servidor
- [x] Criar botão "Enviar" na interface de cada relatório
- [x] Enviar resumo do relatório via sistema de notificações

### Fase 50.5: Melhorias Visuais
- [x] Adicionar cards com resumo executivo no topo de cada relatório
- [x] Adicionar busca dentro do relatório (filtro em tempo real)
- [ ] Implementar paginação para relatórios grandes (futuro)
- [ ] Integração com Google Sheets (requer credenciais de serviço - futuro)

## Bug: Campo de Produtos na Nova Ordem de Compra
- [x] Atualizar busca de produtos para usar dados do banco de dados em tempo real
- [x] Permitir inserir produtos novos (digitação livre) além dos cadastrados

## Fase 52: Controle de Retirada e Devolução de Ferramentas
- [x] Revisar o cadastro patrimonial e identificar como distinguir ferramentas dos demais bens
- [x] Criar tabela de empréstimos de ferramentas com patrimônio, colaborador, datas, status e auditoria
- [x] Implementar backend para retirar, devolver, listar e consultar histórico de ferramentas
- [x] Impedir nova retirada de ferramenta que ainda esteja pendente de devolução
- [x] Atualizar automaticamente a situação operacional da ferramenta ao retirar e devolver
- [x] Criar página de controle com indicadores de disponíveis, retiradas e pendentes
- [x] Criar formulário de retirada com busca por número patrimonial ou descrição
- [x] Registrar colaborador responsável pela retirada
- [x] Criar ação de devolução com confirmação, data e observações
- [x] Adicionar filtros por status, colaborador, patrimônio e período
- [x] Integrar o controle de ferramentas ao menu do módulo Patrimônio
- [x] Exibir o histórico de retiradas e devoluções na ficha do patrimônio
- [x] Escrever testes Vitest das regras de retirada e devolução
- [x] Validar o fluxo completo e a interface responsiva
