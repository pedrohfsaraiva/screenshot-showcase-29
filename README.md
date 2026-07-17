# Topaz MRP

Aplicação de Planejamento de Necessidades de Materiais (MRP) para manufatura da
válvula cardíaca Topaz, com horizonte de 36 meses. Fase 1 focada na fundação:
motor de cálculo puro com testes e UI base premium dark + azul corporativo.

## Arquitetura em camadas

- `src/domain` — tipos e regras de negócio (sem I/O).
- `src/engine` — cálculos puros (yield, explosão reversa, MRP líquida, bio-conversão).
- `src/data` — dados mestres iniciais (modelos, rota, BOM, yields, materiais, demanda).
- `src/state` — Context de cenário (persistência via localStorage versionado).
- `src/routes` — páginas TanStack Router.
- `src/components` — componentes de UI.

Nenhuma fórmula crítica fica dentro de componentes React.

## Fórmulas do motor (`src/engine`)

- **grossFromNet(net, y)** = `ceil(net / y)`, com `0 < y ≤ 1`.
- **Explosão reversa**: percorre a rota de trás para frente; para cada etapa,
  `entrada = ceil(saída / yield)`. Yield `null` é tratado como 1 e sinaliza
  provisório (DADO A CONFIRMAR).
- **Pericárdio bruto**:
  - modo `pericardios_por_unidade_boa`: `ceil(good * factor)`
  - modo `unidades_boas_por_pericardio`: `ceil(good / factor)`
- **MRP líquida** (mensal):
  ```
  disp[t]     = disp[t-1] + recProg[t] + recPlan[t] - bruta[t]
  net[t]      = max(0, safety - antesDoRecPlan[t])
  recPlan[t]  = applyLotSizing(net[t], moq, mult, fixo)
  liberacao[t - leadTime] += recPlan[t]
  ```

Todos os cálculos monetários usam **centavos inteiros** (BRL), formatados via
`Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.

## Testes

```
bun run vitest run
```

Cobrem: yield individual e RTY, MRP líquida (lead time, MOQ, múltiplo, estoque
suficiente, sem negativos), explosão reversa (yield null tratado como provisório,
etapas inativas ignoradas) e conversão bio.

## Persistência

Fase 1: localStorage com prefixo `topaz-mrp/v1/`. A interface `StorageAdapter`
está preparada para migração futura ao Lovable Cloud sem alterar o motor.

## Campos DADO A CONFIRMAR (fase 1)

Nenhum valor técnico crítico foi inventado. Ficam explicitamente provisórios até
serem aprovados com fonte, revisão e vigência:

- **Yields** de todos os 20 gates da rota.
- **Quantidades de BOM** de suturas, soluções e demais consumíveis.
- **Custos unitários** e **lead times** de todos os materiais.
- Fator de conversão de pericárdio.
- **Demanda** inicial em zero para os dois modelos e todos os 36 meses.

## Limitações da fase 1

- Módulos **Capacidade** e **Custos** estão em stub — o motor está preparado
  para receber horas padrão e custeio, mas as views detalhadas serão construídas
  na próxima iteração.
- Persistência apenas local (sem multiusuário).
- Sem autenticação ainda.
