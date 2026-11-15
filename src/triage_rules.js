/* Triage rules (from triage-line/src/triage) */
window.TriageRules=(function(){
// Phrases that ALWAYS force P1, no matter what the score says.
// English + Bahasa Malaysia. Add more here.
const OVERRIDES = [
  { re: /not breathing|stopped breathing|can'?t breathe|tak bernafas|tidak bernafas/i, label: 'Not breathing' },
  { re: /\btrapped\b|terperangkap|stuck under/i, label: 'Trapped' },
  { re: /heavy bleeding|bleeding (heavily|a lot|badly)|banyak darah|darah banyak/i, label: 'Heavy bleeding' },
  { re: /unconscious|unresponsive|(stopped|not|isn'?t|tak|tidak) (responding|respond|waking)|pengsan/i, label: 'Unresponsive' },
  { re: /chest (pain|is (starting to )?hurt|hurts|starting to hurt)|sakit dada|heart attack/i, label: 'Chest pain' },
  { re: /drowning|lemas/i, label: 'Drowning' },
];

function findOverride(text) {
  return OVERRIDES.find((o) => o.re.test(text || '')) || null;
}
// Rule-based extractor: pulls location, people, injuries, hazards and
// vulnerable people out of a transcript (English + Bahasa Malaysia).

const INJURIES = [
  { label: 'Not breathing', re: /not breathing|stopped breathing|can'?t breathe|tak bernafas|tidak bernafas/i, w: 100 },
  { label: 'Unresponsive', re: /unconscious|unresponsive|(stopped|not|isn'?t|tak|tidak) (responding|respond|waking)|pengsan/i, w: 90 },
  { label: 'Drowning', re: /drowning|lemas/i, w: 90 },
  { label: 'Heavy bleeding', re: /heavy bleeding|bleeding (heavily|a lot|badly)|banyak darah/i, w: 80 },
  { label: 'Chest pain', re: /chest (pain|is (starting to )?hurt|hurts|starting to hurt)|sakit dada|heart attack/i, w: 70 },
  { label: 'Difficulty breathing', re: /difficulty breathing|hard to breathe|sesak nafas|asthma attack/i, w: 70 },
  { label: 'Head injury', re: /head injury|hit (his|her|my) head|kepala (cedera|berdarah)/i, w: 50 },
  { label: 'Fracture', re: /broken (leg|arm|bone)|fracture|patah/i, w: 40 },
  { label: 'Burn', re: /\bburn(ed|t|s)?\b|melecur|terbakar/i, w: 35 },
  { label: 'Bleeding', re: /\bbleeding\b|berdarah/i, w: 30, skipIf: 'Heavy bleeding' },
  { label: 'Sprain', re: /sprain(ed)?|twisted (my|his|her) ankle|terseliuh/i, w: 15 },
  { label: 'Minor cut', re: /\b(small|minor) cut\b|luka kecil/i, w: 10 },
];

const HAZARDS = [
  { label: 'Trapped', re: /\btrapped\b|terperangkap|stuck (on|in|under)/i, w: 50 },
  { label: 'Fire', re: /\bfire\b|smoke|kebakaran|api/i, w: 50 },
  { label: 'Landslide', re: /landslide|landslip|tanah runtuh/i, w: 50 },
  { label: 'Building collapse', re: /collaps(e|ed)|runtuh/i, w: 50, skipIf: 'Landslide' },
  { label: 'Water rising', re: /water (is )?(rising|coming in|getting higher)|rising water|air (naik|makin tinggi)|paras dada/i, w: 40 },
  { label: 'Live wire', re: /live wire|electric(ity)? (in the water|wire)|wayar elektrik/i, w: 40 },
  { label: 'Flood', re: /flood|banjir/i, w: 15, skipIf: 'Water rising' },
  { label: 'No power', re: /no (power|electricity)|blackout|bekalan elektrik/i, w: 5 },
];

const VULNERABLE = [
  { label: 'Child', re: /\b(child|children|kid|kids|baby|toddler|daughter|son|anak|budak|bayi)\b/i, w: 15 },
  { label: 'Elderly', re: /elderly|grand(mother|father|ma|pa)|old (man|woman|lady)|warga emas|nenek|atuk|\b(7|8|9)\d (years old|tahun)|\b(he|she)('s| is) (7|8|9)\d\b/i, w: 15 },
  { label: 'Pregnant', re: /pregnant|mengandung/i, w: 15 },
  { label: 'Medical condition', re: /diabet|insulin|dialysis|heart (condition|problem)|asthma|medical condition|oxygen/i, w: 15 },
  { label: 'Mobility impaired', re: /wheelchair|bedridden|disabled|cannot walk|can'?t walk|mobility|oku/i, w: 15 },
];

const NEEDS = [
  { label: 'Needs water', re: /no (clean )?water|need(s)? water|air bersih|takde air/i },
  { label: 'Needs food', re: /no food|need(s)? food|makanan/i },
  { label: 'Information only', re: /where (can|do) (we|i)|which (relief|evacuation) cent|nak tanya|information/i },
];

const PLACE_WORDS = 'jalan|jln|taman|tmn|kampung|kg|lorong|persiaran|seksyen|section|blok|block|pangsapuri|apartment|flat|dewan|sekolah|masjid|surau|bandar|desa|bukit|relief cent(re|er)';
const LOC_RE = new RegExp(`((?:no\\.?\\s*\\d+[a-z]?,?\\s*)?(?:${PLACE_WORDS})\\b[^.!?\\n]{0,45}?)(?=[.!?\\n]|,\\s+(?!(?:${PLACE_WORDS}|\\d))|\\s+(?:and|we|i|my|there|water|please|tolong|dan|kami|saya)\\b|$)`, 'i');

const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, lapan: 8 };

function findPeople(text) {
  const m = text.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|satu|dua|tiga|empat|lima|enam|tujuh|lapan)\s+(of us|people|persons|orang|family members|adults)/i)
    || text.match(/family of (\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
  if (!m) return '';
  const n = m[1].toLowerCase();
  return String(NUM_WORDS[n] || n);
}

const matchAll = (list, text) => {
  const hits = list.filter((x) => x.re.test(text));
  return hits.filter((x) => !x.skipIf || !hits.some((h) => h.label === x.skipIf));
};

function extract(text = '') {
  const loc = text.match(LOC_RE);
  return {
    location: loc ? loc[1].trim().replace(/[,\s]+$/, '') : '',
    people: findPeople(text),
    injuries: matchAll(INJURIES, text).map((x) => x.label),
    hazards: matchAll(HAZARDS, text).map((x) => x.label),
    vulnerable: matchAll(VULNERABLE, text).map((x) => x.label),
    needs: NEEDS.filter((x) => x.re.test(text)).map((x) => x.label),
  };
}
// Weighted keyword scoring -> P1..P4 with a one-line reason.
// Safety rules: keyword override forces P1, unclear cases go one level UP.

const LEVELS = {
  P1: { name: 'Immediate', rank: 1 },
  P2: { name: 'Urgent', rank: 2 },
  P3: { name: 'Delayed', rank: 3 },
  P4: { name: 'Minor', rank: 4 },
};
const THRESHOLDS = [['P1', 80], ['P2', 45], ['P3', 10], ['P4', -Infinity]];
const ALL = [...INJURIES, ...HAZARDS, ...VULNERABLE];
const VULN_REASON = { Child: 'child present', Elderly: 'elderly person', Pregnant: 'pregnant person', 'Medical condition': 'medical condition', 'Mobility impaired': 'cannot walk' };

const higher = (a, b) => (LEVELS[a].rank <= LEVELS[b].rank ? a : b);
const bumpUp = (lvl) => ({ P1: 'P1', P2: 'P1', P3: 'P2', P4: 'P3' }[lvl]);

const toList = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => s.trim()).filter(Boolean);

/**
 * fields: { location, people, injuries, hazards, vulnerable } (arrays or comma strings)
 * text:   raw transcript (used for overrides + extra detection)
 */
function scoreCase(fields = {}, text = '') {
  const fromText = extract(text);
  const labels = new Set([...toList(fields.injuries), ...toList(fields.hazards), ...toList(fields.vulnerable), ...fromText.injuries, ...fromText.hazards, ...fromText.vulnerable]);
  const factors = ALL.filter((f) => labels.has(f.label)).sort((a, b) => b.w - a.w);
  let score = factors.reduce((s, f) => s + f.w, 0);
  const safe = /\b(i'?m|we'?re|we are|i am) (safe|okay|ok)\b|selamat/i.test(text);
  if (safe) score -= 5;

  let level = THRESHOLDS.find(([, t]) => score >= t)[0];
  const parts = factors.slice(0, 3).map((f, i) => {
    const t = VULN_REASON[f.label] || f.label.toLowerCase();
    return i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  });
  let reason = parts.join(', ');
  if (!reason) {
    const needs = fromText.needs;
    const n = needs.filter((x) => x !== 'Information only').join(', ');
    reason = needs.length ? `${n || 'Needs help'}, information only` : 'No injuries reported';
  } else if (safe) reason += ', safe location';

  // Over-triage: missing location, or score just under the next level -> one level up
  let bumped = false;
  const loc = fields.location ?? fromText.location;
  const next = THRESHOLDS.findIndex(([l]) => l === level) - 1;
  const nearNext = next >= 0 && score >= THRESHOLDS[next][1] - 5;
  if (level !== 'P1' && (!String(loc || '').trim() || nearNext)) {
    level = bumpUp(level);
    bumped = true;
    reason += !String(loc || '').trim() ? ' (ranked up: location unclear)' : ' (ranked up: borderline)';
  }

  // Keyword override always wins
  const forced = findOverride(text) || factors.map((f) => findOverride(f.label)).find(Boolean) || null;
  if (forced && level !== 'P1') {
    level = 'P1';
  }
  if (forced && !reason.toLowerCase().includes(forced.label.toLowerCase())) reason = `${forced.label}, ${reason}`;

  return { level, reason, score, factors: factors.map((f) => f.label), forced: forced?.label || null, bumped };
}

/** Re-score a caller's chat reply. Only ever RAISES the level, never lowers it. */
function rescoreReply(currentLevel, replyText) {
  const r = scoreCase({ location: 'known' }, replyText);
  const top = r.forced || r.factors[0];
  const PHRASE = { Unresponsive: 'person not responding', 'Not breathing': 'person not breathing', Trapped: 'trapped person', Child: 'child at risk' };
  if (top && LEVELS[r.level].rank < LEVELS[currentLevel].rank) {
    return { raised: true, level: r.level, reason: `New ${PHRASE[top] || top.toLowerCase()} reported` };
  }
  return { raised: false, level: currentLevel };
}
return {extract, scoreCase, LEVELS};})();
