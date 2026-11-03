# Layout do Frete na Impressão

Conforme o PDF de exemplo enviado, o frete deve aparecer na seção de totais:

```
VALOR DOS PRODUTOS: 4.465,00
VALOR DO FRETE: 92,00
TOTAL DA COMPRA: 4.557,00
```

O frete deve ser exibido entre o valor dos produtos e o total da compra.

**Estrutura esperada:**
- Linha 1: VALOR DOS PRODUTOS: {valor_produtos}
- Linha 2: VALOR DO FRETE: {valor_frete}
- Linha 3: TOTAL DA COMPRA: {valor_total}

Todos os valores devem estar formatados como moeda brasileira (R$ X.XXX,XX).
