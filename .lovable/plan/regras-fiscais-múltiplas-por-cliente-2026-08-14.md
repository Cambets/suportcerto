# Regras Fiscais Múltiplas por Cliente

Hoje `NfeData` guarda um único conjunto de campos fiscais (`csosn`, `cfop_estadual`, `aliquota_icms`, `cst_pis`, `aliquota_pis`, `cst_cofins`, `aliquota_cofins`, `usa_ipi`, `cst_ipi`, `aliquota_ipi`, ST etc). Vamos transformar isso em uma **lista de regras** que o contador pode adicionar, duplicar e remover.

## 1. Modelo de dados (`src/routes/p.$token.tsx`)

Nova tipagem:

```ts
type FiscalRule = {
  id: string;                 // uuid gerado no client
  nome: string;               // "Venda Interna", "Interestadual"...
  // ICMS
  csosn?: string;
  cst_icms_contrib?: string;
  cst_icms_nao_contrib?: string;
  origem_mercadoria?: string;
  mod_bc_icms?: string;
  valor_bc_icms?: string;
  aliquota_icms?: string;
  valor_icms?: string;
  cfop_estadual?: string;
  cfop_interestadual?: string;
  substituicao_tributaria?: boolean;
  valor_icms_st?: string;
  // IPI
  usa_ipi?: boolean;
  cst_ipi?: string;
  ipi_cenq?: string;
  aliquota_ipi?: string;
  // PIS/COFINS
  cst_pis?: string;
  vbc_pis?: string;
  aliquota_pis?: string;
  cst_cofins?: string;
  vbc_cofins?: string;
  aliquota_cofins?: string;
};

type NfeData = {
  // meta e cadastrais permanecem
  ultima_nfe?: string; serie_nfe?: string; regime?: Regime;
  nfce_cfop?: string; nfce_cst?: string;
  observacoes?: string; smart_file?: ...;
  // NOVO:
  nfe_rules?: FiscalRule[];
};
```

Retrocompatibilidade: no load (`hydrate`), se o registro antigo tiver os campos fiscais no root do `nfe`, **migrar** para `nfe_rules: [{ id, nome: "Regra Padrão", ...campos }]` e limpar as chaves antigas. Assim o admin/PDF só precisa entender o formato novo.

## 2. UI do formulário público (aba ICMS/IPI/PIS-COFINS)

Substituir os componentes `IcmsTab` e `IpiPisCofinsTab` por **um único componente** `RegrasFiscaisTab` (as três abas passam a apontar para o mesmo componente já que uma regra reúne ICMS+IPI+PIS+COFINS — evita 3 arrays desincronizados e reflete o modelo NF-e real).

Estrutura:

```
[ Accordion de regras ]
  ▸ Regra 1: Venda Interna         [Duplicar] [Remover]
      Nome da regra: [__________]
      ── ICMS ── (grid atual)
      ── IPI ──
      ── PIS/COFINS ──
  ▸ Regra 2: Venda Interestadual   [Duplicar] [Remover]

[+ Adicionar Regra Fiscal]
```

- `Duplicar`: clona a regra atual, gera novo `id`, sufixo `" (cópia)"` no nome.
- `Remover`: `AlertDialog` de confirmação; bloqueia remover a última regra (sempre >= 1).
- Uso dos combos/inputs existentes (`CSOSN_OPTIONS`, `CST_ICMS_OPTIONS`, `PercentField`, `Combobox` etc).
- Parser XML (`parseNfeXml` em `handleSmartFile`) passa a preencher a **primeira regra** (ou cria uma "Importada do XML" se vazio), não os campos do root.

Abas Cadastrais/Regime/Review permanecem como estão. As abas "ICMS", "IPI/PIS/COFINS" viram uma única aba **"Regras Fiscais"**.

## 3. Admin viewer (`src/routes/_authenticated/parametrizacao.tsx`)

No `FormDataViewer`, quando renderiza `modulos.nfe`:
- Renderizar os campos cadastrais/regime como hoje (FieldGrid).
- Depois, mapear `nfe_rules` e para cada regra renderizar um card com título `regra.nome` + 3 subgrupos (ICMS / IPI / PIS-COFINS) usando o `FieldGrid` já existente.
- Continua filtrando valores vazios (nada de "Não informado").

## 4. PDF/Comprovante (`ReviewSummary` no p.$token.tsx)

Idem: itera `nfe_rules` e imprime um bloco por regra com cabeçalho `Regra: <nome>`. Mantém "Dados Cadastrais" e "Regime" como blocos únicos no topo.

## 5. Parser XML

`parseNfeXml` mantém a saída atual (campos flat). O consumo em `handleSmartFile` muda para:
```ts
const rule: FiscalRule = { id: crypto.randomUUID(), nome: "Importado do XML", ...extract.nfe (só campos de regra) };
const rules = nfeData.nfe_rules?.length ? [...nfeData.nfe_rules, rule] : [rule];
updateNfe("nfe_rules", rules);
// meta (serie, ultima_nfe, regime) continua no root
```

## 6. Fora de escopo

- Migração server-side: apenas migração client-side no load. Não vamos rodar SQL — os registros antigos são reescritos quando o form é salvo de novo.
- MDF-e/NFS-e/CT-e: continuam com estrutura única (o pedido é específico para NF-e).
- NFC-e: continua no root (`nfce_cfop`, `nfce_cst`) por ser um único CFOP típico.

## Arquivos tocados

- `src/routes/p.$token.tsx` — tipo `FiscalRule`, migração no hydrate, novo `RegrasFiscaisTab`, novo `handleSmartFile`, novo `ReviewSummary`.
- `src/routes/_authenticated/parametrizacao.tsx` — render de `nfe_rules[]` no viewer.

Nenhuma mudança em banco, parser XML ou tipos gerados.
