// NEPA Plain Writer - checking engine.
// Spelling and grammar: Harper (offline, open source, Apache-2.0, runs inside this page; nothing is sent to a server).
// Concision and plain language: rules.js.
import { LocalLinter, Dialect } from '../harper/index.js';
import { binary } from '../harper/binary.js';
import { checkRules, docStats, KIND_INFO } from './rules.js';
import { checkCare, careChecklist } from './care.js';
import { checkVoice } from './voice.js';
import { checkSciComm } from './scicomm.js';
import { checkSaa, buildCiteIndex, isReferenceEntry } from './saa.js';
import { settings, personalWordSet, allPersonalWords, setSharedWords } from './store.js';

let linter = null, ready = null, importedKey = '';

export function initEngine(onStatus = () => {}) {
  if (ready) return ready;
  ready = (async () => {
    onStatus('Loading the spelling and grammar engine (first time only, about 20 MB)...');
    linter = new LocalLinter({binary, dialect: Dialect.American});
    await linter.setup();
    const cfg = await linter.getLintConfig();
    // Sentence length is handled by our own NEPA rule, so switch off Harper's version.
    for (const k of Object.keys(cfg)) if (/LongSentence/i.test(k)) cfg[k] = false;
    await linter.setLintConfig(cfg);
    await syncDictionary();
    onStatus('');
  })();
  return ready;
}

let builtinWords = null;
async function loadBuiltin() {
  if (builtinWords) return builtinWords;
  builtinWords = [];
  for (const f of ['data/nepa-vocabulary.txt', 'data/personal-dictionary.txt']) {
    try {
      const r = await fetch(new URL('../' + f, import.meta.url));
      if (!r.ok) continue;
      const list = (await r.text()).split(/\r?\n/).map(w => w.trim()).filter(w => w && !w.startsWith('#'));
      builtinWords.push(...list);
      if (f.includes('personal')) setSharedWords(list);
    } catch (e) { /* offline and not cached yet */ }
  }
  return builtinWords;
}
export async function syncDictionary() {
  const words = [...new Set([...(await loadBuiltin()), ...allPersonalWords()])];
  const key = words.length + ':' + words.slice(-5).join('|');
  if (key === importedKey) return;
  // Harper treats a word list as case-sensitive entries; add both the given form and a capitalized form.
  const forms = new Set();
  for (const w of words) for (const part of w.split(/\s+/)) {
    if (!/[A-Za-z]/.test(part)) continue;
    forms.add(part); forms.add(part.charAt(0).toUpperCase() + part.slice(1));
  }
  await linter.clearWords();
  if (forms.size) await linter.importWords([...forms]);
  importedKey = key;
}

// Harper reports character positions; JavaScript strings count UTF-16 units. Map between them when text has emoji etc.
function charToUnitMap(text) {
  if (!/[\uD800-\uDFFF]/.test(text)) return null;
  const map = []; let u = 0;
  for (const ch of text) { map.push(u); u += ch.length; }
  map.push(u); return map;
}

// Which flag wins where two overlap. Specific rules (CARE, SAA, your style) beat the general spell checker on the same words.
const PRIORITY = {care: 0, cite: 1, voice: 2, spelling: 3, grammar: 4, personal: 5, nepa: 6, concise: 7, scicomm: 8, plain: 9};

export async function checkText(text, extra = {}) {
  await initEngine();
  await syncDictionary();
  const st = settings();
  const pw = personalWordSet();
  const issues = [];
  if (st.enabled.spelling || st.enabled.grammar) {
    const lints = await linter.lint(text, {language: 'plaintext'});
    const map = charToUnitMap(text);
    for (const l of lints) {
      const sp = l.span(); let start = sp.start, end = sp.end; sp.free && sp.free();
      if (map) { start = map[start]; end = map[end]; }
      const kindRaw = l.lint_kind();
      const kind = (kindRaw === 'Spelling' || kindRaw === 'Typo') ? 'spelling' : 'grammar';
      const problem = text.slice(start, end);
      if (!st.enabled[kind]) { l.free(); continue; }
      if (kind === 'spelling' && (pw.has(problem.toLowerCase()) || pw.has(problem.replace(/['’]s$/, '').toLowerCase()))) { l.free(); continue; }
      const fixes = [];
      for (const s of l.suggestions().slice(0, 4)) {
        const k = s.kind(); const t = s.get_replacement_text();
        if (k === 1) fixes.push({label: 'Delete "' + problem + '"', start, end, text: ''});
        else if (k === 2) fixes.push({label: 'Add "' + t + '"', start, end, text: problem + t});
        else fixes.push({label: t, start, end, text: t});
        s.free && s.free();
      }
      issues.push({start, end, kind, rule: 'harper:' + kindRaw, scope: 'word', problem, fixes,
                   message: l.message(), source: kind === 'spelling' ? 'Spelling (Harper dictionary + your words)' : 'Grammar (Harper: ' + l.lint_kind_pretty() + ')'});
      l.free();
    }
  }
  const ruleIssues = checkRules(text, {
    enabled: st.enabled, longLimit: st.longLimit, personalWords: pw, personalSwaps: st.swaps,
    docKnownAcronyms: extra.knownAcronyms
  });
  issues.push(...ruleIssues);
  // extra: {knownAcronyms, docText, seenSpecies, seenSentences, seenJargon, citeIndex} are shared across paragraphs of one document.
  const docText = extra.docText || text;
  const ctx = {audience: st.audience, docText, seenSpecies: extra.seenSpecies, seenSentences: extra.seenSentences, seenJargon: extra.seenJargon,
               citeIndex: extra.citeIndex || buildCiteIndex(docText)};
  ctx.isRef = isReferenceEntry(text, ctx.citeIndex);
  if (st.enabled.care !== false && !ctx.isRef) issues.push(...checkCare(text, ctx));
  if (st.enabled.cite !== false) issues.push(...checkSaa(text, ctx));
  if (st.enabled.voice !== false) issues.push(...checkVoice(text, ctx));
  if (st.enabled.scicomm !== false && !ctx.isRef) issues.push(...checkSciComm(text, ctx));
  return dedupe(issues);
}

// Drop word-level issues that sit entirely inside a higher-priority or longer word-level issue (e.g. "assistance" inside "provide assistance").
function dedupe(list) {
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
export { docStats, KIND_INFO, careChecklist, buildCiteIndex };
// A fresh shared context for checking one document paragraph by paragraph.
export function documentContext(docText) {
  return {docText, knownAcronyms: new Set(), seenSpecies: new Set(), seenSentences: new Map(), seenJargon: new Set(), citeIndex: buildCiteIndex(docText)};
}
