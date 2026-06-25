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
  ROUND_OF_32: 'r32',
  LAST_32: 'r32',
  ROUND_OF_16: 'r16',
  LAST_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  THIRD_PLACE: 'third',
  FINAL: 'final'
};

async function readJson(name, fallback = null) {
  const p = path.join(DATA_DIR, name);
  try {
    const txt = await fs.readFile(p, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    if (fallback !== null) return fallback;
    throw err;
  }
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
  return schedule.findIndex((fx) =>
    (fx.a === home && fx.b === away) || (fx.a === away && fx.b === home)
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
  const fallbackGroups = await readJson('actual_groups.json', {});
  const fallbackKo = await readJson('actual_ko.json', {});

  if (!FOOTBALL_DATA_API_KEY) {
    console.log('FOOTBALL_DATA_API_KEY vazio -> mantenho resultados atuais.');
    return { actualGroups: fallbackGroups, actualKo: fallbackKo, matchesCount: 0, source: 'missing-key' };
  }

  const url = `https://api.football-data.org/v4/competitions/${encodeURIComponent(FOOTBALL_DATA_COMPETITION)}/matches`;
  const res = await fetch(url, { headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY } });
  if (!res.ok) {
    throw new Error(`football-data.org falhou: ${res.status} ${res.statusText}`);
  }

  const payload = await res.json();
  const matches = payload.matches || [];
  const schedules = buildGroupSchedule(groups);
  const actualGroups = {};
  const actualKo = {};
  const koBuckets = { r32: [], r16: [], qf: [], sf: [], third: [], final: [] };

  for (const m of matches) {
    const status = m.status;
    const isPlayed = ['FINISHED', 'AWARDED', 'AFTER_EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(status);
    if (!isPlayed) continue;

    const home = normalizeTeamName(m.homeTeam?.name || '');
    const away = normalizeTeamName(m.awayTeam?.name || '');
    const stage = m.stage || m.group || '';
    const score = getRegularScore(m);

    if (/GROUP/i.test(stage) || (m.group && /^GROUP_[A-L]$/i.test(m.group))) {
      const grp = ((m.group || stage).match(/[A-L]$/i) || [])[0];
      if (!grp || !schedules[grp]) continue;
      const idx = groupFixtureIndex(schedules[grp], home, away);
      if (idx === -1) {
        console.warn('Jogo de grupo não mapeado:', grp, home, away);
        continue;
      }
      const fx = schedules[grp][idx];
      actualGroups[`${grp}|${idx}`] = fx.a === home && fx.b === away
        ? { played: true, ga: score.home, gb: score.away }
        : { played: true, ga: score.away, gb: score.home };
      continue;
    }

    const roundKey = roundMap[stage];
    if (!roundKey) continue;
    koBuckets[roundKey].push({ utcDate: m.utcDate, a: home, b: away, ga: score.home, gb: score.away });
  }

  for (const [roundKey, arr] of Object.entries(koBuckets)) {
    arr.sort((x, y) => String(x.utcDate).localeCompare(String(y.utcDate)));
    arr.forEach((m, i) => {
      actualKo[`${roundKey}|${i}`] = { played: true, a: m.a, b: m.b, ga: m.ga, gb: m.gb };
    });
  }

  return { actualGroups, actualKo, matchesCount: matches.length, source: 'football-data.org' };
}

function decimalToFractionalString(decimalOdds) {
  const d = Number(decimalOdds);
  if (!Number.isFinite(d) || d <= 1) return null;
  return `${(d - 1).toFixed(2)}-1`;
}

async function fetchOddsUpdates(teams) {
  const fallbackOdds = await readJson('odds.json', {});

  if (!THE_ODDS_API_KEY) {
    console.log('THE_ODDS_API_KEY vazio -> mantenho odds atuais.');
    return { odds: fallbackOdds, oddsEvents: 0, source: 'missing-key' };
  }

  const url = `https://api.the-odds-api.com/v4/sports/${encodeURIComponent(ODDS_SPORT_KEY)}/odds?regions=${encodeURIComponent(ODDS_REGIONS)}&markets=${encodeURIComponent(ODDS_MARKETS)}&oddsFormat=decimal&apiKey=${encodeURIComponent(THE_ODDS_API_KEY)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`The Odds API falhou: ${res.status} ${res.statusText}`);
  }

  const events = await res.json();
  const teamAccumulator = Object.fromEntries(teams.map((t) => [t.team, []]));

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
          if (team === home || team === away) teamAccumulator[team]?.push(price);
        }
      }
    }
  }

  const odds = { ...fallbackOdds };
  for (const t of teams) {
    const samples = teamAccumulator[t.team] || [];
    if (!samples.length) continue;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    odds[t.team] = {
      ...(odds[t.team] || {}),
      independent: decimalToFractionalString(avg),
      oddschecker: decimalToFractionalString(avg)
    };
  }

  return { odds, oddsEvents: events.length, source: 'The Odds API' };
}

async function main() {
  const groups = await readJson('groups.json');
  const teams = await readJson('teams.json');

  let resultsInfo;
  let oddsInfo;

  try {
    resultsInfo = await fetchFootballDataResults(groups);
  } catch (err) {
    console.error('Erro nos resultados:', err.message);
    resultsInfo = {
      actualGroups: await readJson('actual_groups.json', {}),
      actualKo: await readJson('actual_ko.json', {}),
      matchesCount: 0,
      source: 'fallback-after-error',
      error: err.message
    };
  }

  try {
    oddsInfo = await fetchOddsUpdates(teams);
  } catch (err) {
    console.error('Erro nas odds:', err.message);
    oddsInfo = {
      odds: await readJson('odds.json', {}),
      oddsEvents: 0,
      source: 'fallback-after-error',
      error: err.message
    };
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    footballDataCompetition: FOOTBALL_DATA_COMPETITION,
    oddsSportKey: ODDS_SPORT_KEY,
    resultsSource: resultsInfo.source,
    oddsSource: oddsInfo.source,
    counts: {
      matchesReturnedByFootballData: resultsInfo.matchesCount,
      oddsEventsReturned: oddsInfo.oddsEvents,
      groupResultsWritten: Object.keys(resultsInfo.actualGroups).length,
      koResultsWritten: Object.keys(resultsInfo.actualKo).length,
      oddsTeamsWritten: Object.keys(oddsInfo.odds).length
    },
    errors: {
      results: resultsInfo.error || null,
      odds: oddsInfo.error || null
    }
  };

  await writeJson('actual_groups.json', resultsInfo.actualGroups);
  await writeJson('actual_ko.json', resultsInfo.actualKo);
  await writeJson('odds.json', oddsInfo.odds);
  await writeJson('meta.json', meta);

  console.log('Atualização concluída com sucesso.');
  console.log(JSON.stringify(meta, null, 2));
}

main().catch((err) => {
  console.error('Falha fatal:', err);
  process.exit(1);
});
