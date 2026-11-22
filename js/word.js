// NEPA Plain Writer - Microsoft Word add-in (task pane).
/* global Office, Word */
import { initEngine, checkText, underlineSet, docStats, careChecklist, craftChecklist, ajaChecklist, AJA_TYPES, documentContext } from './engine.js';
import { settings, addWords } from './store.js';
import { $, el, toast, fillDocTypes, fillAudience, renderSummary, renderCare, renderCraft, renderAja, renderList, fillGuides, renderSettings } from './ui.js';

const status = $('#status'), list = $('#list'), summary = $('#summary');
const COLOR = {care: 'Berry', spelling: 'Red', grammar: 'Blue', cite: 'Blue', aja: 'Blue', concise: 'Lavender', voice: 'Lavender', craft: 'Lavender', personal: 'Lavender', plain: 'Green', scicomm: 'Green', nepa: 'Berry'};
const HILITE = {care: 'Yellow', spelling: 'Pink', grammar: 'Turquoise', cite: 'Turquoise', aja: 'Turquoise', concise: 'Gray25', voice: 'Gray25', craft: 'Gray25', personal: 'Gray25', nepa: 'Gray25', plain: 'BrightGreen', scicomm: 'BrightGreen'};
let paras = [];            // [{index, text, issues}]
let docAll = '';
let canAnnotate = false, canPopup = false;
const annMap = new Map();  // annotation id -> {para, issue}
const highlighted = [];    // issues we coloured in "highlight" mode
let ignored = new Set();
const key = (p, i) => p + '|' + i.rule + '|' + i.problem + '|' + i.start;

function mode() { return $('#mode').value; }
function allIssues() { return paras.flatMap(p => p.issues.filter(i => !ignored.has(key(p.index, i))).map(i => Object.assign(i, {para: p.index}))); }

// Word search: '^' is a control character; texts over 255 characters cannot be searched in one go.
const wsafe = s => s.replace(/\^/g, '^^');
function occurrenceIndex(text, target, start) {
  let n = 0, pos = text.indexOf(target);
  while (pos !== -1 && pos < start) { n++; pos = text.indexOf(target, pos + target.length); }
  return n;
}
// Queue a search for text [start,end) of paragraph p; returns a function that, after sync, gives the Word range (or null).
function queueRange(paragraph, text, start, end) {
  const target = text.slice(start, end);
  if (target.length <= 240) {
    const res = paragraph.search(wsafe(target), {matchCase: true}); res.load('items');
    const n = occurrenceIndex(text, target, start);
    return () => res.items[n] || res.items[0] || null;
  }
  const head = text.slice(start, start + 120), tail = text.slice(end - 120, end);
  const r1 = paragraph.search(wsafe(head), {matchCase: true}); r1.load('items');
  const r2 = paragraph.search(wsafe(tail), {matchCase: true}); r2.load('items');
  const n1 = occurrenceIndex(text, head, start), n2 = occurrenceIndex(text, tail, end - 120);
  return () => { const a = r1.items[n1], b = r2.items[n2]; return a && b ? a.expandTo(b) : (a || null); };
}

let busy = false, quietUntil = 0, autoTimer = null;
async function check(selectionOnly) {
  busy = true;
  status.textContent = 'Reading the document...';
  $('#checkDoc').disabled = $('#checkSel').disabled = true;
  try {
    await clearMarks(true);
    await Word.run(async ctx => {
      const ps = ctx.document.body.paragraphs; ps.load('items/text');
      let sel = null;
      if (selectionOnly) { sel = ctx.document.getSelection().paragraphs; sel.load('items/text'); }
      await ctx.sync();
      let first = 0, last = ps.items.length - 1;
      if (sel && sel.items.length) {
        const st = sel.items.map(p => p.text);
        for (let i = 0; i + st.length <= ps.items.length; i++) {
          if (st.every((t, k) => ps.items[i + k].text === t)) { first = i; last = i + st.length - 1; break; }
        }
      }
      status.textContent = 'Checking ' + (last - first + 1) + ' paragraphs...';
      docAll = ps.items.map(p => p.text).join('\n');
      const dctx = documentContext(docAll);
      paras = [];
      for (let i = first; i <= last; i++) {
        const text = ps.items[i].text;
        if (!text.trim()) continue;
        const issues = await checkText(text, dctx);
        paras.push({index: i, text, issues});
      }
    });
    ignored = new Set();
    let note = '';
    try { note = await drawMarksSafely(); } catch (e) { note = 'Marks could not be drawn in this document (' + errText(e) + '); showing the list only.'; }
    redraw();
    if (note) status.textContent += ' · ' + note;
  } catch (e) { status.textContent = 'Problem: ' + errText(e); console.error(e); }
  $('#checkDoc').disabled = $('#checkSel').disabled = false;
  busy = false; quietUntil = Date.now() + 1500;
}

// Re-check automatically about two seconds after you stop typing (Word 2016 and later with WordApi 1.6).
function onDocChanged() {
  if (!$('#auto').checked || !paras.length || busy || Date.now() < quietUntil) return;
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => { if (!busy) check(false); }, 2000);
}

function redraw() {
  const iss = allIssues();
  const fullText = paras.map(p => p.text).join('\n');
  renderCare($('#care'), careChecklist(docAll || fullText), iss);
  $('#craft').classList.remove('hidden');
  renderCraft($('#craft'), craftChecklist(docAll || fullText));
  renderAja($('#aja'), ajaChecklist((docAll || fullText), settings().ajaType), AJA_TYPES, () => check(false));
  renderSummary(summary, docStats(fullText, {docType: settings().docType, wordsPerPage: settings().wordsPerPage}), iss, () => check(false));
  renderList(list, iss, handlers);
  status.textContent = iss.length + ' suggestions' + (mode() === 'underline' && canAnnotate ? ' (underlined in the document)' : '');
}

const errText = e => (e && (e.code || e.message || String(e))) + '';
const notImpl = e => /0x80004001|NotImplemented|not implemented|ApiNotFound|InvalidArgument|GeneralException|0x80070057/i.test(errText(e) + ' ' + (e && e.message || ''));
// Try the best marking this Word supports, falling back step by step:
// underlines with pop-up suggestions -> underlines -> highlights -> list only. Returns a note for the status line.
async function drawMarksSafely() {
  const want = mode();
  if (want === 'list') return '';
  if (want === 'underline' && canAnnotate) {
    try { await drawMarks(); return ''; } catch (e) {
      console.warn('annotations with pop-ups failed', e);
      annMap.clear();
      if (canPopup) { canPopup = false; try { await drawMarks(); return ''; } catch (e2) { console.warn('annotations failed', e2); annMap.clear(); } }
      canAnnotate = false;
      const opt = $('#mode').querySelector('option[value=underline]'); if (opt) opt.textContent = 'Underlines (not available in this Word; using highlights)';
    }
  }
  try { await drawMarks(); return canAnnotate || want !== 'underline' ? '' : 'Word refused coloured underlines here, so issues are highlighted instead (use Remove marks to clear them).'; }
  catch (e) { console.warn('highlights failed', e); highlighted.length = 0; return 'Marks could not be drawn in this document (' + errText(e) + '); showing the list only.'; }
}

async function drawMarks() {
  const m = mode();
  if (m === 'list') return;
  await Word.run(async ctx => {
    const ps = ctx.document.body.paragraphs; ps.load('items'); await ctx.sync();
    if (m === 'underline' && canAnnotate) {
      const pending = [];
      for (const p of paras) {
        const marks = underlineSet(p.issues.filter(i => !ignored.has(key(p.index, i))));
        if (!marks.length) continue;
        const critiques = marks.map(i => {
          const c = {colorScheme: COLOR[i.kind], start: i.start, length: i.end - i.start};
          if (canPopup) c.popupOptions = {suggestions: i.fixes.slice(0, 3).map(f => f.label)};
          return c;
        });
        pending.push({p, marks, ids: ps.items[p.index].insertAnnotations({critiques})});
      }
      await ctx.sync();
      for (const {p, marks, ids} of pending) ids.value.forEach((id, n) => annMap.set(id, {para: p.index, issue: marks[n]}));
    } else if (usingHighlights()) {
      const getters = [];
      for (const p of paras) for (const i of underlineSet(p.issues)) getters.push([i, queueRange(ps.items[p.index], p.text, i.start, i.end)]);
      await ctx.sync();
      for (const [i, g] of getters) { const r = g(); if (r) { r.font.highlightColor = HILITE[i.kind]; highlighted.push({para: i.para ?? null, issue: i}); } }
      await ctx.sync();
    }
  });
}

const HILITE_HEX = {Pink: '#FF00FF', Turquoise: '#00FFFF', Yellow: '#FFFF00', BrightGreen: '#00FF00', Gray25: '#C0C0C0'};  // every colour used in HILITE
const OURS = new Set(Object.entries(HILITE_HEX).flatMap(([n, h]) => [n.toUpperCase(), h]));
// Remove our highlight colours from one paragraph. If its text is unchanged we know exactly where they are;
// if you have typed in it, scan its words for our colours instead.
function queueClearParagraph(ctx, para, p, current) {
  if (current === p.text) {
    const getters = underlineSet(p.issues).map(i => queueRange(para, p.text, i.start, i.end));
    return () => { for (const g of getters) { const r = g(); if (r) r.font.highlightColor = null; } };
  }
  const words = para.getTextRanges([' ', ',', '.', ';', ':', '?', '!', ')', '('], false); words.load('items/font/highlightColor');
  const spaces = para.search(' ', {matchCase: false}); spaces.load('items/font/highlightColor');
  return () => { for (const r of [...words.items, ...spaces.items]) { const c = String(r.font.highlightColor || '').toUpperCase(); if (OURS.has(c)) r.font.highlightColor = null; } };
}
async function clearMarks(silent) {
  await Word.run(async ctx => {
    if (canAnnotate && annMap.size) {
      for (const id of annMap.keys()) { try { ctx.document.getAnnotationById(id).delete(); } catch (e) {} }
      try { await ctx.sync(); } catch (e) {}
      annMap.clear();
    }
    if (highlighted.length) {
      const ps = ctx.document.body.paragraphs; ps.load('items/text'); await ctx.sync();
      const done = [];
      for (const p of paras) { const cur = ps.items[p.index]; if (cur) done.push(queueClearParagraph(ctx, cur, p, cur.text)); }
      await ctx.sync(); done.forEach(f => f()); await ctx.sync(); highlighted.length = 0;
    }
  });
  if (!silent) { list.innerHTML = ''; summary.innerHTML = ''; paras = []; status.textContent = 'Marks removed.'; }
}
function usingHighlights() { return mode() === 'highlight' || (mode() === 'underline' && !canAnnotate); }

async function applyFixInWord(issue, fix) {
  const p = paras.find(x => x.index === issue.para);
  await Word.run(async ctx => {
    const ps = ctx.document.body.paragraphs; ps.load('items/text'); await ctx.sync();
    const para = ps.items[p.index];
    if (para.text !== p.text) { toast('This paragraph changed since the check. Re-checking...'); return; }
    const get = queueRange(para, p.text, fix.start, fix.end); await ctx.sync();
    const r = get(); if (!r) { toast('Could not find that text in Word.'); return; }
    r.load('text'); await ctx.sync();
    if (r.text !== p.text.slice(fix.start, fix.end)) { toast('Text no longer matches; re-check.'); return; }
    quietUntil = Date.now() + 2500;
    if (highlighted.length) { const f = queueClearParagraph(ctx, para, p, para.text); await ctx.sync(); f(); }
    r.insertText(fix.text, 'Replace'); await ctx.sync();
  });
  await recheckParagraph(p.index);
}

async function recheckParagraph(index) {
  await Word.run(async ctx => {
    const ps = ctx.document.body.paragraphs; ps.load('items/text'); await ctx.sync();
    const p = paras.find(x => x.index === index); const para = ps.items[index];
    if (canAnnotate) {
      for (const [id, v] of [...annMap]) if (v.para === index) { try { ctx.document.getAnnotationById(id).delete(); } catch (e) {} annMap.delete(id); }
      try { await ctx.sync(); } catch (e) {}
    }
    p.text = para.text;
    // Re-run the document in order so first-use checks (acronyms, species, repeats) stay right; only this paragraph is re-marked.
    docAll = ps.items.map(x => x.text).join('\n');
    const dctx = documentContext(docAll);
    for (const q of paras) { if (q.index !== index && q.text !== ps.items[q.index].text) q.text = ps.items[q.index].text; q.issues = await checkText(q.text, dctx); }
    if (usingHighlights() && highlighted.length) {
      const getters = underlineSet(p.issues.filter(i => !ignored.has(key(index, i)))).map(i => [i, queueRange(para, p.text, i.start, i.end)]);
      await ctx.sync();
      for (const [i, g] of getters) { const r = g(); if (r) r.font.highlightColor = HILITE[i.kind]; }
      await ctx.sync();
    }
    if (mode() === 'underline' && canAnnotate) {
      const marks = underlineSet(p.issues.filter(i => !ignored.has(key(index, i))));
      if (marks.length) {
        try {
          const ids = para.insertAnnotations({critiques: marks.map(i => Object.assign({colorScheme: COLOR[i.kind], start: i.start, length: i.end - i.start},
            canPopup ? {popupOptions: {suggestions: i.fixes.slice(0, 3).map(f => f.label)}} : {}))});
          await ctx.sync(); ids.value.forEach((id, n) => annMap.set(id, {para: index, issue: marks[n]}));
        } catch (e) { console.warn('re-marking failed', e); canAnnotate = false; }
      }
    }
  });
  redraw();
}

async function goTo(issue) {
  const p = paras.find(x => x.index === issue.para);
  await Word.run(async ctx => {
    const ps = ctx.document.body.paragraphs; ps.load('items/text'); await ctx.sync();
    const para = ps.items[p.index];
    const get = queueRange(para, para.text, issue.start, issue.end); await ctx.sync();
    const r = get(); if (r) r.select(); else para.select();
    await ctx.sync();
  });
  document.querySelectorAll('.issue.sel').forEach(e => e.classList.remove('sel'));
  const c = list.querySelector('.issue[data-id="' + issue.id + '"]'); if (c) c.classList.add('sel');
}

const handlers = {
  onFix: (i, f) => applyFixInWord(i, f).catch(e => toast(e.message)),
  onGo: i => goTo(i).catch(e => toast(e.message)),
  async onIgnore(i) {
    ignored.add(key(i.para, i));
    if (canAnnotate) for (const [id, v] of annMap) if (v.issue === i) {
      await Word.run(async ctx => { ctx.document.getAnnotationById(id).delete(); await ctx.sync(); }).catch(() => {}); annMap.delete(id);
    }
    redraw();
  },
  async onAddWord(i) { addWords([i.problem]); toast('"' + i.problem + '" added to your words'); await check(false); }
};

async function onPopupAction(args) {
  const hit = annMap.get(args.id); if (!hit) return;
  if (String(args.action).toLowerCase() === 'accept' && args.critiqueSuggestion !== undefined) {
    const fix = hit.issue.fixes.find(f => f.label === args.critiqueSuggestion) || hit.issue.fixes[0];
    if (fix) await applyFixInWord(Object.assign(hit.issue, {para: hit.para}), fix);
  } else {
    ignored.add(key(hit.para, hit.issue)); annMap.delete(args.id); redraw();
  }
}

Office.onReady(async info => {
  if (info.host !== Office.HostType.Word) { status.textContent = 'Open this inside Microsoft Word.'; return; }
  canAnnotate = Office.context.requirements.isSetSupported('WordApi', '1.7');
  canPopup = Office.context.requirements.isSetSupported('WordApi', '1.8');
  const modeSel = $('#mode');
  if (!canAnnotate) { modeSel.querySelector('option[value=underline]').textContent = 'Underlines (not available in this Word; using highlights)'; }
  modeSel.value = localStorage.getItem('npw-mode') || (canAnnotate ? 'underline' : 'list');
  modeSel.onchange = async () => { localStorage.setItem('npw-mode', modeSel.value); await clearMarks(true); await drawMarks(); redraw(); };
  const auto = $('#auto');
  auto.checked = localStorage.getItem('npw-auto') !== 'off';
  auto.onchange = () => localStorage.setItem('npw-auto', auto.checked ? 'on' : 'off');
  if (Office.context.requirements.isSetSupported('WordApi', '1.6')) {
    await Word.run(async ctx => { ctx.document.onParagraphChanged.add(onDocChanged); ctx.document.onParagraphAdded.add(onDocChanged); await ctx.sync(); }).catch(() => { auto.disabled = true; });
  } else { auto.checked = false; auto.disabled = true; }
  if (canPopup) {
    await Word.run(async ctx => { ctx.document.onAnnotationPopupAction.add(onPopupAction); await ctx.sync(); }).catch(() => {});
  }
  fillDocTypes($('#doctype'));
  fillAudience($('#audience'));
  fillGuides($('#guides'));
  $('#care').innerHTML = '<span class="legend">The CARE checklist appears here after you press Check document.</span>';
  $('#craft').innerHTML = '';
  $('#craft').classList.add('hidden');
  document.addEventListener('changed', () => paras.length && check(false));
  renderSettings($('#settingsBody'), () => {});
  $('#gear').onclick = () => $('#settings').classList.toggle('hidden');
  $('#checkDoc').onclick = () => check(false);
  $('#checkSel').onclick = () => check(true);
  $('#clearMarks').onclick = () => clearMarks(false).catch(e => toast(e.message));
  initEngine(m => status.textContent = m).then(() => status.textContent = 'Ready. Press Check document.').catch(e => status.textContent = 'Could not load the grammar engine: ' + e.message);
});
