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
const DEFAULT_SLOT_DATES = { groups: {}, knockout: { r32: {}, r16: {}, qf: {}, sf: {}, third: {}, final: {} } };
const DEFAULT_SLOT_MATCHUPS = { knockout: { r32: {}, r16: {}, qf: {}, sf: {}, third: {}, final: {} } };
const roundMap = { ROUND_OF_32:'r32', LAST_32:'r32', ROUND_OF_16:'r16', LAST_16:'r16', QUARTER_FINALS:'qf', SEMI_FINALS:'sf', THIRD_PLACE:'third', FINAL:'final' };

async function readJson(name, fallback = null) { const p = path.join(DATA_DIR, name); try { const txt = await fs.readFile(p, 'utf8'); return JSON.parse(txt); } catch (err) { if (fallback !== null) return fallback; throw err; } }
async function writeJson(name, value) { const p = path.join(DATA_DIR, name); await fs.writeFile(p, JSON.stringify(value, null, 2) + '\n', 'utf8'); }
function buildGroupSchedule(groups) { const schedules = {}; for (const [group, t] of Object.entries(groups)) { schedules[group] = [{ round:1,a:t[0],b:t[1] },{ round:1,a:t[2],b:t[3] },{ round:2,a:t[0],b:t[2] },{ round:2,a:t[1],b:t[3] },{ round:3,a:t[0],b:t[3] },{ round:3,a:t[1],b:t[2] }]; } return schedules; }
function groupFixtureIndex(schedule, home, away) { return schedule.findIndex((fx) => (fx.a === home && fx.b === away) || (fx.a === away && fx.b === home)); }
function getRegularScore(match) { const full = match?.score?.fullTime || {}; const reg = match?.score?.regularTime || {}; return { home: Number(reg.home ?? full.home ?? 0), away: Number(reg.away ?? full.away ?? 0) }; }

async function fetchFootballDataData(groups, knownTeamsSet) {
  const fallbackGroups = await readJson('actual_groups.json', {});
  const fallbackKo = await readJson('actual_ko.json', {});
  const fallbackSlots = await readJson('slot_dates.json', DEFAULT_SLOT_DATES);
  const fallbackMatchups = await readJson('slot_matchups.json', DEFAULT_SLOT_MATCHUPS);
  if (!FOOTBALL_DATA_API_KEY) return { actualGroups: fallbackGroups, actualKo: fallbackKo, slotDates: fallbackSlots, slotMatchups: fallbackMatchups, matchesCount: 0, source: 'missing-key' };
  const url = `https://api.football-data.org/v4/competitions/${encodeURIComponent(FOOTBALL_DATA_COMPETITION)}/matches`;
  const res = await fetch(url, { headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY } });
  if (!res.ok) throw new Error(`football-data.org falhou: ${res.status} ${res.statusText}`);
  const payload = await res.json(); const matches = payload.matches || []; const schedules = buildGroupSchedule(groups);
  const actualGroups = {}; const actualKo = {}; const slotDates = JSON.parse(JSON.stringify(DEFAULT_SLOT_DATES)); const slotMatchups = JSON.parse(JSON.stringify(DEFAULT_SLOT_MATCHUPS)); const koBuckets = { r32: [], r16: [], qf: [], sf: [], third: [], final: [] };
  const normKnown = (name) => { const n = normalizeTeamName(name || ''); return knownTeamsSet.has(n) ? n : ''; };
  for (const m of matches) {
    const home = normKnown(m.homeTeam?.name || ''); const away = normKnown(m.awayTeam?.name || ''); const stage = m.stage || m.group || ''; const utcDate = m.utcDate || null;
    if (/GROUP/i.test(stage) || (m.group && /^GROUP_[A-L]$/i.test(m.group))) {
      const grp = ((m.group || stage).match(/[A-L]$/i) || [])[0]; if (!grp || !schedules[grp]) continue; const idx = groupFixtureIndex(schedules[grp], home, away); if (idx === -1) continue; slotDates.groups[`${grp}|${idx}`] = utcDate;
      const played = ['FINISHED','AWARDED','AFTER_EXTRA_TIME','PENALTY_SHOOTOUT'].includes(m.status); if (!played) continue; const score = getRegularScore(m); const fx = schedules[grp][idx]; actualGroups[`${grp}|${idx}`] = fx.a === home && fx.b === away ? { played:true, ga:score.home, gb:score.away } : { played:true, ga:score.away, gb:score.home }; continue;
    }
    const roundKey = roundMap[stage]; if (!roundKey) continue; koBuckets[roundKey].push({ utcDate, a: home, b: away, score: getRegularScore(m), played: ['FINISHED','AWARDED','AFTER_EXTRA_TIME','PENALTY_SHOOTOUT'].includes(m.status) });
  }
  for (const [roundKey, arr] of Object.entries(koBuckets)) {
    arr.sort((a,b)=>String(a.utcDate||'').localeCompare(String(b.utcDate||'')));
    arr.forEach((m, i) => {
      slotDates.knockout[roundKey][String(i)] = m.utcDate;
      if (m.a && m.b) slotMatchups.knockout[roundKey][String(i)] = { a: m.a, b: m.b, utcDate: m.utcDate };
      if (m.played) actualKo[`${roundKey}|${i}`] = { played:true, a:m.a, b:m.b, ga:m.score.home, gb:m.score.away };
    });
  }
  return { actualGroups, actualKo, slotDates, slotMatchups, matchesCount: matches.length, source: 'football-data.org' };
}

function decimalToFractionalString(decimalOdds) { const d = Number(decimalOdds); if (!Number.isFinite(d) || d <= 1) return null; return `${(d - 1).toFixed(2)}-1`; }
async function fetchOddsUpdates(teams) {
  const fallbackOdds = await readJson('odds.json', {}); if (!THE_ODDS_API_KEY) return { odds: fallbackOdds, oddsEvents: 0, source: 'missing-key' };
  const url = `https://api.the-odds-api.com/v4/sports/${encodeURIComponent(ODDS_SPORT_KEY)}/odds?regions=${encodeURIComponent(ODDS_REGIONS)}&markets=${encodeURIComponent(ODDS_MARKETS)}&oddsFormat=decimal&apiKey=${encodeURIComponent(THE_ODDS_API_KEY)}`;
  const res = await fetch(url); if (!res.ok) throw new Error(`The Odds API falhou: ${res.status} ${res.statusText}`); const events = await res.json(); const teamAccumulator = Object.fromEntries(teams.map((t) => [t.team, []]));
  for (const event of events) { const home = normalizeTeamName(event.home_team || ''); const away = normalizeTeamName(event.away_team || ''); for (const bookmaker of event.bookmakers || []) { for (const market of bookmaker.markets || []) { if (market.key !== 'h2h') continue; for (const outcome of market.outcomes || []) { const team = normalizeTeamName(outcome.name || ''); const price = Number(outcome.price); if (!Number.isFinite(price) || price <= 1) continue; if (team === home || team === away) teamAccumulator[team]?.push(price); }}}}
  const odds = { ...fallbackOdds }; for (const t of teams) { const samples = teamAccumulator[t.team] || []; if (!samples.length) continue; const avg = samples.reduce((a,b)=>a+b,0)/samples.length; odds[t.team] = { ...(odds[t.team] || {}), independent: decimalToFractionalString(avg), oddschecker: decimalToFractionalString(avg) }; }
  return { odds, oddsEvents: events.length, source: 'The Odds API' };
}

async function main() {
  const groups = await readJson('groups.json'); const teams = await readJson('teams.json'); const knownTeamsSet = new Set(teams.map(t => t.team)); let bracketInfo; let oddsInfo;
  try { bracketInfo = await fetchFootballDataData(groups, knownTeamsSet); } catch (err) { console.error('Erro nos resultados/bracket:', err.message); bracketInfo = { actualGroups: await readJson('actual_groups.json', {}), actualKo: await readJson('actual_ko.json', {}), slotDates: await readJson('slot_dates.json', DEFAULT_SLOT_DATES), slotMatchups: await readJson('slot_matchups.json', DEFAULT_SLOT_MATCHUPS), matchesCount: 0, source: 'fallback-after-error', error: err.message }; }
  try { oddsInfo = await fetchOddsUpdates(teams); } catch (err) { console.error('Erro nas odds:', err.message); oddsInfo = { odds: await readJson('odds.json', {}), oddsEvents: 0, source: 'fallback-after-error', error: err.message }; }
  const meta = { generatedAt: new Date().toISOString(), version: 'v6.1', footballDataCompetition: FOOTBALL_DATA_COMPETITION, oddsSportKey: ODDS_SPORT_KEY, resultsSource: bracketInfo.source, oddsSource: oddsInfo.source, counts: { matchesReturnedByFootballData: bracketInfo.matchesCount, groupResultsWritten: Object.keys(bracketInfo.actualGroups).length, koResultsWritten: Object.keys(bracketInfo.actualKo).length, slotDatesGroupsWritten: Object.keys(bracketInfo.slotDates?.groups || {}).length, slotMatchupsR32Written: Object.keys(bracketInfo.slotMatchups?.knockout?.r32 || {}).length, oddsTeamsWritten: Object.keys(oddsInfo.odds).length }, errors: { results: bracketInfo.error || null, odds: oddsInfo.error || null } };
  await writeJson('actual_groups.json', bracketInfo.actualGroups); await writeJson('actual_ko.json', bracketInfo.actualKo); await writeJson('slot_dates.json', bracketInfo.slotDates); await writeJson('slot_matchups.json', bracketInfo.slotMatchups); await writeJson('odds.json', oddsInfo.odds); await writeJson('meta.json', meta);
  console.log('Atualização concluída com sucesso.'); console.log(JSON.stringify(meta, null, 2));
}
main().catch((err) => { console.error('Falha fatal:', err); process.exit(1); });
