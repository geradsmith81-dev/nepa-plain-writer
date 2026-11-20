// NEPA Plain Writer - Google Docs side panel. Loaded by the small Apps Script inside your document.
/* global google */
import { initEngine, checkText, underlineSet, docStats, careChecklist, craftChecklist, documentContext } from './engine.js';
import { settings, addWords, setPersistHook, loadSettingsJSON } from './store.js';
import { $, toast, fillDocTypes, fillAudience, renderSummary, renderCare, renderCraft, renderList, fillGuides, renderSettings } from './ui.js';

const status = $('#status'), list = $('#list'), summary = $('#summary');
const gs = (fn, ...args) => new Promise((ok, fail) => google.script.run.withSuccessHandler(ok).withFailureHandler(fail)[fn](...args));
let paras = [], ignored = new Set(), docAll = '';
const key = (p, i) => p + '|' + i.rule + '|' + i.problem + '|' + i.start;
const allIssues = () => paras.flatMap(p => p.issues.filter(i => !ignored.has(key(p.i, i))).map(i => Object.assign(i, {para: p.i})));
const marksFor = p => underlineSet(p.issues.filter(i => !ignored.has(key(p.i, i)))).map(i => ({i: p.i, s: i.start, e: i.end, k: i.kind}));

async function knownBefore(index) {
  const known = new Set();
  for (const q of paras) if (q.i < index) for (const m of q.text.matchAll(/\(([A-Z][A-Z&]{1,8})s?\)/g)) known.add(m[1]);
  return known;
}
async function check(selectionOnly) {
  $('#checkDoc').disabled = $('#checkSel').disabled = true;
  try {
    status.textContent = 'Reading the document...';
    await gs('clearMarks');
    const ps = await gs('getParagraphs', !!selectionOnly);
    status.textContent = 'Checking ' + ps.length + ' paragraphs...';
    const all = selectionOnly ? await gs('getParagraphs', false) : ps;
    docAll = all.map(p => p.text).join('\n');
    const ctx = documentContext(docAll); paras = []; ignored = new Set();
    for (const p of ps) { if (!p.text.trim()) continue; paras.push({i: p.i, text: p.text, issues: await checkText(p.text, ctx)}); }
    if ($('#mode').value === 'highlight') { status.textContent = 'Colouring the text...'; await gs('highlight', paras.flatMap(marksFor)); }
    redraw();
  } catch (e) { status.textContent = 'Problem: ' + (e.message || e); }
  $('#checkDoc').disabled = $('#checkSel').disabled = false;
}
function redraw() {
  const iss = allIssues();
  renderCare($('#care'), careChecklist(docAll), iss);
  renderCraft($('#craft'), craftChecklist(docAll));
  renderSummary(summary, docStats(paras.map(p => p.text).join('\n'), {docType: settings().docType, wordsPerPage: settings().wordsPerPage}), iss, () => check(false));
  renderList(list, iss, handlers);
  status.textContent = iss.length + ' suggestions';
}
async function recheck(index, newText) {
  const p = paras.find(x => x.i === index); p.text = newText;
  docAll = paras.map(q => q.text).join('\n');
  const ctx = documentContext(docAll);
  for (const q of paras) q.issues = await checkText(q.text, ctx);
  if ($('#mode').value === 'highlight') { await gs('clearMarks', index); await gs('highlight', marksFor(p)); }
  redraw();
}
const handlers = {
  async onFix(issue, fix) {
    const p = paras.find(x => x.i === issue.para);
    const r = await gs('applyFix', p.i, fix.start, fix.end, p.text.slice(fix.start, fix.end), fix.text).catch(e => ({ok: false, why: e.message}));
    if (!r.ok) { toast(r.why || 'Text changed since the check. Check again.'); return; }
    await recheck(p.i, r.text);
  },
  onGo(issue) { gs('selectRange', issue.para, issue.start, issue.end).catch(() => {}); },
  async onIgnore(issue) {
    ignored.add(key(issue.para, issue));
    if ($('#mode').value === 'highlight') { await gs('clearMarks', issue.para); await gs('highlight', marksFor(paras.find(x => x.i === issue.para))); }
    redraw();
  },
  async onAddWord(issue) { addWords([issue.problem]); toast('"' + issue.problem + '" added to your words'); await check(false); }
};

(async () => {
  try { loadSettingsJSON(await gs('loadSettings')); } catch (e) {}
  setPersistHook(json => gs('saveSettings', json).catch(() => {}));
  fillDocTypes($('#doctype'));
  fillAudience($('#audience'));
  fillGuides($('#guides'));
  document.addEventListener('changed', () => paras.length && check(false));
  renderSettings($('#settingsBody'), () => {});
  $('#gear').onclick = () => $('#settings').classList.toggle('hidden');
  $('#checkDoc').onclick = () => check(false);
  $('#checkSel').onclick = () => check(true);
  $('#clearMarks').onclick = async () => { await gs('clearMarks'); toast('Marks removed'); };
  await initEngine(m => status.textContent = m).catch(e => { status.textContent = 'Could not load the grammar engine: ' + e.message; throw e; });
  status.textContent = 'Ready. Press Check document.';
})();
