// NEPA Plain Writer - citations and dates in SAA style (SAA Style Guide, revised December 2023; the user's default).
const G = 'SAA Style Guide (Dec 2023) ';
const LABS = 'Beta|UGAMS|AA|OxA|UCIAMS|CAMS|ISGS|WSU|GX|NZA|D-AMS|PSUAMS|SUERC|KIA|Poz|CAIS|ETH|LuS|Ua|TO|Wk|ICA|DirectAMS|UOC|BGS';
const STATES = {AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
const REF_HEAD = /^\s*(?:References Cited|References|Literature Cited|Bibliography|Works Cited)\s*$/im;
// A reference-list entry: "Surname, First ... Year." at the start of a paragraph.
const REF_ENTRY = /^([A-Z][A-Za-zÀ-ÿ'’ -]*?),\s+[A-Z][^\n]{0,200}?\b(1[6-9]\d\d|20\d\d)([a-z]?)(\.|\s)/;

const first = s => s.trim().split(/[\s,]+/)[0].toLowerCase().replace(/[’']/g, "'");

// Build the document-wide index: which works are cited, which are listed.
export function isReferenceEntry(text, idx) { return REF_ENTRY.test(text) && (!idx || idx.hasRefs); }

export function buildCiteIndex(docText) {
  const cited = new Set(), listed = new Set();
  const hasRefs = REF_HEAD.test(docText);
  let body = docText, refs = '';
  const h = docText.match(REF_HEAD);
  if (h) { body = docText.slice(0, h.index); refs = docText.slice(h.index); }
  for (const g of body.matchAll(/\(([^()]*\d{4}[^()]*)\)/g)) for (const part of g[1].split(';')) {
    const m = part.replace(/^\s*(?:e\.g\.,?|see|cf\.|also)\s+/i, '').match(/^\s*([A-Z][^\d()]*?)\s+((?:1[6-9]|20)\d\d[a-z]?)/);
    if (m) for (const y of part.matchAll(/((?:1[6-9]|20)\d\d[a-z]?)/g)) cited.add(first(m[1]) + ' ' + y[1]);
  }
  for (const m of body.matchAll(/([A-Z][A-Za-zÀ-ÿ'’-]+)(?:\s(?:and|&)\s[A-Z][A-Za-zÀ-ÿ'’-]+|\set al\.|\sand (?:others|colleagues))?\s\(((?:1[6-9]|20)\d\d[a-z]?)/g)) cited.add(first(m[1]) + ' ' + m[2]);
  for (const line of refs.split(/\r?\n/)) { const m = line.match(REF_ENTRY); if (m) listed.add(first(m[1]) + ' ' + m[2] + m[3]); }
  return {cited, listed, hasRefs};
}

export function checkSaa(text, opts = {}) {
  const out = [];
  const WIDE = new Set(['order', 'perscomm', 'c14report']);
  const add = (s, e, rule, msg, reps = [], sec = '') => out.push({start: s, end: e, kind: 'cite', rule: 'saa:' + rule, scope: 'word', wide: WIDE.has(rule), problem: text.slice(s, e),
    message: msg, source: G + sec, fixes: reps.map(r => ({label: r, start: s, end: e, text: r}))});
  const idx = opts.citeIndex;
  const isRef = isReferenceEntry(text, idx);

  if (!isRef) {
    // ---- in-text citations (3.4) ----
    for (const m of text.matchAll(/\(([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s(?:and|&)\s[A-Z][A-Za-zÀ-ÿ'’-]+|\set al\.)?),\s((?:1[6-9]|20)\d\d[a-z]?)/g))
      add(m.index + 1, m.index + m[0].length, 'comma', 'No comma between author and year: (Wylie 1991).', [m[1] + ' ' + m[2]], '§3.4.1');
    for (const m of text.matchAll(/\(([^()]*?)\s&\s([^()]*?\d{4})/g)) { const s = m.index + 1 + m[1].length + 1; add(s, s + 1, 'amp', 'Use "and", not "&", in citations: (Lipe and Varien 1999).', ['and'], '§3.4.2'); }
    for (const m of text.matchAll(/\bet\.\s?al\.?|\bet al(?![.\w])/g)) add(m.index, m.index + m[0].length, 'etal', 'Write "et al." (no period after "et"; a period after "al").', ['et al.'], '§3.4.3');
    // Latin abbreviations belong inside parentheses only.
    let depth = 0; const inParen = new Array(text.length).fill(false);
    for (let i = 0; i < text.length; i++) { if (text[i] === '(' || text[i] === '[') depth++; inParen[i] = depth > 0; if ((text[i] === ')' || text[i] === ']') && depth > 0) depth--; }
    const LATIN = [[/\bet al\./g, ['and colleagues', 'and others']], [/\be\.g\.,?/g, ['for example,']], [/\bi\.e\.,?/g, ['that is,']], [/\betc\./g, ['and so on']], [/\bcf\./g, ['compare']], [/\bviz\./g, ['namely']]];
    for (const [re, reps] of LATIN) for (const m of text.matchAll(re)) if (!inParen[m.index])
      add(m.index, m.index + m[0].length, 'latin', '"' + m[0].replace(/,$/, '') + '" belongs only inside parentheses in SAA style. In running text, write it out.', reps, '§3.4.3 note 2');
    // Pages, figures, tables (3.4.9)
    for (const m of text.matchAll(/(\b(?:1[6-9]|20)\d\d[a-z]?)(?::\s+|,\s*pp?\.\s*|\s+pp?\.\s*)(\d)/g))
      add(m.index, m.index + m[0].length, 'pages', 'Use a colon with no space between year and page: (Smith 1977:3).', [m[1] + ':' + m[2]], '§3.4.9');
    for (const m of text.matchAll(/(\b(?:1[6-9]|20)\d\d[a-z]?):(?:fig\.|figs?\.|Fig\.|tab\.|Tab\.|pl\.)\s?(\d+)/g))
      add(m.index, m.index + m[0].length, 'figure', 'Spell out and capitalize Figure, Table, Plate: (Jones and Wilson 1971:Figure 2).', [], '§3.4.9');
    for (const m of text.matchAll(/\b(?:ff\.|passim)/g)) add(m.index, m.index + m[0].length, 'ff', 'Do not use "ff." or "passim"; give the full page range.', [], '§3.4.9');
    for (const m of text.matchAll(/\((?:[^()]*?)\b(n\.\s?d\.|in press|forthcoming)\)/gi)) {
      const s = m.index + m[0].length - 1 - m[1].length; add(s, s + m[1].length, 'nd', 'Everything has a date: never "n.d." or "in press" in citations. Give the year written, submitted or expected.', [], '§3.4.11'); }
    // Citation strings in alphabetical order (3.4.4)
    for (const g of text.matchAll(/\(([^()]*\d{4}[^()]*;[^()]*)\)/g)) {
      const parts = g[1].replace(/^\s*(?:e\.g\.,?|see)\s+/i, '').split(';').map(p => p.trim().toLowerCase());
      const sorted = [...parts].sort((a, b) => a.localeCompare(b));
      if (parts.join('|') !== sorted.join('|')) add(g.index, g.index + g[0].length, 'order', 'Order works alphabetically by author within a citation string: (Ashmore 1986; Coe 1965; Fox 1987, 1991).', [], '§3.4.4');
    }
    // Personal communication (3.4.16)
    for (const m of text.matchAll(/\((?:[^()]*?)\b(pers\.?\s?comm\.?|personal communication)\b([^()]*)\)/gi)) {
      const inner = m[0];
      const named = /[A-Z][a-z]+\s+[A-Z][A-Za-z'’-]+.*personal communication|[A-Z][a-z]+\s+[A-Z][A-Za-z'’-]+,?\s+(?:pers|personal)/.test(inner);
      const year = /(?:1[6-9]|20)\d\d/.test(inner);
      if (!named || !year || /pers\.?\s?comm/i.test(inner))
        add(m.index, m.index + m[0].length, 'perscomm', 'Personal communication: give full name and year, e.g. (Katharina Schreiber, personal communication 1990), and get written permission from the person. Not listed in References Cited.', [], '§3.4.16');
    }
    // Cited but not listed
    if (idx && idx.hasRefs) for (const g of text.matchAll(/\(([^()]*\d{4}[^()]*)\)/g)) for (const part of g[1].split(';')) {
      const m = part.replace(/^\s*(?:e\.g\.,?|see|cf\.|also)\s+/i, '').match(/^\s*([A-Z][^\d()]*?)\s+((?:1[6-9]|20)\d\d[a-z]?)/);
      if (!m || /personal communication|pers\.? comm/i.test(part)) continue;
      const k = first(m[1]) + ' ' + m[2];
      if (!idx.listed.has(k)) { const s = g.index + 1 + g[1].indexOf(part.trim()); add(s, s + part.trim().length, 'missing', 'This citation has no matching entry in References Cited (' + m[1].trim() + ' ' + m[2] + ').', [], '§3.12'); }
    }
  } else {
    // ---- reference-list entry (3.12) ----
    const m = text.match(REF_ENTRY);
    if (m && idx && idx.hasRefs && !idx.cited.has(first(m[1]) + ' ' + m[2] + m[3]))
      add(0, Math.min(text.length, m[1].length), 'uncited', 'This reference is not cited in the text. Every entry must be cited (except personal communications and primary sources).', [], '§3.12');
    const y = text.match(/\b(1[6-9]\d\d|20\d\d)([a-z]?)(?!\.)(?=\s)/);
    if (y && y.index < 220) add(y.index, y.index + y[0].length, 'yearperiod', 'SAA 2023 puts a period after the year: Joyce, Rosemary. 2000. Title.', [y[0] + '.'], '§3.12.1');
    const ini = text.match(/^[A-Z][A-Za-zÀ-ÿ'’ -]*?,\s+([A-Z]\.(?:\s?[A-Z]\.)*)\s/);
    if (ini) add(text.indexOf(ini[1]), text.indexOf(ini[1]) + ini[1].length, 'initials', 'Use the full first name and middle initial as on the title page (initials only for authors known by initials).', [], '§3.12');
    for (const v of text.matchAll(/\b(?:[Vv]ol\.\s?(\d+),?\s*(?:[Nn]o\.|[Ii]ssue)\s?(\d+),?\s*(?:pp?\.\s?)?(\d+)\s*[-–]\s*(\d+))/g))
      add(v.index, v.index + v[0].length, 'journal', 'Journal volume, issue and pages: 38(1):90–100.', [v[1] + '(' + v[2] + '):' + v[3] + '–' + v[4]], '§3.12.9');
    for (const v of text.matchAll(/\b(\d+)\((\d+)\),\s?(\d+)\s*[-–]\s*(\d+)/g))
      add(v.index, v.index + v[0].length, 'journal', 'Journal volume, issue and pages: 38(1):90–100 (colon, no space).', [v[1] + '(' + v[2] + '):' + v[3] + '–' + v[4]], '§3.12.9');
    for (const v of text.matchAll(/\bet al\./g)) add(v.index, v.index + v[0].length, 'refetal', 'List all authors in References Cited (up to 10; if more than 10, the first seven then et al.).', [], '§3.12.2');
    for (const v of text.matchAll(/,?\s(?:Inc\.|Publishers|Publishing Company|and Company|Publishing)(?=[,.])/g)) add(v.index, v.index + v[0].length, 'publisher', 'Drop "Inc.", "Publishers", "Publishing Company" and similar from the publisher name.', [''], '§3.12');
    for (const v of text.matchAll(/,\s([A-Z]{2})\.?\s*$/g)) if (STATES[v[1]]) add(v.index + 2, v.index + v[0].length, 'state', 'Spell out the state (no postal abbreviations): ' + STATES[v[1]] + '.', [STATES[v[1]] + '.'], '§3.12');
  }
  // ---- page ranges anywhere (3.4.9): full digits, en dash ----
  for (const m of text.matchAll(/(?<![\d,.])(\d{2,4})[-–](\d{1,3})(?![\d,.])/g)) {
    const a = m[1], b = m[2];
    if (b.length < a.length && +(a.slice(0, a.length - b.length) + b) > +a && !/cal|BP|AD|BC|±/.test(text.slice(Math.max(0, m.index - 12), m.index + m[0].length + 8)))
      add(m.index, m.index + m[0].length, 'range', 'Give full page numbers in ranges: 312–315, not 312–15.', [a + '–' + a.slice(0, a.length - b.length) + b], '§3.4.9');
  }
  // ---- radiocarbon conventions (3.3.5) ----
  for (const m of text.matchAll(/\bC-?14\b/g)) add(m.index, m.index + m[0].length, 'c14', 'Write 14C (superscript 14), not C-14 or C14.', ['14C'], '§3.3.5');
  for (const m of text.matchAll(/\b(BCE|CE)\b(?!\w)/g)) if (/\d\s*$/.test(text.slice(0, m.index)) || /^\s*\d/.test(text.slice(m.index + m[0].length)))
    add(m.index, m.index + m[0].length, 'ce', 'SAA journals use AD/BC (cal AD, cal BC), not CE/BCE.', [m[1] === 'CE' ? 'AD' : 'BC'], '§3.3.5');
  for (const m of text.matchAll(/\b(\d{3,4})\s+AD\b/g)) add(m.index, m.index + m[0].length, 'ad', 'AD goes before the number: AD 1067.', ['AD ' + m[1]], '§3.3.5');
  for (const m of text.matchAll(/\b(?:CalBP|calBP|Cal BP|cal\.\s?BP|cal\s?B\.P\.|cal\.?\s?yrs\.?\s?BP|cal\.\s?yr\.?\s?BP|BP\s?cal|AD\s?cal|BC\s?cal)\b/g)) {
    const r = /AD/.test(m[0]) ? 'cal AD' : /BC/.test(m[0]) ? 'cal BC' : 'cal BP';
    add(m.index, m.index + m[0].length, 'cal', 'Calibrated dates: "' + r + '" (note the placement of cal and the punctuation).', [r], '§3.3.5');
  }
  for (const m of text.matchAll(/\b(\d),(\d{3})\s*±/g)) add(m.index, m.index + m[0].length - 1, 'comma4', 'Four-digit radiocarbon ages have no comma: 3680 ± 60 BP.', [m[1] + m[2] + ' '], '§3.3.5');
  for (const m of text.matchAll(/\b(\d{2})(\d{3})\s*±/g)) add(m.index, m.index + m[0].length - 1, 'comma5', 'Five-digit radiocarbon ages take a comma: 10,450 ± 50 BP.', [m[1] + ',' + m[2] + ' '], '§3.3.5');
  for (const m of text.matchAll(new RegExp('\\b(' + LABS + ')\\s?(\\d{3,7})\\b', 'g'))) if (!/-/.test(m[0]) && /\d/.test(m[2]))
    add(m.index, m.index + m[0].length, 'labid', 'Lab numbers take a hyphen: ' + m[1] + '-' + m[2] + '.', [m[1] + '-' + m[2]], '§3.3.5');
  for (const m of text.matchAll(/\b(\d{1,2},?\d{3})\s+(?:14C\s+yr\s+|RCYBP|rcybp|BP)\b/g)) {
    if (/cal\s*$/.test(text.slice(0, m.index + m[1].length + 1)) || /±\s*\d+\s*$/.test(text.slice(0, m.index + m[0].length))) continue;
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
    if (/^\s*\(/.test(after) && /[A-Z]{1,6}-\d/.test(after)) continue;
    if (/cal\s+$/.test(text.slice(Math.max(0, m.index - 5), m.index))) continue;
    add(m.index, m.index + m[0].length, 'c14report', 'If this is a radiocarbon age reported here for the first time, give the 1σ error, lab number, material and δ13C: 3680 ± 60 BP (Beta-3964; wood charcoal; δ13C = −23.8‰).', [], '§3.3.5');
  }
  return out;
}
