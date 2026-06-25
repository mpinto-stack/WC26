# NOTAS TÉCNICAS — WC26 v6.1

## Bugs corrigidos
- emparelhamentos KO já confirmados deixam de variar entre simulações
- suporte a `slot_matchups.json` para slots oficiais do bracket
- desempate de grupos com mini-tabela head-to-head antes do fallback global

## Ficheiros novos
- `data/slot_matchups.json` → jogos KO já conhecidos por slot

## Observação
Ainda não existe uma reimplementação completa da tabela oficial dos terceiros em todos os cenários; no entanto, quando o feed já conhece o jogo oficial do KO, o simulador fixa esse emparelhamento.
