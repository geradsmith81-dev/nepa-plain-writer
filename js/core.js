// NEPA Plain Writer - core checks shared by the website, Word and the Google Docs add-on.
// Pure JavaScript: no browser, no network, no spelling engine. Everything except Harper spelling and grammar.
import { checkRules, docStats, KIND_INFO, splitSentences, parseSwaps, parseWordList } from './rules.js';
import { checkCare, careChecklist, CARE } from './care.js';
import { checkVoice } from './voice.js';
import { checkSciComm, AUDIENCES } from './scicomm.js';
import { checkGuides, craftChecklist } from './guides.js';
import { checkAja, buildAjaIndex, isAjaRef, ajaChecklist, AJA_TYPES } from './aja.js';
import { checkStyle, buildStyleIndex, isStyleRef, CITE_STYLES } from './cites.js';
import { checkSaa, buildCiteIndex, isReferenceEntry } from './saa.js';
import { DOC_TYPES } from './rules.js';

// Which flag wins where two overlap. Specific rules (CARE, SAA, your style) beat the general spell checker on the same words.
export const PRIORITY = {care: 0, cite: 1, aja: 1, voice: 2, craft: 3, spelling: 4, grammar: 5, personal: 6, nepa: 7, concise: 8, scicomm: 9, plain: 10};

// All rule-based checks for one paragraph. st = settings object; pw = Set of personal words (lower case).
export function checkRulesText(text, extra, st, pw, preIssues = []) {
  const issues = preIssues.slice();
  issues.push(...checkRules(text, {
    enabled: st.enabled, longLimit: st.longLimit, personalWords: pw, personalSwaps: st.swaps,
    docKnownAcronyms: extra.knownAcronyms
  }));
  // extra: {knownAcronyms, docText, seenSpecies, seenSentences, seenJargon, citeIndex} are shared across paragraphs of one document.
  const docText = extra.docText || text;
  const ctx = {audience: st.audience, docText, seenSpecies: extra.seenSpecies, seenSentences: extra.seenSentences, seenJargon: extra.seenJargon,
               citeIndex: extra.citeIndex || buildCiteIndex(docText)};
  ctx.ajaIndex = extra.ajaIndex || buildAjaIndex(docText);
  ctx.styleIndex = extra.styleIndex || buildStyleIndex(docText);
  ctx.isRef = isReferenceEntry(text, ctx.citeIndex) || isAjaRef(text, ctx.ajaIndex) || isStyleRef(text, ctx.styleIndex);
  if (st.enabled.care !== false && !ctx.isRef) issues.push(...checkCare(text, ctx));
  // Citation styles contradict each other, so only the chosen one runs.
  const style = st.citeStyle || 'saa';
  if (style === 'aja') issues.push(...checkAja(text, ctx));
  else if (style === 'saa') issues.push(...checkSaa(text, ctx));
  else if (style === 'chicago' || style === 'apa' || style === 'mla') issues.push(...checkStyle(text, ctx, style));
  if (st.enabled.voice !== false) issues.push(...checkVoice(text, ctx));
  if (st.enabled.scicomm !== false && !ctx.isRef) issues.push(...checkSciComm(text, ctx));
  if (st.enabled.craft !== false) issues.push(...checkGuides(text, ctx));
  const out = dedupe(issues);
  addEditRanges(text, out);
  return out;
}

// What the Fix edit box shows: the whole sentence for passive voice and "lead with the finding" flags, otherwise the flagged text.
const SENTENCE_RULES = /^(?:passive|there-is|craft:process|craft:actor|care:silence|nepa:quantify|quantify)$/;
export function addEditRanges(text, list) {
  const sents = splitSentences(text);
  for (const i of list) {
    let s = i.start, e = i.end;
    if (SENTENCE_RULES.test(i.rule)) { const sn = sents.find(x => x.start <= i.start && x.end >= i.end); if (sn) { s = sn.start; e = sn.end; } }
    i.editStart = s; i.editEnd = e; i.editText = text.slice(s, e);
  }
}

// Drop word-level issues that sit entirely inside a higher-priority or longer word-level issue (e.g. "assistance" inside "provide assistance").
export function dedupe(list) {
  const words = list.filter(i => i.scope === 'word').sort((a, b) => (b.end - b.start) - (a.end - a.start) || PRIORITY[a.kind] - PRIORITY[b.kind]);
  const kept = [];
  for (const i of words) {
    const clash = i.kind === 'care' ? null : kept.find(k => !k.wide && i.start >= k.start && i.end <= k.end && (PRIORITY[k.kind] <= PRIORITY[i.kind] || k.kind === i.kind || (k.kind !== 'spelling' && k.kind !== 'grammar' && i.kind !== 'spelling' && i.kind !== 'grammar')));
    if (!clash) kept.push(i);
  }
  const out = kept.concat(list.filter(i => i.scope !== 'word'));
  out.sort((a, b) => a.start - b.start || PRIORITY[a.kind] - PRIORITY[b.kind]);
  out.forEach((i, n) => i.id = n + 1);
  return out;
}

// Non-overlapping word-level issues for underlining (highest priority wins).
export function underlineSet(issues) {
  const w = issues.filter(i => i.scope === 'word').sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || a.start - b.start);
  const taken = []; const out = [];
  for (const i of w) {
    if (taken.some(([s, e]) => i.start < e && i.end > s)) continue;
    taken.push([i.start, i.end]); out.push(i);
  }
  return out.sort((a, b) => a.start - b.start);
}

export function applyFix(text, fix) { return text.slice(0, fix.start) + fix.text + text.slice(fix.end); }
// A fresh shared context for checking one document paragraph by paragraph.
export function documentContext(docText) {
  return {docText, knownAcronyms: new Set(), seenSpecies: new Set(), seenSentences: new Map(), seenJargon: new Set(), citeIndex: buildCiteIndex(docText), ajaIndex: buildAjaIndex(docText), styleIndex: buildStyleIndex(docText)};
}
export { docStats, KIND_INFO, careChecklist, CARE, buildCiteIndex, craftChecklist, ajaChecklist, AJA_TYPES, CITE_STYLES, AUDIENCES, DOC_TYPES, parseSwaps, parseWordList, splitSentences };
