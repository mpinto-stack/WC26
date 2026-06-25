# WC26 v2 — kit completo (visual melhorado + mobile + bracket por data)

## O que está dentro deste ZIP
- `index.html` → nova versão com visual melhorado, mobile-friendly e dados externos
- `index.original-backup.html` → backup do teu HTML original
- `data/*.json` → dados iniciais para resultados, odds e datas de jogos
- `scripts/updateData.mjs` → script robusto para atualizar resultados, odds e datas/slots
- `scripts/nameMap.mjs` → nomes de seleções normalizados sem erros de sintaxe
- `.github/workflows/update-worldcup-data.yml` → workflow GitHub Actions pronto

---

# O que muda nesta v2
## Visual
- cartões mais modernos
- sombras e contraste melhores
- tabs mais limpas e fáceis de usar
- melhor leitura dos blocos de probabilidades e grupos

## Mobile
- layout adaptado para telemóvel
- inputs maiores
- botões maiores
- barra fixa no fundo do ecrã com ações rápidas

## Bracket por data
- o bracket e o editor do mata-mata tentam respeitar sempre a ordem cronológica dos jogos
- quando houver data remota disponível, o site mostra essa data em cada jogo

## Automação
- continua a puxar resultados reais
- continua a atualizar odds
- agora também guarda `slot_dates.json` com as datas dos jogos para manter a ordem do bracket

---

# INSTRUÇÕES PARA TOTOS

## PASSO 1 — fazer backup
No teu PC guarda uma cópia do repositório atual.

## PASSO 2 — substituir os ficheiros
Substitui no teu repositório estes ficheiros e pastas pelos deste ZIP:

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
```

## PASSO 3 — estrutura certa do repo
A raiz do repositório deve ficar assim:

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
index.html
index.original-backup.html
README_INSTRUCOES_PARA_TOTOS.md
NOTAS_TECNICAS.md
```

**Não metas tudo dentro de outra pasta extra.**

## PASSO 4 — confirmar secrets
Vai a **Settings → Secrets and variables → Actions** e confirma estes secrets:

```text
FOOTBALL_DATA_API_KEY
THE_ODDS_API_KEY
```

## PASSO 5 — confirmar variables
Na aba **Variables**, confirma isto:

```text
FOOTBALL_DATA_COMPETITION = WC
ODDS_SPORT_KEY = soccer_fifa_world_cup
ODDS_REGIONS = eu
ODDS_MARKETS = h2h
```

## PASSO 6 — correr a automação
1. Vai a **Actions**
2. Escolhe **Update World Cup 2026 data**
3. Clica em **Run workflow**
4. Espera 1 a 2 minutos

## PASSO 7 — abrir o site e testar
1. Abre o teu GitHub Pages
2. Faz refresh forte (`Ctrl+F5` ou `Cmd+Shift+R`)
3. Testa no PC e no telemóvel

---

# Como veres que ficou bem
## No desktop
- visual mais moderno
- cards com melhor contraste
- navegação mais limpa

## No telemóvel
- layout vertical
- botões maiores
- barra fixa no fundo com Simular / Grupos / Mata-mata / Resumo

## No bracket
- jogos ordenados por data quando as datas remotas existem
- data visível nos jogos do KO

---

# Se alguma coisa correr mal
## Workflow falha
Abre **Actions** → step vermelho **Update JSON data** e manda-me o log final.

## Site não muda
Faz refresh forte ou abre em janela anónima.

## Nomes de equipas não batem certo
Edita `scripts/nameMap.mjs`.
