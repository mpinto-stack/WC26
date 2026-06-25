# Mundial 2026 — kit de automação (versão fácil)

## O que está dentro deste ZIP
- `index.html` → tua app já preparada para ler JSON automáticos da pasta `data/`
- `index.original-backup.html` → cópia de segurança do teu HTML original
- `data/*.json` → dados iniciais
- `scripts/updateData.mjs` → script que vai buscar resultados reais + odds
- `scripts/nameMap.mjs` → normalização de nomes de seleções
- `.github/workflows/update-worldcup-data.yml` → GitHub Action que corre sozinha

---

## Objetivo
Depois de montares isto no GitHub:
1. o GitHub Actions atualiza os ficheiros `data/*.json` automaticamente;
2. o `index.html` lê esses ficheiros;
3. deixas de ter de meter os resultados à mão todos os dias.

---

## PASSO 0 — antes de começares
Precisas de:
- uma conta GitHub
- o teu repositório do simulador
- uma API key de `football-data.org`
- uma API key de `The Odds API`

Se não quiseres já tratar das odds, podes começar só com a key do `football-data.org`.

---

## PASSO 1 — fazer backup
No teu PC guarda uma cópia do teu ficheiro atual.

Neste ZIP já tens:
- `index.original-backup.html`

Se algo correr mal, é esse ficheiro que repões.

---

## PASSO 2 — meter os ficheiros no repositório
### Opção mais fácil (web do GitHub)
1. Abre o teu repositório no GitHub.
2. Clica em **Add file**.
3. Clica em **Upload files**.
4. Arrasta para lá tudo o que está dentro deste ZIP.
5. Faz commit.

### Estrutura final que deves ter
```text
.github/workflows/update-worldcup-data.yml
scripts/updateData.mjs
scripts/nameMap.mjs
data/teams.json
data/groups.json
data/klement.json
data/actual_groups.json
data/actual_ko.json
data/odds.json
data/meta.json
index.html
```

---

## PASSO 3 — ativar GitHub Pages (se ainda não estiver)
1. Vai ao repositório.
2. **Settings**.
3. **Pages**.
4. Em **Source**, escolhe a branch principal (normalmente `main`).
5. Guarda.

No fim vais ter um link para o teu site.

---

## PASSO 4 — criar as Secrets
Vai a:
**Settings → Secrets and variables → Actions**

Cria estes secrets:

### Secret 1
**Name**
```text
FOOTBALL_DATA_API_KEY
```
**Value**
```text
(a tua chave do football-data.org)
```

### Secret 2
**Name**
```text
THE_ODDS_API_KEY
```
**Value**
```text
(a tua chave do The Odds API)
```

Se ainda não tiveres a segunda, podes criar depois.

---

## PASSO 5 — criar as Variables (muito importante)
Vai a:
**Settings → Secrets and variables → Actions → Variables**

Cria estas variables:

### Variable 1
**Name**
```text
FOOTBALL_DATA_COMPETITION
```
**Value**
```text
WC
```

### Variable 2
**Name**
```text
ODDS_SPORT_KEY
```
**Value**
```text
soccer_fifa_world_cup
```

### Variable 3
**Name**
```text
ODDS_REGIONS
```
**Value**
```text
eu
```

### Variable 4
**Name**
```text
ODDS_MARKETS
```
**Value**
```text
h2h
```

---

## PASSO 6 — correr a automação pela primeira vez
1. Vai ao separador **Actions** do repositório.
2. Escolhe workflow **Update World Cup 2026 data**.
3. Clica em **Run workflow**.
4. Espera 1 a 2 minutos.

Se correr bem, o GitHub faz commit automático aos ficheiros dentro de `data/`.

---

## PASSO 7 — abrir o site
Depois do workflow acabar:
1. abre o teu site do GitHub Pages;
2. faz refresh forte (`Ctrl+F5` no Windows ou `Cmd+Shift+R` no Mac);
3. corre a simulação.

No painel da esquerda vais ver uma linha nova tipo:
```text
Modo auto: JSON remoto ativo · último update ...
```

---

## O que o sistema faz automaticamente
### Resultados reais
O script tenta ir buscar todos os jogos do campeonato e preencher:
- `data/actual_groups.json`
- `data/actual_ko.json`

### Odds
O script atualiza:
- `data/odds.json`

### Metadados
O script escreve:
- `data/meta.json`

Esse ficheiro diz quando foi o último update.

---

## Se alguma coisa falhar
### Problema 1 — workflow falha logo
Abre **Actions** e lê o erro.
Os erros mais comuns são:
- API key mal escrita
- competição errada
- limite da API

### Problema 2 — site não muda
Faz refresh forte.
Se continuar igual:
- apaga localStorage do site no browser
- ou abre numa janela anónima

### Problema 3 — nome de equipa não bate certo
Edita o ficheiro:
```text
scripts/nameMap.mjs
```
E adiciona o novo nome.

---

## Limitações desta primeira versão
Esta entrega já automatiza bastante, mas há 3 coisas que podes querer melhorar a seguir:
1. desempate oficial `head-to-head`
2. tabela oficial de emparelhamento dos melhores terceiros
3. odds de outrights (campeão / vencedor de grupo) se arranjares um feed melhor

---

## O que eu te recomendo fazer agora
### mínimo para ficar a funcionar hoje
1. fazer upload de tudo
2. meter a secret `FOOTBALL_DATA_API_KEY`
3. correr o workflow manualmente
4. abrir o site e testar

Se quiseres só automação de resultados, isso já chega para começares.

---

## Teste rápido de sucesso
Se tudo estiver bem:
- o workflow fica verde no GitHub;
- os ficheiros `data/*.json` mudam;
- o site mostra o timestamp remoto;
- os jogos reais aparecem preenchidos no simulador sem os meteres à mão.
