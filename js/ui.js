// NEPA Plain Writer - shared interface pieces (used by the phone/desktop page and the Word task pane).
import { KIND_INFO, DOC_TYPES, parseWordList } from './rules.js';
import { CARE } from './care.js';
import { AUDIENCES } from './scicomm.js';
import { settings, saveSettings, addWords, removeWord, exportBackup, importBackup } from './store.js';

export const $ = (s, r = document) => r.querySelector(s);
export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
export function toast(msg) {
  const t = el('div', {class: 'toast'}, msg); document.body.append(t); setTimeout(() => t.remove(), 2600);
}

export function fillDocTypes(select) {
  select.innerHTML = '';
  for (const [k, v] of Object.entries(DOC_TYPES)) select.append(el('option', {value: k}, v.label));
  select.value = settings().docType;
  select.onchange = () => { saveSettings({docType: select.value}); select.dispatchEvent(new CustomEvent('changed', {bubbles: true})); };
}

export function fillAudience(select) {
  select.innerHTML = '';
  for (const [k, v] of Object.entries(AUDIENCES)) select.append(el('option', {value: k}, 'Readers: ' + v.label));
  select.value = settings().audience || 'technical';
  select.onchange = () => { saveSettings({audience: select.value}); select.dispatchEvent(new CustomEvent('changed', {bubbles: true})); };
}

// Style-guide switches: each guide can be included or left out. Settings are remembered on this device
// (in Google Docs, in your Google account).
export const STYLE_GUIDES = [
  {key: 'care', label: 'CARE', kinds: ['care'], desc: 'Indigenous data governance flags and the CARE panel'},
  {key: 'nepa', label: 'NEPA', kinds: ['nepa', 'concise'], desc: 'NEPA concision, NEPA style (acronyms, "significant", impact levels) and page limits'},
  {key: 'saa', label: 'SAA citations', kinds: ['cite'], desc: 'SAA in-text citations, References Cited and radiocarbon dates', excludes: 'aja'},
  {key: 'aja', label: 'AJA', kinds: ['aja'], desc: 'Alaska Journal of Anthropology Style Guide (2018): citations, references, numbers, measurements, dates, place names', excludes: 'saa'}
];
export function guideOn(key) { const g = STYLE_GUIDES.find(x => x.key === key); const v = settings().enabled[g.kinds[0]]; return key === 'aja' ? v === true : v !== false; }
export function applyGuideVisibility() {
  const dt = document.querySelector('#doctype'); if (dt) dt.classList.toggle('hidden', !guideOn('nepa'));
  const care = document.querySelector('#care'); if (care) care.classList.toggle('hidden', !guideOn('care'));
  const aja = document.querySelector('#aja'); if (aja && !guideOn('aja')) aja.classList.add('hidden');
}
export function fillGuides(box) {
  if (!box) return;
  box.innerHTML = '';
  box.append(el('span', {class: 'legend'}, 'Style guides:'));
  for (const g of STYLE_GUIDES) {
    const cb = el('input', {type: 'checkbox', 'aria-label': 'Include ' + g.label});
    cb.checked = guideOn(g.key);
    const lab = el('label', {class: 'guide-toggle' + (cb.checked ? ' on' : ''), 'data-guide': g.key, title: (cb.checked ? 'Included: ' : 'Left out: ') + g.desc}, cb, g.label);
    cb.onchange = () => {
      const patch = {}; for (const k of g.kinds) patch[k] = cb.checked;
      if (cb.checked && g.excludes) {           // SAA and AJA citation rules conflict: switching one on switches the other off
        const other = STYLE_GUIDES.find(x => x.key === g.excludes);
        if (guideOn(other.key)) {
          for (const k of other.kinds) patch[k] = false;
          const ol = [...box.querySelectorAll('label')].find(l => l.dataset.guide === other.key);
          if (ol) { ol.querySelector('input').checked = false; ol.classList.remove('on'); }
          toast(other.label + ' switched off: SAA and AJA citation rules differ, so one is used at a time.');
        }
      }
      saveSettings({enabled: patch});
      lab.classList.toggle('on', cb.checked); lab.title = (cb.checked ? 'Included: ' : 'Left out: ') + g.desc;
      applyGuideVisibility();
      box.dispatchEvent(new CustomEvent('changed', {bubbles: true}));
    };
    box.append(lab);
  }
  applyGuideVisibility();
}

// The CARE panel sits at the top of every summary (hidden when the CARE guide is switched off).
export function renderCare(box, checklist, issues) {
  if (!guideOn('care')) { box.innerHTML = ''; box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const counts = {C: 0, A: 0, R: 0, E: 0};
  for (const i of issues) if (i.kind === 'care' && i.care) counts[i.care]++;
  const rows = Object.entries(CARE).map(([k, p]) => {
    const st = checklist.principles[k]; const n = counts[k];
    const ok = st.found && !n;
    return el('div', {class: 'care-row' + (ok ? ' ok' : '')},
      el('span', {class: 'care-letter'}, k),
      el('div', {}, el('b', {}, p.name), ' ',
        el('span', {class: 'care-state'}, (st.found ? 'addressed ("' + st.cue + '")' : 'not yet addressed') + (n ? ' · ' + n + ' flag' + (n > 1 ? 's' : '') + ' in the text' : '')),
        (!st.found || n) ? el('div', {class: 'care-ask'}, p.ask) : null));
  });
  box.innerHTML = '';
  box.append(el('div', {class: 'care-head'}, el('b', {}, 'CARE: Indigenous data governance'),
      el('span', {class: 'legend'}, checklist.applies ? ' This text concerns Indigenous people, places or heritage.' : ' No Indigenous community is named yet; the checks still run.')),
    ...rows,
    el('div', {class: 'legend', style: 'margin-top:6px'}, 'CARE Principles (GIDA 2019; Carroll et al. 2020). These are prompts for your judgment and for consultation with the community, not rulings.'));
}

// AJA checklist panel (shown when the AJA guide is switched on).
export function renderAja(box, items, types, onType) {
  if (!box) return;
  if (!guideOn('aja')) { box.innerHTML = ''; box.classList.add('hidden'); return; }
  box.classList.remove('hidden'); box.innerHTML = '';
  const sel = el('select', {'aria-label': 'AJA submission type'});
  for (const [k, v] of Object.entries(types)) sel.append(el('option', {value: k}, v.label));
  sel.value = settings().ajaType || 'article';
  sel.onchange = () => { saveSettings({ajaType: sel.value}); onType && onType(); };
  box.append(el('div', {class: 'care-head'}, el('b', {}, 'AJA submission checklist '), sel));
  for (const it of items) box.append(el('div', {class: 'craft-row' + (it.ok ? ' ok' : it.optional ? ' opt' : '')},
    el('span', {class: 'craft-mark aja-mark'}, it.ok ? '✓' : it.optional ? '–' : '!'), el('span', {}, it.label)));
  box.append(el('div', {class: 'legend', style: 'margin-top:6px'}, 'Alaska Journal of Anthropology Style Guide (2018). Also: 12-point Times New Roman, double spaced, page numbers bottom centre, no footnotes, figures in a separate file, references single spaced on a new page.'));
}

// Structure checklist from the BU Writing Guide in Archaeology, plus the writing-habit reminder.
export function renderCraft(box, items) {
  box.innerHTML = '';
  box.append(el('div', {class: 'care-head'}, el('b', {}, 'Structure (archaeology writing guides)')));
  for (const it of items) box.append(el('div', {class: 'craft-row' + (it.ok ? ' ok' : it.optional ? ' opt' : '')},
    el('span', {class: 'craft-mark'}, it.ok ? '✓' : it.optional ? '–' : '!'), el('span', {}, it.label)));
  box.append(el('div', {class: 'legend', style: 'margin-top:6px'},
    'Paragraphs: 2 to 7 sentences, hamburger style (topic sentence, support, closing sentence). Write a little every day; habit makes the article (Alexandria Archive Institute, 30 Days to an Article).'));
}

const KIND_ORDER = ['care', 'spelling', 'grammar', 'concise', 'plain', 'scicomm', 'cite', 'aja', 'voice', 'craft', 'nepa', 'personal'];
export function renderSummary(box, stats, issues, onToggle) {
  const st = settings();
  const counts = {}; for (const i of issues) counts[i.kind] = (counts[i.kind] || 0) + 1;
  const chips = el('div', {class: 'chips'});
  const offKinds = new Set(STYLE_GUIDES.filter(g => !guideOn(g.key)).flatMap(g => g.kinds));
  for (const k of KIND_ORDER) {
    if (k === 'personal' && !st.swaps.length) continue;
    if (offKinds.has(k)) continue;   // that style guide is switched off
    const on = st.enabled[k] !== false;
    chips.append(el('span', {class: 'chip' + (on ? '' : ' off'), title: on ? 'Click to hide' : 'Click to show',
      onclick: () => { saveSettings({enabled: {[k]: !on}}); onToggle && onToggle(); }},
      el('span', {class: 'dot', style: 'background:' + KIND_INFO[k].color}), KIND_INFO[k].label + ' ' + (counts[k] || 0)));
  }
  if (!guideOn('nepa')) stats = Object.assign({}, stats, {pageLimit: 0, overLimit: false});   // no NEPA page limit when NEPA is off
  const pct = stats.pageLimit ? Math.min(100, 100 * stats.pages / stats.pageLimit) : 0;
  const pageStat = stats.pageLimit
    ? el('div', {class: 'stat'}, el('b', {}, stats.pages.toFixed(1) + ' / ' + stats.pageLimit), el('span', {}, 'est. pages vs NEPA limit (' + stats.wordsPerPage + ' words/page)'),
         el('div', {class: 'meter' + (stats.overLimit ? ' over' : '')}, el('i', {style: 'width:' + pct + '%'})))
    : el('div', {class: 'stat'}, el('b', {}, stats.pages.toFixed(1)), el('span', {}, 'est. pages (' + stats.wordsPerPage + ' words/page)'));
  box.innerHTML = '';
  box.append(chips, el('div', {class: 'stats'},
    el('div', {class: 'stat'}, el('b', {}, stats.words.toLocaleString()), el('span', {}, 'words')),
    pageStat,
    el('div', {class: 'stat'}, el('b', {}, stats.avgSentence.toFixed(1)), el('span', {}, 'words per sentence (aim 15-20)')),
    el('div', {class: 'stat' + (stats.grade > (AUDIENCES[st.audience] || AUDIENCES.technical).grade ? ' warn' : '')}, el('b', {}, stats.grade.toFixed(1)),
      el('span', {}, 'reading grade; aim ' + (AUDIENCES[st.audience] || AUDIENCES.technical).grade + ' or lower for these readers'))
  ));
  if (stats.overLimit) box.append(el('p', {class: 'msg', style: 'color:var(--spelling);margin:8px 0 0'},
    'Over the NEPA page limit. The statute counts the text only, not citations or appendices. Check the main text alone (select it, then check the selection) before you cut.'));
}

// One issue card. handlers: {onFix(issue, fix), onGo(issue), onIgnore(issue), onAddWord(issue)}
// Every card has a Fix button: it applies the suggested fix, or opens an edit box when there is no automatic fix.
export function issueCard(issue, h) {
  const info = KIND_INFO[issue.kind];
  const f0 = issue.fixes[0];
  const stop = fn => e => { e.stopPropagation(); fn(e); };
  // Edit box: the whole sentence for passive voice and similar flags, otherwise the flagged words.
  const ta = el('textarea', {class: 'edit-text', rows: 3, 'aria-label': 'Edit the text'});
  const editor = el('div', {class: 'editor hidden', onclick: e => e.stopPropagation()},
    el('div', {class: 'legend'}, 'Edit the text, then press Apply. The change goes straight into your document.'),
    ta,
    el('div', {class: 'row'},
      el('button', {class: 'primary', onclick: stop(() => {
        if (ta.value === issue.editText) { toast('No change made'); return; }
        h.onFix(issue, {label: 'Edit', start: issue.editStart, end: issue.editEnd, text: ta.value});
      })}, 'Apply'),
      el('button', {onclick: stop(() => editor.classList.add('hidden'))}, 'Cancel')));
  const openEditor = () => { ta.value = issue.editText ?? issue.problem; editor.classList.remove('hidden'); ta.focus(); };
  const shown = f => f.text === '' ? f.label : (f.label.startsWith('Rewrite: ') ? f.text : f.label);
  const suggestion = f0 ? el('div', {class: 'suggest'},
      el('span', {class: 'legend'}, issue.fixes.length > 1 ? 'Suggested fix (1 of ' + Math.min(3, issue.fixes.length) + '): ' : 'Suggested fix: '),
      el('b', {}, shown(f0))) : null;
  const others = issue.fixes.slice(1, 3).map(f => el('button', {class: 'alt', title: 'Use this fix instead', onclick: stop(() => h.onFix(issue, f))}, 'Or: ' + shown(f)));
  const acts = el('div', {class: 'acts'},
    el('button', {class: 'fix fix-main', title: f0 ? 'Apply the suggested fix' : 'Open an edit box to fix this yourself', onclick: stop(() => f0 ? h.onFix(issue, f0) : openEditor())}, 'Fix'),
    ...others,
    f0 ? el('button', {title: 'Write your own fix', onclick: stop(openEditor)}, 'Edit') : null,
    h.onGo ? el('button', {onclick: stop(() => h.onGo(issue))}, 'Show') : null,
    issue.kind === 'spelling' && h.onAddWord ? el('button', {onclick: stop(() => h.onAddWord(issue))}, 'Add to my words') : null,
    el('button', {onclick: stop(() => h.onIgnore(issue))}, 'Ignore'));
  return el('div', {class: 'issue k-' + issue.kind, 'data-id': issue.id, onclick: () => h.onGo && h.onGo(issue)},
    el('div', {class: 'kind'}, info.label),
    el('div', {class: 'prob' + (issue.scope !== 'word' ? ' longtext' : '')}, issue.problem),
    el('div', {class: 'msg'}, issue.message),
    suggestion,
    el('div', {class: 'src'}, 'Basis: ' + issue.source),
    acts, editor);
}

export function renderList(box, issues, h) {
  box.innerHTML = '';
  if (!issues.length) { box.append(el('p', {class: 'status'}, 'No issues found.')); return; }
  for (const i of issues) box.append(issueCard(i, h));
}

// Settings: Grammarly personal dictionary import, word swaps, limits, and moving settings between devices.
export function renderSettings(box, onChange) {
  const st = settings();
  box.innerHTML = '';
  const paste = el('textarea', {placeholder: 'Paste your Grammarly personal dictionary here. In Grammarly: Account, Customize, Personal dictionary; select the list and copy it. A messy paste is fine.'});
  const file = el('input', {type: 'file', accept: '.txt,.csv,.json'});
  const words = el('div', {class: 'wordlist'});
  const drawWords = () => {
    words.innerHTML = '';
    const list = settings().words;
    if (!list.length) words.append('No personal words yet.');
    for (const w of list) words.append(el('span', {}, w, el('b', {title: 'Remove', onclick: () => { removeWord(w); drawWords(); onChange(); }}, 'x')));
  };
  drawWords();
  const swaps = el('textarea', {placeholder: 'One per line:  wrong => right\nutilize => use\nAthabaskan => Athabascan'});
  swaps.value = st.swapsText;
  const wpp = el('input', {type: 'number', min: 200, max: 1200, step: 10, value: st.wordsPerPage});
  const lim = el('input', {type: 'number', min: 12, max: 60, step: 1, value: st.longLimit});
  const toggles = el('div', {class: 'row'});
  for (const [k, lab] of [['passive', 'Passive voice'], ['filler', 'Filler words'], ['long', 'Long sentences']]) {
    const cb = el('input', {type: 'checkbox'}); cb.checked = st.enabled[k] !== false;
    cb.onchange = () => { saveSettings({enabled: {[k]: cb.checked}}); onChange(); };
    toggles.append(el('label', {style: 'font-weight:400;display:inline-flex;gap:4px;align-items:center'}, cb, lab));
  }
  const backupBox = el('textarea', {placeholder: 'Backup text appears here. Copy it, then paste it into this box on your other device and press Load backup.'});
  box.append(
    el('label', {}, 'My words from Grammarly (never marked as misspelled)'),
    paste,
    el('div', {class: 'row', style: 'margin-top:6px'},
      el('button', {class: 'primary', onclick: () => { const n = addWords(paste.value); paste.value = ''; drawWords(); toast(n + ' word(s) added'); onChange(); }}, 'Add these words'),
      el('span', {class: 'legend'}, 'or load a text file:'), file),
    words,
    el('label', {}, 'My word swaps (mistakes Grammarly kept catching)'),
    swaps,
    el('div', {class: 'row', style: 'margin-top:6px'}, el('button', {onclick: () => { saveSettings({swapsText: swaps.value}); toast('Swaps saved'); onChange(); }}, 'Save swaps')),
    el('label', {}, 'Checks'), toggles,
    el('label', {}, 'Words per page (for the page-limit estimate)'), wpp,
    el('label', {}, 'Flag sentences longer than (words)'), lim,
    el('label', {}, 'Move my words and settings to another device'),
    backupBox,
    el('div', {class: 'row', style: 'margin-top:6px'},
      el('button', {onclick: () => { backupBox.value = exportBackup(); backupBox.select(); }}, 'Make backup'),
      el('button', {onclick: () => { try { importBackup(backupBox.value); toast('Backup loaded'); renderSettings(box, onChange); onChange(); } catch (e) { toast('That is not a valid backup'); } }}, 'Load backup'))
  );
  file.onchange = async () => {
    const f = file.files[0]; if (!f) return;
    const t = await f.text();
    if (f.name.toLowerCase().endsWith('.json')) { try { importBackup(t); toast('Backup loaded'); renderSettings(box, onChange); onChange(); return; } catch (e) {} }
    const n = addWords(parseWordList(t)); drawWords(); toast(n + ' word(s) added'); onChange();
  };
  wpp.onchange = () => { saveSettings({wordsPerPage: +wpp.value || 500}); onChange(); };
  lim.onchange = () => { saveSettings({longLimit: +lim.value || 25}); onChange(); };
}
