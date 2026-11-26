// NEPA Plain Writer - checking engine.
// Spelling and grammar: Harper (offline, open source, Apache-2.0, runs inside this page; nothing is sent to a server).
// Concision and plain language: rules.js.
import { LocalLinter, Dialect } from '../harper/index.js';
import { binary } from '../harper/binary.js';
import { checkRulesText, underlineSet, applyFix, documentContext, docStats, KIND_INFO, careChecklist, buildCiteIndex, craftChecklist, ajaChecklist, AJA_TYPES, CITE_STYLES } from './core.js';
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
  return checkRulesText(text, extra, st, pw, issues);
}

export { underlineSet, applyFix, documentContext, docStats, KIND_INFO, careChecklist, buildCiteIndex, craftChecklist, ajaChecklist, AJA_TYPES, CITE_STYLES };
