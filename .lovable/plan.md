# Reorganizar a navegação principal

## Objetivo
Manter todas as páginas, dados e cálculos existentes, alterando somente a organização visível do dashboard e os avisos ligados ao antigo cadastro de Materiais.

## Alterações
- Reorganizar o menu lateral em apenas três grupos:
  - **Visão Geral:** Dashboard.
  - **Planejamento:** Demanda, Necessidade de Materiais (MRP) e Capacidade.
  - **Dados:** Rendimentos, Rota e BOM.
- Retirar **Materiais** e **Qualidade** do menu principal, mantendo suas páginas e códigos acessíveis internamente para não eliminar funcionalidades.
- Renomear o item visível **MRP** para **Necessidade de Materiais**, mantendo a mesma página e os mesmos cálculos.
- Remover da Qualidade dos Dados somente as pendências visuais de custo e lead time ausentes originadas do cadastro de Materiais.
- Preservar o uso interno de `state.materials` na BOM, no MRP e em qualquer cálculo existente.

## Validação
- Confirmar que o menu exibe somente os três grupos solicitados e que todos os links visíveis abrem corretamente.
- Verificar Dashboard, Demanda, MRP, Capacidade, Rendimentos, Rota e BOM.
- Executar os testes existentes e confirmar que o build continua sem erros.
- Conferir que nenhum cálculo, tabela ou dado foi alterado ou excluído.
