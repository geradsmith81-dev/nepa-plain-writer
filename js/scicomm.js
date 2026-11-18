// NEPA Plain Writer - science communication: write for the reader you have.
// Audience "public" (community members, decision makers, the general public) turns on jargon checks.
const SRC = 'Science communication: explain technical terms for non-specialist readers';
// [term regex, plain explanation(s)]
const JARGON = [
  ['lithics?', ['stone tools', 'stone artifacts']], ['debitage', ['stone flakes from toolmaking']], ['faunal remains', ['animal bones']],
  ['faunal', ['animal']], ['fauna', ['animals']], ['assemblages?', ['collection of artifacts']], ['anthropogenic', ['human-caused']],
  ['taphonom(?:y|ic)', ['what happened to the bones after burial']], ['stratigraph(?:y|ic)', ['soil layers']], ['strata', ['layers']],
  ['in situ', ['in place', 'where it was found']], ['provenience', ['exact find location']], ['microblades?', ['small stone blades']],
  ['bifaces?', ['two-sided stone tools']], ['paleosols?', ['buried ancient soil']], ['loess', ['wind-blown silt']], ['tephra', ['volcanic ash']],
  ['cal BP', ['years ago (calibrated radiocarbon age)']], ['14C', ['radiocarbon']], ['Holocene', ['the last 11,700 years (the Holocene)']],
  ['Pleistocene', ['the Ice Age (the Pleistocene)']], ['ecofacts?', ['natural remains such as seeds or bone']], ['subsurface testing', ['small test excavations']],
  ['data recovery', ['excavation before construction']], ['mitigation', ['steps to reduce harm']], ['avifauna', ['birds']], ['ichthyofauna', ['fish']],
  ['e\\.g\\.', ['for example']], ['i\\.e\\.', ['that is']], ['etc\\.', ['and others (or list them)']], ['viz\\.', ['namely']]
];
const HEDGES = [
  ['may potentially', 'may'], ['could potentially', 'could'], ['might potentially', 'might'], ['could possibly', 'could'], ['might possibly', 'might'],
  ['may possibly', 'may'], ['appears to suggest', 'suggests'], ['seems to suggest', 'suggests'], ['seems to indicate', 'indicates'],
  ['appears to indicate', 'indicates'], ['tends to suggest', 'suggests'], ['it is possible that .{1,40}? may', null]
];
export function checkSciComm(text, opts = {}) {
  const out = [];
  const add = (s, e, rule, msg, reps = []) => out.push({start: s, end: e, kind: 'scicomm', rule: 'sci:' + rule, scope: 'word', problem: text.slice(s, e), message: msg, source: SRC,
    fixes: reps.map(r => ({label: r, start: s, end: e, text: /^[A-Z]/.test(text.slice(s, e)) ? r.charAt(0).toUpperCase() + r.slice(1) : r}))});
  for (const [h, rep] of HEDGES) for (const m of text.matchAll(new RegExp('\\b' + h + '\\b', 'gi')))
    add(m.index, m.index + m[0].length, 'hedge', 'Stacked hedges weaken the point. One hedge is enough; then give the evidence.', rep ? [rep] : []);
  if (opts.audience === 'public') {
    const seen = opts.seenJargon || new Set();
    for (const [t, reps] of JARGON) {
      const re = new RegExp('(?<![\\w-])' + t + '(?![\\w-])', t === 'cal BP' || t === '14C' || t === 'Holocene' || t === 'Pleistocene' ? 'g' : 'gi');
      for (const m of text.matchAll(re)) {
        const k = t; const first = !seen.has(k); seen.add(k);
        const paren = text.slice(m.index + m[0].length).match(/^\s*\(([^()]*)\)/);
        const explained = (paren && !/\b(?:1[6-9]|20)\d\d\b/.test(paren[1])) || /\(\s*$/.test(text.slice(0, m.index));
        if (explained) continue;
        add(m.index, m.index + m[0].length, 'jargon', (first ? 'Technical term for this audience. Explain it at first use, or use plain words: "' : 'Technical term. Plainer: "') + reps.join('" or "') + '".', reps);
      }
    }
  }
  return out;
}
export const AUDIENCES = {
  technical: {label: 'Agency or technical reviewers', grade: 14},
  public: {label: 'Public, community and decision makers', grade: 10}
};
