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

// The CARE panel sits at the top of every summary.
export function renderCare(box, checklist, issues) {
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

const KIND_ORDER = ['care', 'spelling', 'grammar', 'concise', 'plain', 'scicomm', 'cite', 'voice', 'nepa', 'personal'];
export function renderSummary(box, stats, issues, onToggle) {
  const st = settings();
  const counts = {}; for (const i of issues) counts[i.kind] = (counts[i.kind] || 0) + 1;
  const chips = el('div', {class: 'chips'});
  for (const k of KIND_ORDER) {
    if (k === 'personal' && !st.swaps.length) continue;
    const on = st.enabled[k] !== false;
    chips.append(el('span', {class: 'chip' + (on ? '' : ' off'), title: on ? 'Click to hide' : 'Click to show',
      onclick: () => { saveSettings({enabled: {[k]: !on}}); onToggle && onToggle(); }},
      el('span', {class: 'dot', style: 'background:' + KIND_INFO[k].color}), KIND_INFO[k].label + ' ' + (counts[k] || 0)));
  }
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
export function issueCard(issue, h) {
  const info = KIND_INFO[issue.kind];
  const acts = el('div', {class: 'acts'});
  for (const f of issue.fixes.slice(0, 3)) acts.append(el('button', {class: 'fix', title: 'Replace with this', onclick: e => { e.stopPropagation(); h.onFix(issue, f); }}, f.label === '' ? '(delete)' : f.label));
  if (h.onGo) acts.append(el('button', {onclick: e => { e.stopPropagation(); h.onGo(issue); }}, 'Show'));
  if (issue.kind === 'spelling' && h.onAddWord) acts.append(el('button', {onclick: e => { e.stopPropagation(); h.onAddWord(issue); }}, 'Add to my words'));
  acts.append(el('button', {onclick: e => { e.stopPropagation(); h.onIgnore(issue); }}, 'Ignore'));
  return el('div', {class: 'issue k-' + issue.kind, 'data-id': issue.id, onclick: () => h.onGo && h.onGo(issue)},
    el('div', {class: 'kind'}, info.label),
    el('div', {class: 'prob' + (issue.scope === 'sentence' ? ' longtext' : '')}, issue.problem),
    el('div', {class: 'msg'}, issue.message),
    el('div', {class: 'src'}, 'Basis: ' + issue.source),
    acts);
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
