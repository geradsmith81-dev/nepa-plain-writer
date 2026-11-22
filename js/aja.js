// NEPA Plain Writer - Alaska Journal of Anthropology style (AJA Style Guide, vol. 16, no. 1, 2018, pp. 113-123).
// Chicago author-date in-text citations; references as "Author line" then "Year Title". Used instead of SAA, not with it.
const G = 'AJA Style Guide (2018) ';
const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine'];
const TENS_WORDS = {ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19, twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90, hundred:100};
const ORD = {1:'first',2:'second',3:'third',4:'fourth',5:'fifth',6:'sixth',7:'seventh',8:'eighth',9:'ninth',10:'tenth',11:'eleventh',12:'twelfth',13:'thirteenth',14:'fourteenth',15:'fifteenth',16:'sixteenth',17:'seventeenth',18:'eighteenth',19:'nineteenth',20:'twentieth',21:'twenty-first'};
const UNITS = 'mm|cm|m|km|ha|g|kg|mg|ml|l|L|cal|yr|yrs|ka|ma|kyr|°C|°|%|m2|m3|m²|m³|sq|ft|mi|in|lb|lbs|mph|kph|dpi|pt';
const LABELS = '(?:Fig|Figs|Unit|Units|Level|Levels|Feature|Features|Locus|Loci|Stratum|Strata|Component|Components|Phase|Phases|Area|Areas|Block|Blocks|Test Pit|TP|Trench|Square|Zone|Zones|Layer|Layers|Fig\\.|Figs\\.|Figure|Figures|Table|Tables|Plate|Plates|Appendix|Chapter|Chapters|Section|Sections|No\\.|no\\.|Vol\\.|vol\\.|pp\\.|p\\.|n|Loc\\.|Site|Sites|Element|Specimen|Sample|Samples|Burial|Burials|Hearth|Hearths|House|Houses|Pit|Pits|Box|Bag|Lot|Catalog|Cat\\.|Station|Transect|Grid|Quad|Quadrant|Profile|Core|Cores|Episode|Occupation|Horizon|Event|Model|Step|Steps|Round|Season|Week|Day|Days|Group|Type|Types|Class|Cluster)';
const IMPERIAL = /\b(\d[\d,.]*)\s*(miles?|mi\.?|feet|foot|ft\.?|inches|inch|in\.|yards?|yds?\.?|acres?|pounds?|lbs?\.?|ounces?|oz\.?|gallons?|square miles|sq\.? mi\.?)(?![\w])/gi;
const METRIC_WORDS = /\b(\d[\d,.]*)\s*(kilometers?|kilometres?|meters?|metres?|centimeters?|centimetres?|millimeters?|millimetres?|hectares?|kilograms?|grams?)\b/gi;
const METRIC_ABBR = {kilometer:'km', kilometre:'km', meter:'m', metre:'m', centimeter:'cm', centimetre:'cm', millimeter:'mm', millimetre:'mm', hectare:'ha', kilogram:'kg', gram:'g'};
const REF_HEAD = /^\s*(?:References Cited|References|Literature Cited|Bibliography|Works Cited)\s*$/im;
const AUTHOR_LINE = /^([A-Z][A-Za-zÀ-ÿ'’ -]*?),\s+[A-Z][^\n]{0,160}$/;        // "Cruikshank, Julie" or "Ganley, Matt L., and Polly C. Wheeler"
const YEAR_LINE = /^(?:\[(1[5-9]\d\d|20\d\d)\]\s+)?(1[5-9]\d\d|20\d\d|n\.d\.)([a-z]?)\s+\S/;   // "1992 Images ..." "[1899] 1983 The Eskimo ..."
const first = s => s.trim().split(/[\s,]+/)[0].toLowerCase().replace(/[’']/g, "'");

// Document index: reference lines, listed works, cited works.
export function buildAjaIndex(docText) {
  const lines = docText.split(/\r?\n/).map(l => l.trim());
  const h = lines.findIndex(l => REF_HEAD.test(l));
  const refLines = new Set(), listed = new Set(), cited = new Set(), entries = [];
  if (h >= 0) {
    let author = null;
    for (const l of lines.slice(h + 1)) {
      if (!l) continue;
      if (/^(?:APPENDIX|Appendix|TABLES?|FIGURES?|Figure Captions|ENDNOTES|NOTES)\b/.test(l)) break;
      refLines.add(l);
      const y = l.match(YEAR_LINE);
      const one = l.match(/^([A-Z][A-Za-zÀ-ÿ'’ -]*?),\s+[^\n]*?\s((?:1[5-9]|20)\d\d)([a-z]?)\.?\s/);   // whole entry on one line
      if (y && author) { const k = author + ' ' + y[2] + y[3]; listed.add(k); if (y[1]) listed.add(author + ' ' + y[1]); entries.push({line: l, key: k}); }
      else if (AUTHOR_LINE.test(l) && !/\b(?:1[5-9]|20)\d\d\b/.test(l)) author = first(l);
      else if (one) { author = first(one[1]); const k = author + ' ' + one[2] + one[3]; listed.add(k); entries.push({line: l, key: k, oneLine: true}); }
    }
  }
  const body = h >= 0 ? lines.slice(0, h).join('\n') : docText;
  for (const g of body.matchAll(/\(([^()]*\d{4}[^()]*)\)/g)) for (const part of g[1].split(';')) {
    const m = part.replace(/^\s*(?:e\.g\.,?|see|cf\.|also)\s+/i, '').match(/^\s*([A-Z][^\d()]*?)\s+(?:\[\d{4}\]\s+)?((?:1[5-9]|20)\d\d[a-z]?)(?!\d)/);
    if (m) for (const y of part.matchAll(/((?:1[5-9]|20)\d\d[a-z]?)/g)) cited.add(first(m[1]) + ' ' + y[1]);
  }
  for (const m of body.matchAll(/([A-Z][A-Za-zÀ-ÿ'’-]+)(?:\s(?:and|&)\s[A-Z][A-Za-zÀ-ÿ'’-]+|\set al\.)?\s\((?:\[\d{4}\]\s+)?((?:1[5-9]|20)\d\d[a-z]?)/g)) cited.add(first(m[1]) + ' ' + m[2]);
  return {hasRefs: h >= 0, refLines, listed, cited, entries};
}
export function isAjaRef(text, idx) { return !!idx && idx.refLines.has(text.trim()); }

export function checkAja(text, opts = {}) {
  const out = [];
  const WIDE = new Set(['order', 'perscomm', 'oldfig', 'missing', 'metric']);
  const add = (s, e, rule, msg, reps = [], sec = '') => out.push({start: s, end: e, kind: 'aja', rule: 'aja:' + rule, scope: 'word', wide: WIDE.has(rule), problem: text.slice(s, e),
    message: msg, source: G + sec, fixes: reps.map(r => ({label: r === '' ? 'Delete "' + text.slice(s, e) + '"' : r, start: s, end: e, text: r}))});
  const idx = opts.ajaIndex;
  if (isAjaRef(text, idx)) {
    // ---- References ----
    const t = text;
    const yl = t.match(YEAR_LINE);
    const yp = t.match(/^((?:\[\d{4}\]\s+)?(?:1[5-9]\d\d|20\d\d)[a-z]?)\.\s/);
    if (yp) add(0, yp[0].length, 'refyear', 'AJA puts no period after the year: "1992 Images of Society ..." (author name on the line above).', [yp[1] + ' '], 'References');
    const one = t.match(/^([A-Z][A-Za-zÀ-ÿ'’ -]*?,\s+[^\n]*?)[.,]?\s+((?:1[5-9]|20)\d\d[a-z]?)[.,]?\s/);
    if (!yl && one && !AUTHOR_LINE.test(t.replace(/\s+\S+$/, ''))) add(0, one[0].length, 'refline', 'AJA layout: author name(s) on its own line, then the year and title on the next line, e.g. "Cruikshank, Julie" / "1992 Images of Society ...".', [], 'References');
    for (const v of t.matchAll(/\b(?:[Vv]ol\.\s?(\d+),?\s*(?:[Nn]o\.|[Ii]ssue)\s?(\d+),?\s*(?:pp?\.\s?)?(\d+)\s*[-–]\s*(\d+))/g))
      add(v.index, v.index + v[0].length, 'journal', 'Journal volume, issue and pages: 39(1):20–41. Always give the issue.', [v[1] + '(' + v[2] + '):' + v[3] + '–' + v[4]], 'Journal article');
    for (const v of t.matchAll(/\b(\d+)\((\d+)\),\s?(\d+)\s*[-–]\s*(\d+)/g)) add(v.index, v.index + v[0].length, 'journal', 'Journal pages follow a colon with no space: 39(1):20–41.', [v[1] + '(' + v[2] + '):' + v[3] + '–' + v[4]], 'Journal article');
    for (const v of t.matchAll(/(?<=[A-Za-z)]\s?)\b(\d{1,3})\s*:\s*(\d+)\s*[-–]\s*(\d+)\b/g)) if (/^\d+\s*[-–]/.test(v[3]) === false && v[2].length > v[3].length)
      add(v.index, v.index + v[0].length, 'range', 'Use full page ranges: 20–41, not 20–4.', [], 'In-text citations');
    for (const v of t.matchAll(/\bet al\./g)) add(v.index, v.index + v[0].length, 'refetal', 'List all author names in References.', [], 'Journal article');
    for (const v of t.matchAll(/(?:accessed|retrieved)\s[^.]*\d{4}\.?/gi)) add(v.index, v.index + v[0].length, 'access', 'Website references need no access date.', [''], 'Websites');
    if (/https?:\/\//.test(t) && /\.\s*$/.test(t) && /https?:\/\/\S+\.\s*$/.test(t)) { const e = t.length; add(e - 1, e, 'urlpunct', 'No punctuation at the end of a website reference.', [''], 'Websites'); }
    // uncited reference
    if (idx && yl) { const ent = idx.entries.find(x => x.line === t.trim()); if (ent && !idx.cited.has(ent.key)) add(0, Math.min(t.length, (yl[0] || '').length + 4), 'uncited', 'This reference is not cited in the text. Every source listed must be cited, and every source cited must be listed.', [], 'Author checklist'); }
    return out;
  }
  // ---- Body text ----
  // In-text citations (Chicago author-date)
  for (const m of text.matchAll(/\(([A-Z][A-Za-zÀ-ÿ'’-]+(?:\s(?:and|&)\s[A-Z][A-Za-zÀ-ÿ'’-]+|\set al\.)?),\s((?:1[5-9]|20)\d\d[a-z]?)/g))
    add(m.index + 1, m.index + m[0].length, 'comma', 'No comma between author and year: (Nadasdy 1999).', [m[1] + ' ' + m[2]], 'In-text citations');
  for (const m of text.matchAll(/\(([^()]*?)\s&\s([^()]*?\d{4})/g)) { const s = m.index + 1 + m[1].length + 1; add(s, s + 1, 'amp', 'Use "and": (Heffner and Heffner 2012).', ['and'], 'In-text citations'); }
  for (const m of text.matchAll(/\bet\.\s?al\.?|\bet al(?![.\w])/g)) add(m.index, m.index + m[0].length, 'etal', 'Write "et al." (Stuiver et al. 2004).', ['et al.'], 'In-text citations');
  for (const m of text.matchAll(/(\b(?:1[5-9]|20)\d\d[a-z]?)(?::\s+|,\s*pp?\.\s*|\s+pp?\.\s*)(\d)/g))
    add(m.index, m.index + m[0].length, 'pages', 'No space between the colon and the page: (Larsen and Rainey 1948:26–27).', [m[1] + ':' + m[2]], 'In-text citations');
  for (const m of text.matchAll(/(?<![\d,.])(\d{2,4})[-–](\d{1,3})(?![\d,.])/g)) {
    const a = m[1], b = m[2];
    if (b.length < a.length && +(a.slice(0, a.length - b.length) + b) > +a && /:\s*$/.test(text.slice(Math.max(0, m.index - 2), m.index)))
      add(m.index, m.index + m[0].length, 'range', 'Use full page ranges: 21–24, not 21–4.', [a + '–' + a.slice(0, a.length - b.length) + b], 'In-text citations');
  }
  for (const g of text.matchAll(/\(([^()]*\d{4}[^()]*;[^()]*)\)/g)) {
    const parts = g[1].replace(/^\s*(?:e\.g\.,?|see)\s+/i, '').split(';').map(p => p.trim().toLowerCase());
    if (parts.join('|') !== [...parts].sort((a, b) => a.localeCompare(b)).join('|')) add(g.index, g.index + g[0].length, 'order', 'Put citations in alphabetical order: (Elias 2003; Oswalt 1955; Steffian and Saltonstall 2009).', [], 'In-text citations');
  }
  for (const m of text.matchAll(/\(([^()]*?)\b(personal communication|pers\.?\s?comm\.?)([^()]*)\)/gi)) {
    const inner = m[0];
    const named = /[A-Z][a-z]+\s+[A-Z][A-Za-z'’-]+/.test(m[1]);
    const fullDate = /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/.test(inner);
    if (!named || !fullDate || !/pers\. comm\./.test(inner))
      add(m.index, m.index + m[0].length, 'perscomm', 'AJA personal communication: full name, "pers. comm.", and the full date: (Alison Smith, pers. comm. 21 January 2011). Not listed in References.', [], 'Personal communication');
  }
  for (const m of text.matchAll(/\(([^()]*?(?:1[5-9]|20)\d\d[a-z]?):(?:Figure|Fig\.|Table|Plate)\s?\d+[^()]*\)/g))
    add(m.index, m.index + m[0].length, 'oldfig', 'For figures or tables in a published source, cite the page number only: (Mooney et al. 2012:32). "Figure" and "Table" are for your own manuscript.', [], 'In-text citations');
  if (idx && idx.hasRefs) for (const g of text.matchAll(/\(([^()]*\d{4}[^()]*)\)/g)) for (const part of g[1].split(';')) {
    if (/pers\.? comm|personal communication|Fig\.?\s|Figure|Table|^\s*(?:Beta|UGAMS|AA|OxA|UCIAMS|CAMS|ISGS|WSU|GX|NZA|D-AMS|PSUAMS|SUERC|Poz|ETH|Wk|ICA|UOC)\b|δ13C|±/i.test(part)) continue;
    const m = part.replace(/^\s*(?:e\.g\.,?|see|cf\.|also)\s+/i, '').match(/^\s*([A-Z][^\d()]*?)\s+(?:\[\d{4}\]\s+)?((?:1[5-9]|20)\d\d[a-z]?)(?!\d)/);
    if (!m) continue;
    const k = first(m[1]) + ' ' + m[2];
    if (!idx.listed.has(k)) { const s = g.index + 1 + g[1].indexOf(part.trim()); add(s, s + part.trim().length, 'missing', 'No matching entry in References for ' + m[1].trim() + ' ' + m[2] + '.', [], 'Author checklist'); }
  }
  if (idx && idx.hasRefs) for (const m of text.matchAll(/([A-Z][A-Za-zÀ-ÿ'’-]+)(?:\s(?:and|&)\s[A-Z][A-Za-zÀ-ÿ'’-]+|\set al\.)?\s\((?:\[\d{4}\]\s+)?((?:1[5-9]|20)\d\d[a-z]?)(?!\d)[^)]*\)/g)) {
    if (!idx.listed.has(first(m[1]) + ' ' + m[2])) add(m.index, m.index + m[0].length, 'missing', 'No matching entry in References for ' + m[1] + ' ' + m[2] + '.', [], 'Author checklist');
  }
  // Figure and table callouts
  for (const g of text.matchAll(/\(([^()]*)\)/g)) {
    let off = g.index + 1;
    for (const part of g[1].split(';')) {
      const lead = part.match(/^\s*(?:see\s+)?/)[0];
      const m = part.slice(lead.length).match(/^(Figures?|Figs?\.?|figs?\.?|figures?|Tab\.|Tabs?\.?|tables?|Tables?)\s+(\d+[a-z]?(?:\s*(?:,|and|–|-)\s*\d+[a-z]?)*)/);
      if (m) {
        const w = m[1]; const isTable = /^tab/i.test(w);
        const plural = /,|and|–|-/.test(m[2]);
        const want = isTable ? (plural ? 'Tables' : 'Table') : (plural ? 'Figs.' : 'Fig.');
        const s0 = off + lead.length;
        if (w !== want) add(s0, s0 + w.length, 'callout', isTable ? '"Table" is always spelled out and capitalized.' : 'Parenthetical figure callouts are abbreviated and capitalized: (Fig. 2), (Figs. 2 and 3).', [want], 'Figures');
      }
      off += part.length + 1;
    }
  }
  for (const m of text.matchAll(/(?<!\()\b(Figs?\.)\s+(\d+)/g)) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/\([^()]*$/.test(before)) continue;
    add(m.index, m.index + m[1].length, 'figtext', 'In a sentence, spell out "Figure" ("Figure 2 shows ..."); "Fig." is only for parenthetical callouts.', [m[1] === 'Figs.' ? 'Figures' : 'Figure'], 'Figures');
  }
  // Dates and radiocarbon
  for (const m of text.matchAll(/\b(A\.\s?D\.|B\.\s?C\.|B\.\s?P\.)/g)) add(m.index, m.index + m[0].length, 'dateperiod', 'No periods in AD, BC, BP or cal BP.', [m[1].replace(/[.\s]/g, '')], 'Dates');
  for (const m of text.matchAll(/\b(\d{1,4})\s+AD\b/g)) add(m.index, m.index + m[0].length, 'ad', 'AD goes before the date: AD 1532.', ['AD ' + m[1]], 'Dates');
  for (const m of text.matchAll(/\bBC\s+(\d{1,5})\b/g)) add(m.index, m.index + m[0].length, 'bc', 'BC goes after the date: 62 BC.', [m[1] + ' BC'], 'Dates');
  for (const m of text.matchAll(/\b(?:CalBP|calBP|Cal BP|cal\.\s?BP|cal\s?B\.P\.|cal\.?\s?yrs\.?\s?BP|BP\s?cal)\b/g)) add(m.index, m.index + m[0].length, 'cal', 'Write "cal BP" (or cal AD / cal BC).', ['cal BP'], 'Radiocarbon dates');
  for (const m of text.matchAll(/\bC-?14\b/g)) add(m.index, m.index + m[0].length, 'c14', 'Write 14C (superscript 14).', ['14C'], 'Radiocarbon dates');
  for (const m of text.matchAll(/(\d{3,6}\s*±\s*\d+)\s*(?:B\.?P\.?|yr BP|years BP|RCYBP)\b(?!\s*cal)/g)) {
    if (/cal\s*$/i.test(text.slice(Math.max(0, m.index - 5), m.index))) continue;
    const s = m.index + m[1].length; add(s, m.index + m[0].length, 'rcybp', 'AJA writes uncalibrated ages as radiocarbon years: 3680 ± 60 rcybp (Beta-20375; wood charcoal; δ13C = –22.2‰).', [' rcybp'], 'Radiocarbon dates');
  }
  for (const m of text.matchAll(/\b(Beta|UGAMS|AA|OxA|UCIAMS|CAMS|ISGS|WSU|GX|NZA|D-AMS|PSUAMS|SUERC|Poz|ETH|Wk|ICA|UOC)\s?(\d{3,7})\b/g)) if (!/-/.test(m[0]))
    add(m.index, m.index + m[0].length, 'labid', 'Lab numbers take a hyphen: ' + m[1] + '-' + m[2] + '.', [m[1] + '-' + m[2]], 'Radiocarbon dates');
  // Numbers
  const skipNum = (i, len) => {
    const before = text.slice(Math.max(0, i - 25), i), after = text.slice(i + len, i + len + 12);
    if (/[\d.,:/–-]$/.test(before) || /^[\d.,:/–%]/.test(after) || /^\s*(?:-|–)\s*\d/.test(after)) return true;
    if (new RegExp('^\\s*(?:' + UNITS + '|miles?|meters?|metres?|kilometers?|kilometres?|centimeters?|millimeters?|feet|foot|inches|yards?|acres?|hectares?|grams?|kilograms?|pounds?|percent|per cent)\\b', 'i').test(after) || /^\s*(?:a\.m\.|p\.m\.|cal|rcybp|BP|BC|AD)\b/.test(after)) return true;
    if (new RegExp(LABELS + '\\s*$').test(before) || /\(\s*$/.test(before) && /^\)/.test(after) || /(?:n|N)\s*=\s*$/.test(before)) return true;
    if (/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*$/.test(before) || /^\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(after)) return true;
    if (/(?:^|[.!?]\s+)$/.test(before)) return true;   // sentence-initial: leave to the author
    return false;
  };
  for (const m of text.matchAll(/(?<![\w.,:/–-])([1-9])(?![\w.,:/%–-])/g)) if (!skipNum(m.index, 1))
    add(m.index, m.index + 1, 'spellout', 'Spell out numbers one through nine.', [ONES[+m[1]]], 'Numbers');
  for (const m of text.matchAll(/\b(ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](one|two|three|four|five|six|seven|eight|nine))?\b(?![- ]?(?:th|first|second|third|century|centuries))/gi)) {
    const before = text.slice(Math.max(0, m.index - 3), m.index);
    if (/(?:^|[.!?]\s+)$/.test(text.slice(0, m.index))) continue;   // sentence-initial numbers stay spelled out
    if (/-$/.test(before)) continue;
    const n = TENS_WORDS[m[1].toLowerCase()] + (m[2] ? ONES.indexOf(m[2].toLowerCase()) : 0);
    add(m.index, m.index + m[0].length, 'numerals', 'Use numerals for 10 and up.', [String(n)], 'Numbers');
  }
  for (const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)([- ])(century|centuries)\b/gi)) if (ORD[+m[1]])
    add(m.index, m.index + m[0].length, 'century', 'Spell out centuries: sixteenth century.', [ORD[+m[1]] + m[2] + m[3]], 'Numbers');
  for (const m of text.matchAll(/(\d)\s*percent\b|\bper cent\b/gi)) { const s = m.index + (m[1] ? 1 : 0); add(s, m.index + m[0].length, 'percent', 'Use "%", not "percent".', ['%'], 'Numbers'); }
  for (const m of text.matchAll(/(?<![\w.,–-])(\d),(\d{3})(?![\d,])/g)) {
    if (/±\s*$/.test(text.slice(Math.max(0, m.index - 3), m.index)) || /^\s*±/.test(text.slice(m.index + m[0].length))) continue;
    add(m.index, m.index + m[0].length, 'comma4', 'No comma in four-figure numbers: 4000 (but 10,000).', [m[1] + m[2]], 'Numbers');
  }
  for (const m of text.matchAll(/(?<![\w.,–-])(\d{2,3})(\d{3})(?![\d,])/g)) {
    const before = text.slice(Math.max(0, m.index - 12), m.index);
    if (/[A-Za-z]-?\s*$/.test(before) || /(?:no\.|No\.|#|ID|Tape)\s*$/.test(before)) continue;
    add(m.index, m.index + m[0].length, 'comma5', 'Numbers of five figures or more take a comma: 10,000.', [m[1] + ',' + m[2]], 'Numbers');
  }
  for (const m of text.matchAll(/\bn\s?=(\d)|\bn=\s?(\d)/g)) add(m.index, m.index + m[0].length - 1, 'neq', 'Write "n = 785" with spaces.', ['n = '], 'Numbers');
  // Measurements
  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?)(km|cm|mm|m|kg|g|ha)\b/g)) add(m.index, m.index + m[0].length, 'unitspace', 'Leave a space between the number and the unit: 3 km.', [m[1] + ' ' + m[2]], 'Measurements');
  for (const m of text.matchAll(METRIC_WORDS)) { const u = METRIC_ABBR[m[2].toLowerCase().replace(/s$/, '')]; if (u) add(m.index, m.index + m[0].length, 'unitabbr', 'Use unit abbreviations: ' + m[1] + ' ' + u + '.', [m[1] + ' ' + u], 'Measurements'); }
  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?\s(?:km|cm|mm|m|kg|ha))\.(?=\s+[a-z(])/g)) add(m.index, m.index + m[0].length, 'unitperiod', 'No period after a unit of measure.', [m[1]], 'Measurements');
  for (const m of text.matchAll(IMPERIAL)) {
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (/\(\s*$/.test(before) && /\d\s*(?:km|m|cm|mm|ha|kg|g)\s*\($/.test(before.replace(/\s+$/, ''))) continue;   // already "3 km (1.9 mi)"
    if (/\(\s*$/.test(before)) continue;
    add(m.index, m.index + m[0].length, 'metric', 'Measurements are metric. English equivalents may follow in parentheses for Euro-American or Russian-American sites: 3 km (1.9 mi).', [], 'Measurements');
  }
  // Words and names
  for (const m of text.matchAll(/\b(ecologic|technologic|methodologic|morphologic|typologic|stratigraphic(?=al))\b(?!al)/gi)) {
    if (/^stratigraphic/i.test(m[1])) continue;
    add(m.index, m.index + m[0].length, 'ical', 'AJA prefers "' + m[1] + 'al".', [m[1] + 'al'], 'Scientific terms');
  }
  for (const m of text.matchAll(/\b(?:49-)?([A-Z]{3})-0*(\d{1,5})\b/g)) if (/^49-/.test(m[0]) || /^0/.test(m[0].split('-').pop()))
    add(m.index, m.index + m[0].length, 'ahrs', 'Shorten AHRS numbers: 49-KOD-00450 becomes KOD-450.', [m[1] + '-' + String(+m[2])], 'AHRS');
  for (const m of text.matchAll(/\b((?:[A-Z][a-z]+,\s+)+(?:and|&)\s+[A-Z][a-z]+)\s+(Rivers|Creeks|Lakes|Mountains|Islands|Valleys|Glaciers|Bays|Hills|Ranges|Sounds|Straits)\b/g)) {
    const s = m.index + m[1].length + 1; add(s, s + m[2].length, 'plurals', 'Do not capitalize a plural feature after a list of names: Susitna, Chulitna, and Talkeetna rivers.', [m[2].toLowerCase()], 'Place names');
  }
  for (const m of text.matchAll(/\b(Middle|Upper|Lower|Central|Northern|Southern|Eastern|Western)\s+(?=[A-Z][a-z]+\s+(?:Valley|River|Basin|Drainage)\b)/g))
    add(m.index, m.index + m[1].length, 'descriptor', 'AJA capitalizes place names but not descriptors: middle Tanana Valley. Keep the capital if it is part of the official name.', [m[1].toLowerCase()], 'Place names');
  for (const m of text.matchAll(/<sup>\d+<\/sup>|\[\^\d+\]/g)) add(m.index, m.index + m[0].length, 'notes', 'Endnotes go in plain text as <2>, not automatic superscripts or footnotes.', [], 'Endnotes');
  return out;
}

export const AJA_TYPES = {
  article: {label: 'Article (5000-10,000 words)', min: 5000, max: 10000},
  report: {label: 'Report (1000-5000 words)', min: 1000, max: 5000},
  essay: {label: 'Essay (3000-7000 words)', min: 3000, max: 7000},
  note: {label: 'Research note (under 1000 words)', min: 0, max: 999},
  review: {label: 'Book review (about 1000 words)', min: 700, max: 1300}
};
// Whole-document checklist (shown in the AJA panel).
export function ajaChecklist(doc, type = 'article') {
  const lines = doc.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const words = (doc.match(/\b[\w'’-]+\b/g) || []).length;
  const tp = AJA_TYPES[type] || AJA_TYPES.article;
  const absAt = lines.findIndex(l => /^abstract\s*[:.]?$/i.test(l));
  const abs = absAt >= 0 ? lines[absAt + 1] || '' : '';
  const absWords = (abs.match(/\b[\w'’-]+\b/g) || []).length;
  const heads = lines.filter(l => l.length < 80 && !/[.!?:;,]$/.test(l) && l === l.toUpperCase() && /[A-Z]{3}/.test(l));
  const ackAt = lines.findIndex(l => /^acknowledge?ments?$/i.test(l));
  const ackWords = ackAt >= 0 ? ((lines[ackAt + 1] || '').match(/\b[\w'’-]+\b/g) || []).length : 0;
  const figs = new Set([...doc.matchAll(/\b(?:Figs?\.|Figures?)\s+(\d+)(?:\s*(?:,|and|–|-)\s*(\d+))?/g)].flatMap(m => [m[1], m[2]].filter(Boolean).map(Number)));
  const tabs = new Set([...doc.matchAll(/\bTables?\s+(\d+)(?:\s*(?:,|and|–|-)\s*(\d+))?/g)].flatMap(m => [m[1], m[2]].filter(Boolean).map(Number)));
  const gap = s => { const a = [...s].sort((x, y) => x - y); const miss = []; for (let i = 1; i <= (a[a.length - 1] || 0); i++) if (!s.has(i)) miss.push(i); return miss; };
  const archaeo = /\b(?:artifacts?|excavat\w*|lithics?|faunal|assemblage|debitage|specimens?)\b/i.test(doc);
  const native = /[\wÀ-ÿ][’'][\wÀ-ÿ]|[ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïñÒÓÔÕÖòóôõöÙÚÛÜùúûüÿŷł]/.test(doc.replace(/\b\w+'s\b/g, ''));
  return [
    {label: 'Length ' + words.toLocaleString() + ' words for ' + tp.label, ok: words >= tp.min && words <= tp.max},
    {label: abs ? 'Abstract 200-250 words, no citations (now ' + absWords + ' words' + (/\(\D*\d{4}/.test(abs) ? ', has citations' : '') + ')' : 'Abstract (200-250 words) after the title page', ok: absWords >= 200 && absWords <= 250 && !/\(\D*\d{4}/.test(abs), optional: !abs && type === 'review'},
    {label: 'Text begins with the heading INTRODUCTION' + (type === 'essay' ? ' (not needed for essays)' : ''), ok: heads[0] === 'INTRODUCTION' || type === 'essay' || type === 'review', optional: type === 'essay' || type === 'review'},
    {label: 'Every figure and table called out in order' + (gap(figs).length || gap(tabs).length ? ' (missing: ' + [...gap(figs).map(n => 'Fig. ' + n), ...gap(tabs).map(n => 'Table ' + n)].join(', ') + ')' : ''), ok: !gap(figs).length && !gap(tabs).length, optional: !figs.size && !tabs.size},
    ...(archaeo ? [{label: 'Where the materials are (repository and collection, or "Private Collection", or current location in an endnote)', ok: /\b(?:repository|curated|curation|Museum|UAMN|collection|Private Collection|on file|in possession of|currently located)\b/i.test(doc)}] : []),
    ...(native ? [{label: 'Native place names: italicized, with the orthography or dictionary named', ok: /\b(?:orthograph\w*|dictionar(?:y|ies)|Alaska Native Language (?:Center|Archive)|ANLC|Kari|Jetté|Leer|Jacobson|Bergsland|MacLean)\b/i.test(doc), optional: false}] : []),
    {label: ackAt >= 0 ? 'Acknowledgements under 200 words (now ' + ackWords + ')' : 'Acknowledgements (under 200 words)', ok: ackAt >= 0 && ackWords < 200, optional: ackAt < 0}
  ];
}
