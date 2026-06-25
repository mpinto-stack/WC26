# Notas técnicas rápidas

## O que foi alterado no index.html
- passou a tentar carregar JSON externos da pasta `data/`
- mantém fallback para os dados inline do ficheiro original
- resultados remotos passam a ser a base
- `localStorage` fica só para overrides locais do utilizador

## Ficheiros usados pelo frontend
- `data/teams.json`
- `data/groups.json`
- `data/klement.json`
- `data/actual_groups.json`
- `data/actual_ko.json`
- `data/odds.json`
- `data/meta.json`

## Observação importante
O script de update de KO mapeia os jogos por ordem cronológica dentro de cada ronda (`r32`, `r16`, `qf`, `sf`, `third`, `final`).
Funciona bem para automação prática, mas ainda vale a pena numa próxima fase alinhar o bracket com a tabela oficial dos terceiros.
