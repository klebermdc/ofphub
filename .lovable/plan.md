

## Plano: Botão "Visualizar Relatório" na tabela de vendedores

### O que será feito
Adicionar um botão com ícone de olho (Eye) em cada linha da tabela de vendedores, antes do botão "Baixar PDF". Ao clicar, abre um Dialog mostrando o relatório do vendedor na tela (preview), com todos os pedidos, comissões e totais — sem precisar baixar o PDF.

### Mudanças

**`src/components/SalesRepTable.tsx`**
- Adicionar um novo estado para controlar o Dialog de preview do relatório (`previewDialog` com o `SalesRep` selecionado)
- Na coluna "Ação", dividir em dois botões: "Visualizar" (Eye) e "PDF" (FileDown)
- Criar um Dialog que mostra:
  - Nome do vendedor, total de vendas, comissão, salário, total a receber
  - Tabela com todos os pedidos (cliente, data, pedido, fornecedor, produto, venda, comissão)
  - Totalizadores no rodapé

### Estrutura do Dialog de Preview

```text
┌─────────────────────────────────────────┐
│  Relatório - [Nome Vendedor]            │
├─────────────────────────────────────────┤
│  Vendas: R$ X    Comissão: R$ X         │
│  Salário: R$ X   Total: R$ X           │
├─────────────────────────────────────────┤
│  Cliente | Data | Pedido | Forn | Prod  │
│  ─────── | ──── | ────── | ──── | ──── │
│  ...     | ...  | ...    | ...  | ...   │
├─────────────────────────────────────────┤
│                    [Baixar PDF]         │
└─────────────────────────────────────────┘
```

### Arquivo modificado
- `src/components/SalesRepTable.tsx` — único arquivo alterado

