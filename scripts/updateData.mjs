import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeTeamName } from './nameMap.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_COMPETITION = process.env.FOOTBALL_DATA_COMPETITION || 'WC';
const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY || '';
const ODDS_SPORT_KEY = process.env.ODDS_SPORT_KEY || 'soccer_fifa_world_cup';
const ODDS_REGIONS = process.env.ODDS_REGIONS || 'eu';
const ODDS_MARKETS = process.env.ODDS_MARKETS || 'h2h';

const roundMap = {
  'ROUND_OF_32': 'r32',
  'LAST_32': 'r32',
  'ROUND_OF_16': 'r16',
  'LAST_16': 'r16',
  'QUARTER_FINALS': 'qf',
  'SEMI_FINALS': 'sf',
  'THIRD_PLACE': 'third',
  'FINAL': 'final'
};

async function readJson(name) {
  const p = path.join(DATA_DIR, name);
  const txt = await fs.readFile(p, 'utf8');
  return JSON.parse(txt);
}

async function writeJson(name, value) {
  const p = path.join(DATA_DIR, name);
  await fs.writeFile(p, JSON.stringify(value, null, 2) + '
', 'utf8');
}

function buildGroupSchedule(groups) {
  const schedules = {};
  for (const [group, t] of Object.entries(groups)) {
    schedules[group] = [
      { round: 1, a: t[0], b: t[1] },
      { round: 1, a: t[2], b: t[3] },
      { round: 2, a: t[0], b: t[2] },
      { round: 2, a: t[1], b: t[3] },
      { round: 3, a: t[0], b: t[3] },
      { round: 3, a: t[1], b: t[2] }
    ];
  }
  return schedules;
}

function groupFixtureIndex(schedule, home, away) {
  return schedule.findIndex(
    (fx) =>
      (fx.a === home && fx.b === away) ||
      (fx.a === away && fx.b === home)
  );
}

function getRegularScore(match) {
  const full = match?.score?.fullTime || {};
  const reg = match?.score?.regularTime || {};
  const home = reg.home ?? full.home ?? 0;
  const away = reg.away ?? full.away ?? 0;
  return { home: Number(home), away: Number(away) };
}

async function fetchFootballDataResults(groups) {
  if (!FOOTBALL_DATA_API_KEY) {
    console.log('FOOTBALL_DATA_API_KEY vazio -> resultados remotos não atualizados.');
    return { actualGroups: await readJson('actual_groups.json'), actualKo: await readJson('actual_ko.json'), matchesCount: 0 };
  }

  const url = `https://api.football-data.org/v4/competitions/${encodeURIComponent(FOOTBALL_DATA_COMPETITION)}/matches`;
  const res = await fetch(url, {
    headers: {
      'X-Auth-Token': FOOTBALL_DATA_API_KEY
    }
  });

  if (!res.ok) {
    throw new Error(`football-data.org falhou: ${res.status} ${res.statusText}`);
  }

  const payload = await res.json();
  const matches = payload.matches || [];

  const schedules = buildGroupSchedule(groups);
  const actualGroups = {};
  const actualKo = {};
  const koBuckets = {
    r32: [],
    r16: [],
    qf: [],
    sf: [],
    third: [],
    final: []
  };

  for (const m of matches) {
    const status = m.status;
    const isPlayed = ['FINISHED', 'AWARDED', 'AFTER_EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(status);
    if (!isPlayed) continue;

    const home = normalizeTeamName(m.homeTeam?.name || '');
    const away = normalizeTeamName(m.awayTeam?.name || '');
    const stage = m.stage || m.group || '';
    const score = getRegularScore(m);

    if (/GROUP/i.test(stage) || /^GROUP_[A-L]$/i.test(stage) || (m.group && /^GROUP_[A-L]$/i.test(m.group))) {
      const grp = ((m.group || stage).match(/[A-L]$/i) || [])[0];
      if (!grp || !schedules[grp]) continue;
      const idx = groupFixtureIndex(schedules[grp], home, away);
      if (idx === -1) {
        console.warn('Jogo de grupo não mapeado:', grp, home, away);
        continue;
      }
      const fx = schedules[grp][idx];
      if (fx.a === home && fx.b === away) {
        actualGroups[`${grp}|${idx}`] = { played: true, ga: score.home, gb: score.away };
      } else {
        actualGroups[`${grp}|${idx}`] = { played: true, ga: score.away, gb: score.home };
      }
      continue;
    }

    const roundKey = roundMap[stage];
    if (!roundKey) continue;
    koBuckets[roundKey].push({
      utcDate: m.utcDate,
      a: home,
      b: away,
      ga: score.home,
      gb: score.away,
      played: true
    });
  }

  Object.entries(koBuckets).forEach(([roundKey, arr]) => {
    arr.sort((x, y) => String(x.utcDate).localeCompare(String(y.utcDate)));
    arr.forEach((m, i) => {
      actualKo[`${roundKey}|${i}`] = { played: true, a: m.a, b: m.b, ga: m.ga, gb: m.gb };
    });
  });

  return { actualGroups, actualKo, matchesCount: matches.length };
}

function decimalToFractionalString(decimalOdds) {
  const d = Number(decimalOdds);
  if (!Number.isFinite(d) || d <= 1) return null;
  const frac = d - 1;
  const rounded = Math.round(frac * 100) / 100;
  return `${rounded.toFixed(2)}-1`;
}

async function fetchOddsUpdates(teams) {
  const currentOdds = await readJson('odds.json');

  if (!THE_ODDS_API_KEY) {
    console.log('THE_ODDS_API_KEY vazio -> odds remotas não atualizadas.');
    return { odds: currentOdds, oddsEvents: 0 };
  }

  const url = `https://api.the-odds-api.com/v4/sports/${encodeURIComponent(ODDS_SPORT_KEY)}/odds?regions=${encodeURIComponent(ODDS_REGIONS)}&markets=${encodeURIComponent(ODDS_MARKETS)}&oddsFormat=decimal&apiKey=${encodeURIComponent(THE_ODDS_API_KEY)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`The Odds API falhou: ${res.status} ${res.statusText}`);
  }

  const events = await res.json();
  const teamAccumulator = {};
  for (const t of teams) {
    teamAccumulator[t.team] = [];
  }

  for (const event of events) {
    const home = normalizeTeamName(event.home_team || '');
    const away = normalizeTeamName(event.away_team || '');
    for (const bookmaker of event.bookmakers || []) {
      for (const market of bookmaker.markets || []) {
        if (market.key !== 'h2h') continue;
        for (const outcome of market.outcomes || []) {
          const team = normalizeTeamName(outcome.name || '');
          const price = Number(outcome.price);
          if (!Number.isFinite(price) || price <= 1) continue;
          if (team === home || team === away) {
            if (!teamAccumulator[team]) teamAccumulator[team] = [];
            teamAccumulator[team].push(price);
          }
        }
      }
    }
  }

  const odds = { ...currentOdds };
  for (const t of teams) {
    const samples = teamAccumulator[t.team] || [];
    if (samples.length) {
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      odds[t.team] = {
        ...(odds[t.team] || {}),
        independent: decimalToFractionalString(avg),
        oddschecker: decimalToFractionalString(avg)
      };
    }
  }

  return { odds, oddsEvents: events.length };
}

async function main() {
  const groups = await readJson('groups.json');
  const teams = await readJson('teams.json');

  const [{ actualGroups, actualKo, matchesCount }, { odds, oddsEvents }] = await Promise.all([
    fetchFootballDataResults(groups),
    fetchOddsUpdates(teams)
  ]);

  const meta = {
    generatedAt: new Date().toISOString(),
    sources: {
      results: FOOTBALL_DATA_API_KEY ? 'football-data.org' : 'manual / sem chave FOOTBALL_DATA_API_KEY',
      odds: THE_ODDS_API_KEY ? 'The Odds API' : 'manual / sem chave THE_ODDS_API_KEY'
    },
    footballDataCompetition: FOOTBALL_DATA_COMPETITION,
    oddsSportKey: ODDS_SPORT_KEY,
    counts: {
      matchesReturnedByFootballData: matchesCount,
      oddsEventsReturned: oddsEvents,
      groupResultsWritten: Object.keys(actualGroups).length,
      koResultsWritten: Object.keys(actualKo).length,
      oddsTeamsWritten: Object.keys(odds).length
    },
    importantNote: 'O script atualiza resultados reais automaticamente e faz um refresh leve de odds por equipa a partir do consenso mais recente de h2h. Se tiveres feed de outrights, podes enriquecer a função fetchOddsUpdates para puxar winner/group-winner.'
  };

  await writeJson('actual_groups.json', actualGroups);
  await writeJson('actual_ko.json', actualKo);
  await writeJson('odds.json', odds);
  await writeJson('meta.json', meta);

  console.log('Atualização concluída:', JSON.stringify(meta, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
