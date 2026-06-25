# WC26 v6.1 — hotfix do bracket + revisão de bugs

## O que corrige esta versão
1. **Fix do bracket do Round of 32**
   - se um jogo já estiver confirmado no quadro oficial, o simulador passa a manter esse emparelhamento fixo;
   - exemplo: `South Africa vs Canada` no slot do dia 28/06.

2. **Revisão dos grupos**
   - o ranking da fase de grupos passa a usar uma lógica melhor de desempate com mini-tabela head-to-head dentro do grupo antes do fallback final.

3. **Continua com as melhorias da versão anterior**
   - visual melhorado
   - mobile friendly
   - ordenação por data no bracket

---

# INSTRUÇÕES PARA TOTOS

## PASSO 1 — backup
Guarda uma cópia do teu repositório atual.

## PASSO 2 — substituir estes ficheiros
Troca no teu repositório os seguintes ficheiros pelos deste ZIP:

```text
index.html
scripts/updateData.mjs
scripts/nameMap.mjs
.github/workflows/update-worldcup-data.yml
data/teams.json
data/groups.json
data/klement.json
data/actual_groups.json
data/actual_ko.json
data/odds.json
data/meta.json
data/slot_dates.json
data/slot_matchups.json
```

## PASSO 3 — estrutura certa
No final, a raiz do repositório deve ficar assim:

```text
.github/
  workflows/
    update-worldcup-data.yml
scripts/
  updateData.mjs
  nameMap.mjs
data/
  teams.json
  groups.json
  klement.json
  actual_groups.json
  actual_ko.json
  odds.json
  meta.json
  slot_dates.json
  slot_matchups.json
index.html
index.original-backup.html
README_INSTRUCOES_PARA_TOTOS.md
NOTAS_TECNICAS.md
```

## PASSO 4 — confirmar secrets e variables
### Secrets
```text
FOOTBALL_DATA_API_KEY
THE_ODDS_API_KEY
```
### Variables
```text
FOOTBALL_DATA_COMPETITION = WC
ODDS_SPORT_KEY = soccer_fifa_world_cup
ODDS_REGIONS = eu
ODDS_MARKETS = h2h
```

## PASSO 5 — correr o workflow
1. Actions
2. Update World Cup 2026 data
3. Run workflow
4. Esperar 1 a 2 minutos

## PASSO 6 — refresh do site
Depois do workflow acabar:
- Windows: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

---

# Como verificar que o bug ficou corrigido
1. Confirma que os grupos A e B estão fechados no simulador.
2. Clica várias vezes em `1 torneio`.
3. O jogo `South Africa vs Canada` deve aparecer sempre no mesmo slot do R32 enquanto estiver confirmado no quadro atual.

---

# Se correr mal
Se o workflow falhar, envia o log do step `Update JSON data`.
