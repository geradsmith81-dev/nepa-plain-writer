// NEPA Plain Writer - phone and desktop page (paste or type text from any program).
import { initEngine, checkText, underlineSet, applyFix, docStats, careChecklist, craftChecklist } from './engine.js';
import { settings } from './store.js';
import { $, el, toast, fillDocTypes, fillAudience, renderSummary, renderCare, renderCraft, renderList, fillGuides, renderSettings } from './ui.js';

const input = $('#input'), review = $('#review'), list = $('#list'), summary = $('#summary'), status = $('#status');
let issues = [], ignored = new Set(), timer = null, running = false, again = false;
const DRAFT = 'nepa-plain-writer-draft';
input.value = localStorage.getItem(DRAFT) || input.value;

function escapeHtml(s) { return s.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c])); }

function draw() {
  const text = input.value;
  const vis = issues.filter(i => !ignored.has(key(i)));
  const marks = underlineSet(vis);
  const longs = vis.filter(i => i.scope === 'sentence');
  const cuts = new Set([0, text.length]);
  for (const i of [...marks, ...longs]) { cuts.add(i.start); cuts.add(i.end); }
  const pts = [...cuts].sort((a, b) => a - b);
  let html = '';
  for (let n = 0; n < pts.length - 1; n++) {
    const a = pts[n], b = pts[n + 1]; if (a === b) continue;
    const seg = escapeHtml(text.slice(a, b));
    const m = marks.find(i => i.start <= a && i.end >= b);
    const lg = longs.find(i => i.start <= a && i.end >= b);
    let piece = m ? '<mark class="k-' + m.kind + '" data-id="' + m.id + '">' + seg + '</mark>' : seg;
    if (lg) piece = '<span class="long" data-long="' + lg.id + '">' + piece + '</span>';
    html += piece;
  }
  review.innerHTML = html || '<span class="status">Your checked text appears here.</span>';
  renderCare($('#care'), careChecklist(text), vis);
  renderCraft($('#craft'), craftChecklist(text));
  renderSummary(summary, docStats(text, {docType: settings().docType, wordsPerPage: settings().wordsPerPage}), vis, run);
  renderList(list, vis, handlers);
}
const key = i => i.rule + '|' + i.problem + '|' + i.start;
const handlers = {
  onFix(issue, fix) {
    input.value = applyFix(input.value, fix); save(); run();
  },
  onGo(issue) {
    document.querySelectorAll('mark.active,.issue.sel').forEach(e => e.classList.remove('active', 'sel'));
    const m = review.querySelector('mark[data-id="' + issue.id + '"]') || review.querySelector('[data-long="' + issue.id + '"]');
    if (m) { m.classList.add('active'); m.scrollIntoView({block: 'center', behavior: 'smooth'}); }
    const c = list.querySelector('.issue[data-id="' + issue.id + '"]'); if (c) c.classList.add('sel');
  },
  onIgnore(issue) { ignored.add(key(issue)); draw(); },
  async onAddWord(issue) {
    const { addWords } = await import('./store.js'); addWords([issue.problem]); toast('"' + issue.problem + '" added to your words'); run();
  }
};
review.addEventListener('click', e => {
  const m = e.target.closest('mark'); if (!m) return;
  const id = +m.dataset.id; const c = list.querySelector('.issue[data-id="' + id + '"]');
  document.querySelectorAll('.issue.sel,mark.active').forEach(x => x.classList.remove('sel', 'active'));
  m.classList.add('active');
  if (c) { c.classList.add('sel'); c.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }
});

function save() { try { localStorage.setItem(DRAFT, input.value); } catch (e) {} }
async function run() {
  if (running) { again = true; return; }
  running = true; status.textContent = 'Checking...';
  try {
    issues = await checkText(input.value); ignored = new Set([...ignored].filter(k => issues.some(i => key(i) === k)));
    draw(); status.textContent = issues.length ? issues.length + ' suggestions' : 'No issues found';
  } catch (e) { status.textContent = 'Problem while checking: ' + e.message; console.error(e); }
  running = false; if (again) { again = false; run(); }
}
input.addEventListener('input', () => { save(); clearTimeout(timer); timer = setTimeout(run, 900); });
$('#check').onclick = run;
$('#paste').onclick = async () => { try { input.value = await navigator.clipboard.readText(); save(); run(); } catch (e) { toast('Paste blocked: long-press in the box and choose Paste'); } };
$('#copy').onclick = async () => { try { await navigator.clipboard.writeText(input.value); toast('Text copied. Paste it back into your program.'); } catch (e) { input.select(); toast('Press Ctrl+C (or Copy) to copy'); } };
$('#clear').onclick = () => { if (confirm('Clear the text box?')) { input.value = ''; save(); run(); } };
$('#gear').onclick = () => $('#settings').classList.toggle('hidden');
fillDocTypes($('#doctype'));
fillAudience($('#audience'));
fillGuides($('#guides'));
document.addEventListener('changed', run);
renderSettings($('#settingsBody'), run);

initEngine(m => status.textContent = m).then(run).catch(e => { status.textContent = 'Could not load the grammar engine: ' + e.message; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
