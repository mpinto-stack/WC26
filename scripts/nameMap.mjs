export const NAME_MAP = {
  "Türkiye": "Turkey",
  "Turkey": "Turkey",
  "Korea Republic": "South Korea",
  "South Korea": "South Korea",
  "Republic of Korea": "South Korea",
  "Congo DR": "DR Congo",
  "DR Congo": "DR Congo",
  "Côte d'Ivoire": "Ivory Coast",
  "Ivory Coast": "Ivory Coast",
  "Cabo Verde": "Cape Verde",
  "Cape Verde": "Cape Verde",
  "United States": "USA",
  "USA": "USA",
  "IR Iran": "Iran",
  "Iran": "Iran",
  "Bosnia & Herzegovina": "Bosnia and Herzegovina",
  "Korea Rep.": "South Korea",
  "Curacao": "Curacao",
  "Curaçao": "Curacao",
  "Czech Republic": "Czechia"
};

export function normalizeTeamName(name) {
  return NAME_MAP[name] || name;
}
