// NEPA Plain Writer - Chicago (18th ed., 2024, author-date), APA (7th ed.) and MLA (9th ed., 2021) citation checks.
// Only one citation style runs at a time (chosen in the Citations menu), because their rules contradict each other.
export const CITE_STYLES = {
  saa: {label: 'SAA (2023)'},
  aja: {label: 'AJA (2018)'},
  chicago: {label: 'Chicago 18th, author-date', src: 'Chicago Manual of Style, 18th ed. (2024), author-date'},
  apa: {label: 'APA 7th', src: 'APA Publication Manual, 7th ed.'},
  mla: {label: 'MLA 9th', src: 'MLA Handbook, 9th ed. (2021)'},
  none: {label: 'None (no citation checks)'}
};
const HEAD = /^\s*(References Cited|References|Literature Cited|Bibliography|Works Cited|Works Consulted)\s*$/im;
const NAME = "[A-Z][A-Za-zÀ-ÿ'’-]+";
const YEAR = '(?:1[5-9]|20)\\d\\d[a-z]?';
const first = s => s.trim().split(/[\s,]+/)[0].toLowerCase().replace(/[’']/g, "'");

// Style-independent document index: reference lines and what each one lists.
export function buildStyleIndex(docText) {
  const lines = docText.split(/\r?\n/).map(l => l.trim());
  const h = lines.findIndex(l => HEAD.test(l));
  const refLines = new Set(), entries = [];
  if (h >= 0) for (const l of lines.slice(h + 1)) {
    if (!l) continue;
    if (/^(?:APPENDIX|Appendix|TABLES?|FIGURES?|Figure Captions|NOTES?|ENDNOTES)\b/.test(l)) break;
    refLines.add(l);
    const m = l.match(new RegExp('^(' + NAME + '(?:\\s' + NAME + ')*),'));
    if (!m) continue;
    const yApa = l.match(new RegExp('\\((' + YEAR + '|n\\.d\\.)')), yAny = l.match(new RegExp('\\b(' + YEAR + ')\\b'));
    entries.push({line: l, surname: first(m[1]), yearApa: yApa ? yApa[1] : null, year: yAny ? yAny[1] : null});
  }
  const body = h >= 0 ? lines.slice(0, h).join('\n') : docText;
  return {hasRefs: h >= 0, heading: h >= 0 ? lines[h] : null, refLines, entries, body};
}
export function isStyleRef(text, idx) { return !!idx && idx.refLines.has(text.trim()); }

function citedKeys(body, style) {
  const out = new Set();
  for (const g of body.matchAll(/\(([^()]*)\)/g)) for (let part of g[1].split(';')) {
    part = part.replace(/^\s*(?:e\.g\.,?|see|cf\.|also|see also)\s+/i, '');
    const m = part.match(new RegExp('^\\s*(' + NAME + ')'));
    if (!m) continue;
    if (style === 'mla') { if (/\d|et al\.|\band\b/.test(part)) out.add(first(m[1])); continue; }
    for (const y of part.matchAll(new RegExp('(' + YEAR + '|n\\.d\\.)', 'g'))) out.add(first(m[1]) + ' ' + y[1]);
  }
  if (style !== 'mla') for (const m of body.matchAll(new RegExp('(' + NAME + ')(?:\\s(?:and|&)\\s' + NAME + '|\\set al\\.)?\\s\\((' + YEAR + '|n\\.d\\.)', 'g'))) out.add(first(m[1]) + ' ' + m[2]);
  return out;
}
const listedKey = (e, style) => style === 'mla' ? e.surname : e.surname + ' ' + ((style === 'apa' ? (e.yearApa || e.year) : e.year) || '');

export function checkStyle(text, opts, style) {
  const S = CITE_STYLES[style]; const out = [];
  const WIDE = new Set(['order', 'missing', 'etal3', 'perscomm']);
  const add = (s, e, rule, msg, reps = []) => out.push({start: s, end: e, kind: 'cite', rule: style + ':' + rule, scope: 'word', wide: WIDE.has(rule), problem: text.slice(s, e),
    message: msg, source: S.src, fixes: reps.map(r => ({label: r === '' ? 'Delete "' + text.slice(s, e) + '"' : r, start: s, end: e, text: r}))});
  const idx = opts.styleIndex;
  if (isStyleRef(text, idx)) { checkRef(text, idx, style, add); return out; }
  if (idx && idx.hasRefs) {
    const want = style === 'mla' ? 'Works Cited' : 'References';
    // heading check happens on the heading line itself
  }
  if (idx && idx.heading && text.trim() === idx.heading) {
    const want = style === 'mla' ? 'Works Cited' : (style === 'apa' ? 'References' : null);
    if (want && text.trim() !== want) add(0, text.length, 'heading', style === 'mla' ? 'MLA titles the list "Works Cited".' : 'APA titles the list "References".', [want]);
    if (style === 'chicago' && !/^(?:References|Bibliography)$/.test(text.trim())) add(0, text.length, 'heading', 'Chicago author-date titles the list "References".', ['References']);
    return out;
  }
  const parens = [...text.matchAll(/\(([^()]*)\)/g)];
  for (const g of parens) {
    const inner = g[1]; let off = g.index + 1;
    if (!/\d|n\.d\./.test(inner) || !new RegExp('^\\s*(?:e\\.g\\.,?\\s*|see\\s+|cf\\.\\s+)?' + NAME).test(inner)) continue;
    if (/personal communication|pers\.? comm/i.test(inner)) {
      if (style === 'apa' && !/personal communication,\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/.test(inner))
        add(g.index, g.index + g[0].length, 'perscomm', 'APA personal communication: (J. Smith, personal communication, March 12, 2020). Not listed in References.');
      continue;
    }
    for (const rawPart of inner.split(';')) {
      const lead = rawPart.match(/^\s*(?:e\.g\.,?\s*|see also\s+|see\s+|cf\.\s+)?/)[0];
      const part = rawPart.slice(lead.length); const ps = off + lead.length;
      const A = part.match(new RegExp('^(' + NAME + '(?:,\\s' + NAME + ')*(?:,?\\s(?:and|&)\\s' + NAME + ')?(?:\\set al\\.)?)(,?)\\s*(' + YEAR + '|n\\.d\\.|\\d+)?(.*)$'));
      if (!A) { off += rawPart.length + 1; continue; }
      const [, authors, comma, yr, rest] = A;
      const nNames = (authors.match(new RegExp(NAME, 'g')) || []).filter(n => !/^(?:and|et)$/.test(n)).length;
      const isYear = yr && new RegExp('^' + YEAR + '$|^n\\.d\\.$').test(yr);
      if (style === 'chicago') {
        if (comma && isYear) add(ps, ps + authors.length + comma.length + 1 + yr.length, 'comma', 'Chicago author-date: no comma between author and year (Smith 2020).', [authors + ' ' + yr]);
        if (/&/.test(authors)) { const k = ps + authors.indexOf('&'); add(k, k + 1, 'amp', 'Use "and", not "&" (Smith and Jones 2020).', ['and']); }
        const pg = rest.match(/^(\s*:\s*|\s*,\s*pp?\.\s*|\s+pp?\.\s*)(\d+(?:[-–]\d+)?)/);
        if (isYear && pg) { const k = ps + part.length - rest.length; add(k, k + pg[0].length, 'pages', 'Chicago author-date puts a comma before the page: (Smith 2020, 45).', [', ' + pg[2]]); }
      } else if (style === 'apa') {
        if (isYear && !comma) add(ps, ps + authors.length + 1 + yr.length, 'comma', 'APA puts a comma between author and year: (Smith, 2020).', [authors + ', ' + yr]);
        const andAt = authors.search(/\sand\s/);
        if (andAt >= 0 && !/et al\./.test(authors)) add(ps + andAt + 1, ps + andAt + 4, 'amp', 'Inside parentheses APA uses "&": (Smith & Jones, 2020).', ['&']);
        const pg = rest.match(/^(\s*:\s*|\s*,\s*|\s+)(\d+(?:[-–]\d+)?)/);
        if (isYear && pg && !/^\s*,\s*pp?\.\s/.test(rest)) { const k = ps + part.length - rest.length; add(k, k + pg[0].length, 'pages', 'APA gives pages with "p." or "pp.": (Smith, 2020, p. 45).', [', ' + (/[-–]/.test(pg[2]) ? 'pp. ' : 'p. ') + pg[2].replace('-', '–')]); }
      } else if (style === 'mla') {
        if (isYear) add(ps + authors.length + comma.length, ps + authors.length + comma.length + 1 + yr.length, 'year', 'MLA in-text citations give the author and page, not the year: (Smith 45). If this number is a page, ignore this.', []);
        else if (comma && yr) add(ps, ps + authors.length + comma.length + 1 + yr.length, 'comma', 'MLA: no comma between author and page (Smith 45).', [authors + ' ' + yr]);
        if (/&/.test(authors)) { const k = ps + authors.indexOf('&'); add(k, k + 1, 'amp', 'Use "and", not "&" (Smith and Jones 45).', ['and']); }
        const pg = rest.match(/^,?\s*(?:p\.|pp\.|pg\.|page)\s*(\d+(?:[-–]\d+)?)/);
        if (pg) { const k = ps + part.length - rest.length; add(k, k + pg[0].length, 'pages', 'MLA gives the page number alone, with no "p.": (Smith 45).', [pg[1]]); }
      }
      if (nNames >= 3 && !/et al\./.test(authors)) {
        const firstName = authors.match(new RegExp(NAME))[0];
        add(ps, ps + authors.length, 'etal3', (style === 'chicago' ? 'Chicago 18 lists up to two authors in a text citation; for three or more, give the first author and "et al."' : style === 'apa' ? 'APA uses "et al." for three or more authors from the first citation: (Smith et al., 2020).' : 'MLA uses "et al." for three or more authors: (Smith et al. 45).'), [firstName + ' et al.']);
      }
      if (style === 'apa' && /et al\.$/.test(authors) && isYear && !comma) {/* covered by comma rule */}
      off += rawPart.length + 1;
    }
    if (style === 'apa') {   // alphabetical order of a citation string
      const parts = inner.replace(/^\s*(?:e\.g\.,?|see)\s+/i, '').split(';').map(p => p.trim().toLowerCase());
      if (parts.length > 1 && parts.join('|') !== [...parts].sort((a, b) => a.localeCompare(b)).join('|')) add(g.index, g.index + g[0].length, 'order', 'APA orders works in one citation alphabetically by first author: (Adams, 2019; Brown, 2020).');
    }
  }
  // Narrative citations
  if (style !== 'apa') for (const m of text.matchAll(new RegExp('(' + NAME + ')\\s&\\s(' + NAME + ')\\s\\(', 'g')))
    add(m.index + m[1].length + 1, m.index + m[1].length + 2, 'ampnarr', 'Write "and", not "&": Smith and Jones.', ['and']);
  if (style === 'apa') for (const m of text.matchAll(new RegExp('(' + NAME + ')\\s&\\s(' + NAME + ')\\s\\((' + YEAR + ')', 'g')))
    add(m.index + m[1].length + 1, m.index + m[1].length + 2, 'ampnarr', 'In running text APA writes "and": Smith and Jones (2020).', ['and']);
  if (style === 'apa' || style === 'chicago') for (const m of text.matchAll(new RegExp('(' + NAME + '),\\s(' + NAME + '),?\\sand\\s(' + NAME + ')\\s\\((' + YEAR + ')', 'g')))
    add(m.index, m.index + m[1].length + m[2].length + m[3].length + 8, 'etal3', 'Three or more authors: give the first author and "et al.": ' + m[1] + ' et al. (' + m[4] + ').', [m[1] + ' et al.']);
  for (const m of text.matchAll(/\bet\.\s?al\.?|\bet al(?![.\w])/g)) add(m.index, m.index + m[0].length, 'etal', 'Write "et al." (no period after "et").', ['et al.']);
  // Citations with no entry in the list
  if (idx && idx.hasRefs) {
    const listed = new Set(idx.entries.map(e => listedKey(e, style)));
    for (const g of parens) for (let part of g[1].split(';')) {
      part = part.replace(/^\s*(?:e\.g\.,?|see also|see|cf\.|also)\s+/i, '');
      if (/personal communication|pers\.? comm|Figure|Fig\.|Table/i.test(part)) continue;
      const m = style === 'mla' ? part.match(new RegExp('^\\s*(' + NAME + ')')) : part.match(new RegExp('^\\s*(' + NAME + ')[^()]*?(' + YEAR + '|n\\.d\\.)'));
      if (!m || (style === 'mla' && !/\d/.test(part))) continue;
      const k = style === 'mla' ? first(m[1]) : first(m[1]) + ' ' + m[2];
      if (!listed.has(k)) { const s = g.index + 1 + g[1].indexOf(part.trim()); add(s, s + part.trim().length, 'missing', 'No matching entry in ' + (style === 'mla' ? 'Works Cited' : 'References') + ' for this citation.'); }
    }
  }
  if (idx && idx.hasRefs && style !== 'mla') {
    const listed = new Set(idx.entries.map(e => listedKey(e, style)));
    for (const m of text.matchAll(new RegExp('(' + NAME + ')(?:\\s(?:and|&)\\s' + NAME + '|\\set al\\.)?\\s\\((' + YEAR + '|n\\.d\\.)[^)]*\\)', 'g')))
      if (!listed.has(first(m[1]) + ' ' + m[2])) add(m.index, m.index + m[0].length, 'missing', 'No matching entry in References for ' + m[1] + ' ' + m[2] + '.');
  }
  return out;
}

function checkRef(t, idx, style, add) {
  const ent = idx.entries.find(e => e.line === t.trim());
  if (ent) { const cited = citedKeys(idx.body, style); if (!cited.has(listedKey(ent, style))) add(0, Math.min(t.length, ent.surname.length + 2), 'uncited', 'This entry is not cited in the text.'); }
  if (/^(?:—{2,}|-{3,}|_{3,})\.?/.test(t) && style === 'chicago') add(0, t.match(/^(?:—{2,}|-{3,}|_{3,})\.?/)[0].length, 'emdash', 'Chicago 18 prefers repeating the author\'s name instead of a 3-em dash.');
  for (const v of t.matchAll(/\bdoi:\s?(10\.\S+)/gi)) if (style !== 'mla') add(v.index, v.index + v[0].length, 'doi', 'Give the DOI as a link: https://doi.org/' + v[1], ['https://doi.org/' + v[1]]);
  for (const v of t.matchAll(/\b(\d+)\s?[-–]\s?(\d+)\b/g)) if (/-/.test(v[0]) && style !== 'mla' && +v[1] < +v[2] + 10000 && !/doi|https?:/i.test(t.slice(Math.max(0, v.index - 30), v.index))) add(v.index, v.index + v[0].length, 'dash', 'Use an en dash in page ranges: ' + v[1] + '–' + v[2] + '.', [v[1] + '–' + v[2]]);
  if (style === 'chicago') {
    const y = t.match(new RegExp('^[^.]+?\\.\\s(' + YEAR + ')(?!\\.)\\s'));
    if (y) { const k = y.index + y[0].length - 1 - y[1].length; add(k, k + y[1].length, 'yearperiod', 'Chicago author-date: a period after the year (Smith, John. 2020. Title.).', [y[1] + '.']); }
    const p = t.match(new RegExp('\\((' + YEAR + ')\\)\\.'));
    if (p) add(p.index, p.index + p[0].length, 'yearparen', 'Chicago author-date: the year follows the author without parentheses: Smith, John. 2020.', [p[1] + '.']);
    for (const v of t.matchAll(/\b(\d+)\s?\((\d+)\)\s?[:,]\s?(\d+[–-]\d+)/g)) add(v.index, v.index + v[0].length, 'journal', 'Chicago journal volume and issue: 12, no. 3: 45–67.', [v[1] + ', no. ' + v[2] + ': ' + v[3].replace('-', '–')]);
    for (const v of t.matchAll(/\bvol\.\s?(\d+),\s?no\.\s?(\d+),\s?(?:pp\.\s?)?(\d+[–-]\d+)/gi)) add(v.index, v.index + v[0].length, 'journal', 'Chicago journal volume and issue: 12, no. 3: 45–67.', [v[1] + ', no. ' + v[2] + ': ' + v[3].replace('-', '–')]);
  } else if (style === 'apa') {
    const head = t.match(/^[^(]{0,300}?(?=\(|\d{4})/);
    const yr = t.match(new RegExp('\\((' + YEAR + '|n\\.d\\.)(?:,[^)]*)?\\)\\.'));
    if (!yr) { const y2 = t.match(new RegExp('(?<=\\.\\s)(' + YEAR + ')\\.')); if (y2) add(y2.index, y2.index + y2[0].length, 'year', 'APA puts the year in parentheses after the authors: Smith, J. (2020).', ['(' + y2[1] + ').']); }
    const authorPart = yr ? t.slice(0, yr.index) : (head ? head[0] : '');
    const full = authorPart.match(new RegExp('^(' + NAME + '),\\s(' + NAME + ')(?=[\\s,.])'));
    if (full && full[2].length > 2) add(full[1].length + 2, full[1].length + 2 + full[2].length, 'initials', 'APA references use initials for first names: ' + full[1] + ', ' + full[2][0] + '.', [full[2][0] + '.']);
    const and = authorPart.search(/,?\s+and\s+[A-Z]/);
    if (and >= 0) { const k = authorPart.indexOf('and', and); add(k, k + 3, 'refamp', 'APA references join the last two authors with "&".', ['&']); }
    for (const v of t.matchAll(/\b(\d+)\s?\((\d+)\)\s?:\s?(\d+[–-]\d+)/g)) add(v.index, v.index + v[0].length, 'journal', 'APA journal volume, issue and pages: 12(3), 45–67.', [v[1] + '(' + v[2] + '), ' + v[3].replace('-', '–')]);
    for (const v of t.matchAll(/\bvol\.\s?(\d+),\s?no\.\s?(\d+),\s?(?:pp\.\s?)?(\d+[–-]\d+)/gi)) add(v.index, v.index + v[0].length, 'journal', 'APA journal volume, issue and pages: 12(3), 45–67.', [v[1] + '(' + v[2] + '), ' + v[3].replace('-', '–')]);
    for (const v of t.matchAll(/\bRetrieved from\s+/g)) add(v.index, v.index + v[0].length, 'retrieved', 'APA 7 drops "Retrieved from" before URLs.', ['']);
  } else if (style === 'mla') {
    const y = t.match(new RegExp('^[^.]+?\\.\\s\\(?(' + YEAR + ')\\)?\\.\\s'));
    if (y) add(y.index + y[0].length - y[1].length - 2 - (/\(/.test(y[0]) ? 2 : 0), y.index + y[0].length, 'year', 'MLA puts the date near the end, after the container: Smith, John. "Title." Journal, vol. 12, no. 3, 2020, pp. 45–67.', []);
    for (const v of t.matchAll(/\b(\d+)\s?\((\d+)\)\s?[:,]\s?(\d+[–-]\d+)/g)) add(v.index, v.index + v[0].length, 'journal', 'MLA journal details: vol. 12, no. 3, ..., pp. 45-67.', ['vol. ' + v[1] + ', no. ' + v[2] + ', pp. ' + v[3]]);
    const seg = t.split(/\.\s+["“]/)[0];
    const auth = /\band\b/.test(seg) && (seg.match(/,/g) || []).length >= 3 && !/et al\./.test(seg) ? [seg] : null;
    if (auth) add(0, auth[0].length, 'etal', 'MLA lists one author followed by "et al." when there are three or more: Smith, John, et al.');
    if (/&/.test(t.split('.')[0])) { const k = t.indexOf('&'); add(k, k + 1, 'refamp', 'MLA uses "and" between authors.', ['and']); }
  }
}
