import { findPassives } from './passive.js';
// NEPA Plain Writer - concision and plain-language rules.
// Pure JavaScript, no page or Word dependencies, so the same rules run in Word, on the phone and on the desktop.
// Every issue: {start, end, kind, rule, message, source, fixes:[{label, start, end, text}], scope:'word'|'sentence'}

export const SOURCES = {
  STATUTE_CONCISE: 'NEPA statute: documents must be concise (42 U.S.C. 4336(b)(2); 4336a(e))',
  STATUTE_PAGES: 'NEPA statute page limits, 42 U.S.C. 4336a(e): EA 75 pp; EIS 150 pp (300 if extraordinarily complex), excluding citations and appendices',
  CEQ_PLAIN: 'Former CEQ rule 40 CFR 1502.8 (plain language; rescinded April 2025, still standard agency practice)',
  FPLG: 'Federal Plain Language Guidelines (plainlanguage.gov), Plain Writing Act of 2010',
  ACRONYM: 'Plain language and agency NEPA style: define each acronym at first use',
  PERSONAL: 'Your own word swaps (from your Grammarly history)'
};

export const KIND_INFO = {
  care:     {label: 'CARE (Indigenous data governance)', color: '#b88700', word: 'Berry'},
  spelling: {label: 'Spelling', color: '#d13438', word: 'Red'},
  grammar:  {label: 'Grammar', color: '#0f6cbd', word: 'Blue'},
  concise:  {label: 'Wordy (NEPA concision)', color: '#8764b8', word: 'Lavender'},
  plain:    {label: 'Plain language', color: '#107c10', word: 'Green'},
  scicomm:  {label: 'Science communication', color: '#498205', word: 'Green'},
  cite:     {label: 'Citations & dates (SAA)', color: '#005b70', word: 'Blue'},
  voice:    {label: 'My style', color: '#4f6bed', word: 'Lavender'},
  craft:    {label: 'Archaeology writing craft', color: '#8a5a2b', word: 'Lavender'},
  nepa:     {label: 'NEPA style', color: '#c239b3', word: 'Berry'},
  personal: {label: 'My word swaps', color: '#ca5010', word: 'Lavender'}
};

// [wordy phrase, [concise options], kind, note]. '' means delete the phrase.
const C = 'concise', P = 'plain';
const PHRASES = [
  ['in order to', ['to'], C], ['in order for', ['for'], C], ['so as to', ['to'], C],
  ['due to the fact that', ['because'], C], ['owing to the fact that', ['because'], C],
  ['in light of the fact that', ['because'], C], ['in view of the fact that', ['because'], C],
  ['on the grounds that', ['because'], C], ['for the reason that', ['because'], C],
  ['despite the fact that', ['although'], C], ['regardless of the fact that', ['although'], C],
  ['notwithstanding the fact that', ['although'], C], ['the reason is because', ['because'], C],
  ['the reason why', ['the reason', 'why'], C], ['at this point in time', ['now'], C],
  ['at the present time', ['now', 'currently'], C], ['at this time', ['now'], C],
  ['at that point in time', ['then'], C], ['in the near future', ['soon'], C],
  ['prior to', ['before'], C], ['subsequent to', ['after'], C], ['in advance of', ['before'], C],
  ['in the event that', ['if'], C], ['in the event of', ['if'], C], ['in the absence of', ['without'], C],
  ['for the purpose of', ['to', 'for'], C], ['for the purposes of', ['for'], C],
  ['with regard to', ['about', 'on'], C], ['with regards to', ['about', 'on'], C], ['in regard to', ['about'], C],
  ['with respect to', ['about', 'for'], C], ['in relation to', ['about'], C], ['in reference to', ['about'], C],
  ['pertaining to', ['about'], C], ['in connection with', ['about', 'with'], C],
  ['a number of', ['some', 'several'], C], ['a large number of', ['many'], C], ['a small number of', ['a few'], C],
  ['a majority of', ['most'], C], ['the majority of', ['most'], C], ['a sufficient number of', ['enough'], C],
  ['in the vicinity of', ['near'], C], ['in close proximity to', ['near'], C], ['in proximity to', ['near'], C],
  ['in close proximity', ['near'], C], ['is located in close proximity to', ['is near'], C], ['are located in close proximity to', ['are near'], C],
  ['located in close proximity to', ['near'], C], ['is located adjacent to', ['is next to', 'borders'], C], ['located adjacent to', ['next to'], C], ['close proximity', ['proximity', 'near'], C],
  ['is located in', ['is in'], C], ['are located in', ['are in'], C], ['is located on', ['is on'], C],
  ['are located on', ['are on'], C], ['is located within', ['is in', 'is within'], C], ['are located within', ['are in', 'are within'], C],
  ['on a daily basis', ['daily'], C], ['on a weekly basis', ['weekly'], C], ['on a monthly basis', ['monthly'], C],
  ['on an annual basis', ['annually', 'each year'], C], ['on a yearly basis', ['yearly'], C],
  ['on a regular basis', ['regularly'], C], ['on a seasonal basis', ['seasonally'], C],
  ['in a timely manner', ['promptly', 'on time'], C], ['in a timely fashion', ['promptly'], C],
  ['in an effort to', ['to'], C], ['in an attempt to', ['to'], C],
  ['has the ability to', ['can'], C], ['have the ability to', ['can'], C], ['has the capability to', ['can'], C],
  ['have the capability to', ['can'], C], ['is able to', ['can'], C], ['are able to', ['can'], C],
  ['has the potential to', ['could', 'may'], C], ['have the potential to', ['could', 'may'], C],
  ['there is a possibility that', ['may (rewrite)'], C], ['it is possible that', ['may (rewrite)'], C],
  ['in the amount of', ['of', 'for'], C], ['in excess of', ['more than'], C], ['in the range of', ['about'], C],
  ['as a means of', ['to'], C], ['as a result of', ['because of'], C], ['as a consequence of', ['because of'], C],
  ['at all times', ['always'], C], ['by means of', ['by'], C], ['by virtue of', ['by', 'under'], C],
  ['during the course of', ['during'], C], ['in the course of', ['during'], C], ['during the period of', ['during'], C],
  ['for a period of', ['for'], C], ['over the course of', ['during', 'over'], C],
  ['until such time as', ['until'], C], ['until such time that', ['until'], C],
  ['in the case of', ['for', 'in'], C], ['in many cases', ['often'], C], ['in most cases', ['usually'], C],
  ['in some cases', ['sometimes'], C], ['in all cases', ['always'], C], ['in terms of', ['for', 'in'], C],
  ['is dependent on', ['depends on'], C], ['is dependent upon', ['depends on'], C],
  ['are dependent on', ['depend on'], C], ['are dependent upon', ['depend on'], C],
  ['in conjunction with', ['with'], C], ['in the process of', [''], C], ['on the part of', ['by'], C],
  ['with the exception of', ['except', 'except for'], C], ['with the result that', ['so that'], C],
  ['whether or not', ['whether'], C, 'Keep "or not" only when it means "regardless of whether".'],
  ['each and every', ['each', 'every'], C], ['any and all', ['all', 'any'], C],
  ['first and foremost', ['first'], C], ['one and the same', ['the same'], C], ['null and void', ['void'], C],
  ['over and above', ['beyond'], C], ['past history', ['history'], C], ['future plans', ['plans'], C],
  ['end result', ['result'], C], ['final outcome', ['outcome'], C], ['basic fundamentals', ['fundamentals'], C],
  ['advance planning', ['planning'], C], ['advance warning', ['warning'], C], ['completely eliminate', ['eliminate'], C],
  ['completely eliminated', ['eliminated'], C], ['totally destroyed', ['destroyed'], C], ['absolutely essential', ['essential'], C],
  ['currently underway', ['underway'], C], ['new innovation', ['innovation'], C], ['joint collaboration', ['collaboration'], C],
  ['mutual cooperation', ['cooperation'], C], ['general consensus', ['consensus'], C], ['consensus of opinion', ['consensus'], C],
  ['exact same', ['same'], C], ['refer back', ['refer'], C], ['repeat again', ['repeat'], C], ['return back', ['return'], C],
  ['combine together', ['combine'], C], ['join together', ['join'], C], ['merge together', ['merge'], C],
  ['still remains', ['remains'], C], ['true facts', ['facts'], C], ['unexpected surprise', ['surprise'], C],
  ['period of time', ['period', 'time'], C], ['time period', ['period', 'time'], C],
  ['small in size', ['small'], C], ['large in size', ['large'], C], ['few in number', ['few'], C],
  ['it should be noted that', [''], C], ['it is important to note that', [''], C], ['it is worth noting that', [''], C],
  ['it is interesting to note that', [''], C], ['it must be noted that', [''], C], ['please note that', [''], C],
  ['needless to say', [''], C], ['for all intents and purposes', [''], C], ['the fact of the matter is', [''], C],
  ['what this means is that', [''], C], ['as a matter of fact', ['in fact'], C], ['as previously mentioned', [''], C],
  ['as stated above', [''], C], ['as discussed above', [''], C],
  // Hidden verbs (nominalizations)
  ['make a determination', ['determine'], P], ['makes a determination', ['determines'], P],
  ['made a determination', ['determined'], P], ['make a decision', ['decide'], P], ['made a decision', ['decided'], P],
  ['make a recommendation', ['recommend'], P], ['make an assessment of', ['assess'], P], ['make an adjustment to', ['adjust'], P],
  ['make reference to', ['refer to'], P], ['make an effort to', ['try to'], P], ['make use of', ['use'], P],
  ['conduct an analysis of', ['analyze'], P], ['perform an analysis of', ['analyze'], P],
  ['conduct an evaluation of', ['evaluate'], P], ['perform an evaluation of', ['evaluate'], P],
  ['conduct an investigation of', ['investigate'], P], ['conduct an investigation into', ['investigate'], P],
  ['conduct a review of', ['review'], P], ['perform a review of', ['review'], P], ['conduct a survey of', ['survey'], P],
  ['conduct an assessment of', ['assess'], P], ['conduct an inventory of', ['inventory'], P],
  ['provide assistance to', ['help'], P], ['provide assistance', ['help'], P], ['provide a description of', ['describe'], P],
  ['provide an explanation of', ['explain'], P], ['provide an overview of', ['summarize', 'outline'], P],
  ['give consideration to', ['consider'], P], ['take into consideration', ['consider'], P], ['take into account', ['consider'], P],
  ['have an impact on', ['affect'], P], ['has an impact on', ['affects'], P], ['had an impact on', ['affected'], P],
  ['have an effect on', ['affect'], P], ['has an effect on', ['affects'], P], ['had an effect on', ['affected'], P],
  ['have an adverse effect on', ['adversely affect', 'harm'], P], ['has an adverse effect on', ['adversely affects', 'harms'], P],
  ['is in agreement with', ['agrees with'], P], ['are in agreement with', ['agree with'], P],
  ['reach a conclusion', ['conclude'], P], ['come to a conclusion', ['conclude'], P], ['arrive at a decision', ['decide'], P],
  ['is applicable to', ['applies to'], P], ['are applicable to', ['apply to'], P], ['has a requirement for', ['requires'], P],
  ['is in need of', ['needs'], P], ['are in need of', ['need'], P], ['is in compliance with', ['complies with'], P],
  ['are in compliance with', ['comply with'], P], ['achieve compliance with', ['comply with'], P],
  ['is reflective of', ['reflects'], P], ['is supportive of', ['supports'], P], ['is protective of', ['protects'], P],
  ['is representative of', ['represents'], P], ['is suggestive of', ['suggests'], P], ['is indicative of', ['indicates'], P],
  ['are indicative of', ['indicate'], P], ['is illustrative of', ['illustrates'], P],
  // Legal and stuffy wording
  ['in accordance with', ['under', 'following', 'by'], P], ['pursuant to', ['under'], P], ['in lieu of', ['instead of'], P],
  ['in compliance with', ['under', 'following'], P], ['with reference to', ['about'], P],
  ['it is anticipated that', ['we expect that (name who expects)'], P], ['it is expected that', ['we expect that (name who expects)'], P],
  ['it is recommended that', ['we recommend that (name who recommends)'], P], ['it is recognized that', [''], P],
  ['it is believed that', ['we believe that (name who believes)'], P]
];

// Single words with plainer options. [word, options, note]
const WORDS = [
  ['utilize', ['use']], ['utilizes', ['uses']], ['utilized', ['used']], ['utilizing', ['using']], ['utilization', ['use']],
  ['commence', ['begin', 'start']], ['commenced', ['began', 'started']], ['commencement', ['start']],
  ['terminate', ['end', 'stop']], ['terminated', ['ended']], ['termination', ['end']],
  ['facilitate', ['help', 'ease']], ['facilitates', ['helps']], ['endeavor', ['try']], ['endeavour', ['try']],
  ['ascertain', ['find out', 'learn']], ['approximately', ['about']], ['numerous', ['many']], ['sufficient', ['enough']],
  ['initiate', ['start', 'begin']], ['initiated', ['started', 'began']], ['obtain', ['get']], ['obtained', ['got', 'collected']],
  ['purchase', ['buy']], ['subsequently', ['later', 'then']], ['accordingly', ['so']], ['aforementioned', ['this', 'these']],
  ['aforesaid', ['this']], ['herein', ['here', 'in this document']], ['hereby', ['']], ['therein', ['there', 'in it']],
  ['thereof', ['of it', 'its']], ['heretofore', ['until now']], ['henceforth', ['from now on']], ['whereby', ['by which']],
  ['notwithstanding', ['despite', 'even if']], ['effectuate', ['carry out']], ['promulgate', ['issue']],
  ['remuneration', ['pay']], ['cognizant', ['aware']], ['expeditiously', ['quickly']], ['expeditious', ['quick']],
  ['optimal', ['best']], ['leverage', ['use']], ['methodology', ['method']], ['methodologies', ['methods']],
  ['functionality', ['function', 'feature']], ['transmit', ['send']], ['transmitted', ['sent']], ['anticipate', ['expect']],
  ['magnitude', ['size']], ['assist', ['help']], ['assistance', ['help']], ['concerning', ['about']],
  ['regarding', ['about']], ['accomplish', ['do', 'finish']], ['advantageous', ['helpful']], ['alleviate', ['ease', 'reduce']],
  ['ameliorate', ['improve']], ['constitute', ['make up', 'form']], ['constitutes', ['is', 'makes up']],
  ['delineate', ['outline', 'mark']], ['disseminate', ['share', 'distribute']], ['elucidate', ['explain']],
  ['necessitate', ['require']], ['necessitates', ['requires']], ['preclude', ['prevent']], ['precludes', ['prevents']],
  ['procure', ['get', 'buy']], ['retain', ['keep']], ['substantiate', ['support', 'prove']], ['demonstrate', ['show']],
  ['demonstrates', ['shows']], ['demonstrated', ['showed', 'shown']], ['modification', ['change']], ['modify', ['change']],
  ['inception', ['start']], ['proficiency', ['skill']], ['prioritization', ['ranking']], ['expenditure', ['cost', 'spending']],
  ['indicate', ['show']], ['indicates', ['shows']], ['additional', ['more', 'added']], ['additionally', ['also']],
  ['furthermore', ['also']], ['moreover', ['also']], ['thereby', ['so', 'by this']], ['via', ['through', 'by']],
  ['shall', ['must', 'will'], 'Plain-language guidelines prefer "must" for a requirement and "will" for a prediction. Keep "shall" only when you quote a law or regulation.']
];

const FILLERS = ['very', 'really', 'quite', 'basically', 'essentially', 'actually', 'literally', 'totally', 'definitely', 'extremely', 'fairly', 'rather', 'somewhat'];
const NATURE_WORDS = 'temporary|permanent|cumulative|minor|major|complex|technical|historic|historical|archaeological|similar|general|limited|qualitative|quantitative|speculative|preliminary|seasonal|ephemeral|localized|regional|short-term|long-term|indirect|direct|beneficial|adverse';

const IRREGULAR = 'arisen|awoken|been|borne|beaten|become|begun|bent|bitten|blown|broken|brought|built|burnt|bought|caught|chosen|come|cut|dealt|dug|done|drawn|driven|eaten|fallen|fed|felt|fought|found|flown|forbidden|forgotten|forgiven|frozen|gotten|given|gone|ground|grown|hung|heard|hidden|hit|held|hurt|kept|known|laid|led|left|lent|let|lain|lit|lost|made|meant|met|overseen|overtaken|paid|put|quit|read|ridden|rung|risen|run|said|seen|sought|sold|sent|set|shaken|shed|shot|shown|shut|sung|sunk|slain|slid|spoken|spent|spun|split|spread|stolen|struck|stuck|sworn|swept|swum|taken|taught|torn|told|thought|thrown|understood|undertaken|upheld|woken|worn|woven|won|withdrawn|written';
const NOT_PARTICIPLE = new Set(['need','feed','seed','speed','bleed','breed','creed','deed','heed','reed','weed','bed','red','shed','sled','wed','bred','fled','led','hundred','kindred','sacred','naked','wicked','rugged','ragged','jagged','crooked','beloved','aged','learned','wretched','tired','interested','concerned','based','located','dated','required','proposed','related','needed','excited','pleased','supposed','used','married','qualified','limited','detailed','advanced','experienced','skilled','talented','complicated','sophisticated','dedicated','determined','balanced','mixed','varied','unpublished','unrecorded','undisturbed','undated','unexcavated','untested']);

// Common NEPA, cultural-resources and federal acronyms, used to suggest a spelled-out first use.
export const GLOSSARY = {
  NEPA: 'National Environmental Policy Act', NHPA: 'National Historic Preservation Act', EA: 'environmental assessment',
  EIS: 'environmental impact statement', DEIS: 'draft environmental impact statement', FEIS: 'final environmental impact statement',
  SEIS: 'supplemental environmental impact statement', FONSI: 'finding of no significant impact', ROD: 'record of decision',
  CE: 'categorical exclusion', CATEX: 'categorical exclusion', NOI: 'notice of intent', CEQ: 'Council on Environmental Quality',
  APE: 'area of potential effects', SHPO: 'State Historic Preservation Officer', THPO: 'Tribal Historic Preservation Officer',
  ACHP: 'Advisory Council on Historic Preservation', NRHP: 'National Register of Historic Places', TCP: 'traditional cultural property',
  MOA: 'memorandum of agreement', PA: 'programmatic agreement', AHRS: 'Alaska Heritage Resources Survey',
  OHA: 'Office of History and Archaeology', NAGPRA: 'Native American Graves Protection and Repatriation Act',
  ARPA: 'Archaeological Resources Protection Act', ANCSA: 'Alaska Native Claims Settlement Act',
  ANILCA: 'Alaska National Interest Lands Conservation Act', ESA: 'Endangered Species Act', CWA: 'Clean Water Act',
  CAA: 'Clean Air Act', BLM: 'Bureau of Land Management', USFS: 'U.S. Forest Service', NPS: 'National Park Service',
  USFWS: 'U.S. Fish and Wildlife Service', FWS: 'Fish and Wildlife Service', BIA: 'Bureau of Indian Affairs',
  EPA: 'Environmental Protection Agency', DOI: 'Department of the Interior', USDA: 'U.S. Department of Agriculture',
  DOE: 'Department of Energy', DOT: 'Department of Transportation', FHWA: 'Federal Highway Administration',
  FAA: 'Federal Aviation Administration', USACE: 'U.S. Army Corps of Engineers', NOAA: 'National Oceanic and Atmospheric Administration',
  NMFS: 'National Marine Fisheries Service', ROW: 'right-of-way', GIS: 'geographic information system',
  GPS: 'Global Positioning System', AMSL: 'above mean sea level', DNR: 'Department of Natural Resources',
  ADFG: 'Alaska Department of Fish and Game', ATV: 'all-terrain vehicle', ORV: 'off-road vehicle', BMP: 'best management practice',
  BMPS: 'best management practices', USGS: 'U.S. Geological Survey', LIDAR: 'light detection and ranging',
  AMS: 'accelerator mass spectrometry', TAMU: 'Texas A&M University', UAF: 'University of Alaska Fairbanks', UAA: 'University of Alaska Anchorage'
};
const ACRONYM_OK = new Set(['US','USA','OK','TV','AM','PM','AD','BC','BCE','CE','BP','ID','UK','EU','DNA','PDF','URL','FAQ','II','III','IV','VI','VII','VIII','IX','XI','XII','XX','XXI','NO','AKA','ETC','RE','CC','MS','PHD','PH','MA','MS','BA','BS','CV','TBD','N/A','NA','A','I']);

// ---------- helpers ----------
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function phraseRegex(p) { return new RegExp('(?<![\\w\'’-])' + p.split(/\s+/).map(esc).join('\\s+') + '(?![\\w\'’-])', 'gi'); }
function matchCase(src, rep) {
  if (!rep) return rep;
  if (src.length > 1 && src === src.toUpperCase() && /[A-Z]/.test(src)) return rep.toUpperCase();
  if (/^[A-Z]/.test(src)) return rep.charAt(0).toUpperCase() + rep.slice(1);
  return rep;
}
// Build a fix. Deleting a phrase also removes the following space and, at sentence start, capitalizes the next word.
function makeFix(text, start, end, rep) {
  const src = text.slice(start, end);
  if (rep === '') {
    let e = end; while (e < text.length && text[e] === ' ') e++;
    let s = start;
    // ", it should be noted that, " -> remove both commas
    let b = start; while (b > 0 && text[b - 1] === ' ') b--;
    if (b > 0 && text[b - 1] === ',' && text[e] === ',') {
      let e2 = e + 1;
      return {label: 'Delete "' + src + '"', start: b - 1, end: e2, text: ''};
    }
    if (e === end) { while (s > 0 && text[s - 1] === ' ') s--; }   // phrase at end: remove the space before instead
    if (/^[A-Z]/.test(src) && e < text.length && /[a-z]/.test(text[e])) {
      return {label: 'Delete "' + src + '"', start: s, end: e + 1, text: text[e].toUpperCase()};
    }
    return {label: 'Delete "' + src + '"', start: s, end: e, text: ''};
  }
  const r = matchCase(src, rep.replace(/\s*\(.*\)$/, ''));
  return {label: rep, start, end, text: r};
}
function wordsIn(s) { return (s.match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || []); }
function syllables(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g); return Math.max(1, m ? m.length : 1);
}

const ABBREV = new Set(['e.g','i.e','etc','vs','cf','al','fig','figs','no','nos','vol','pp','p','ca','cal','approx','st','mt','ft','co','inc','jr','sr','dr','mr','mrs','ms','prof','dept','sec','u.s','a.d','b.c','b.p','n.d','ed','eds','est','ave','rd','hwy','mi','km','yr','yrs','min','max','jan','feb','mar','apr','jun','jul','aug','sep','sept','oct','nov','dec']);
export function splitSentences(text) {
  const out = []; let start = 0;
  const push = (s, e) => { while (s < e && /\s/.test(text[s])) s++; let t = e; while (t > s && /\s/.test(text[t - 1])) t--; if (t > s) out.push({start: s, end: t, text: text.slice(s, t)}); };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n' || ch === '\r') { push(start, i); start = i + 1; continue; }
    if (ch === '.' || ch === '!' || ch === '?') {
      let j = i + 1; while (j < text.length && /[.!?"”’')\]]/.test(text[j])) j++;
      if (j < text.length && !/\s/.test(text[j])) continue;
      let k = j; while (k < text.length && text[k] === ' ') k++;
      if (k < text.length && !/[A-Z0-9"“‘(\[]/.test(text[k]) && text[k] !== '\n') continue;
      if (ch === '.') {
        const before = text.slice(start, i).match(/([A-Za-z.]+)$/);
        const tok = before ? before[1].toLowerCase() : '';
        if (ABBREV.has(tok) || /^[a-z]$/i.test(tok) || /^([a-z]\.)+[a-z]$/i.test(tok)) continue;
        if (/\d$/.test(text.slice(0, i)) && /^\d/.test(text.slice(i + 1))) continue;
      }
      push(start, j); start = j;
    }
  }
  push(start, text.length);
  return out;
}

// ---------- main entry ----------
// opts: {personalWords:Set(lowercase), personalSwaps:[[from,to]], enabled:{concise,plain,nepa,personal,passive,filler,long}, longLimit, docKnownAcronyms:Set}
export function checkRules(text, opts = {}) {
  const en = Object.assign({concise: true, plain: true, nepa: true, personal: true, passive: true, filler: true, long: true}, opts.enabled || {});
  const longLimit = opts.longLimit || 25;
  const issues = [];
  const add = (start, end, kind, rule, message, source, reps, scope = 'word') => {
    issues.push({start, end, kind, rule, message, source, scope, problem: text.slice(start, end), fixes: (reps || []).map(r => rule === 'acronym' ? {label: r, start, end, text: r} : makeFix(text, start, end, r))});
  };

  if (en.personal && opts.personalSwaps) {
    for (const [from, to] of opts.personalSwaps) {
      if (!from) continue;
      for (const m of text.matchAll(phraseRegex(from))) add(m.index, m.index + m[0].length, 'personal', 'my-swap', 'Your saved swap: use "' + to + '" instead of "' + m[0] + '".', SOURCES.PERSONAL, [to]);
    }
  }
  for (const [p, reps, kind, note] of PHRASES) {
    if (!en[kind]) continue;
    for (const m of text.matchAll(phraseRegex(p))) {
      const del = reps.length === 1 && reps[0] === '';
      const msg = kind === 'concise'
        ? (del ? '"' + m[0] + '" adds words but no meaning. Delete it.' : 'Wordy. "' + reps.join('" or "') + '" says the same in fewer words.')
        : (/^(it is|make|made|conduct|perform|provide|give|take|have|has|had|is|are|reach|come|arrive|achieve)/i.test(p)
            ? 'Hidden verb or impersonal phrase. Use the verb directly: "' + reps.join('" or "') + '".'
            : 'Legal or formal wording. Plainer: "' + reps.join('" or "') + '".');
      add(m.index, m.index + m[0].length, kind, 'phrase:' + p, msg + (note ? ' ' + note : ''), kind === 'concise' ? SOURCES.STATUTE_CONCISE : SOURCES.FPLG, reps);
    }
  }
  if (en.concise) {
    for (const m of text.matchAll(new RegExp('\\b(' + NATURE_WORDS + ')\\s+in\\s+(nature|character|scope)\\b', 'gi')))
      add(m.index, m.index + m[0].length, 'concise', 'in-nature', '"in ' + m[2] + '" is padding. Use "' + m[1] + '" alone.', SOURCES.STATUTE_CONCISE, [m[1]]);
    for (const m of text.matchAll(/\b(\w+)\s+in\s+(color|colour|shape)\b/gi))
      add(m.index, m.index + m[0].length, 'concise', 'in-color', '"in ' + m[2] + '" is usually redundant.', SOURCES.STATUTE_CONCISE, [m[1]]);
  }
  if (en.plain) {
    for (const [w, reps, note] of WORDS) {
      for (const m of text.matchAll(phraseRegex(w))) {
        if (w === 'shall' && /“[^”]*$|"[^"]*$/.test(text.slice(Math.max(0, m.index - 200), m.index))) continue;  // inside a quote
        add(m.index, m.index + m[0].length, 'plain', 'word:' + w, note || ('Plainer word: "' + reps.filter(Boolean).join('" or "') + '".'), SOURCES.FPLG, reps);
      }
    }
    for (const m of text.matchAll(/\b(There|there)\s+(is|are|was|were|will be)\s+(?:\w+\s+){1,4}?(that|who|which)\b/g))
      add(m.index, m.index + m[0].length, 'plain', 'there-is', '"' + m[1] + ' ' + m[2] + ' ... ' + m[3] + '" delays the subject. Start with who or what acts.', SOURCES.FPLG, []);
  }
  if (en.filler) {
    for (const f of FILLERS) for (const m of text.matchAll(phraseRegex(f)))
      add(m.index, m.index + m[0].length, 'concise', 'filler:' + f, '"' + m[0] + '" rarely adds meaning. Delete it or give a measurement.', SOURCES.STATUTE_CONCISE, ['']);
  }
  if (en.passive) {
    for (const ps of findPassives(text)) {
      const clause = text.slice(ps.start, ps.end);
      const msg = ps.fixes.length
        ? 'Passive voice. Active version: "' + ps.fixes[0].text + '". Check that it keeps your meaning; "[who]" means name the actor yourself. Keep the passive only when the actor is unknown or unimportant.'
        : 'Passive voice. Say who does the action, e.g. "The BLM would build the road", not "The road would be built". This sentence is too complex to rewrite automatically; use Fix to edit it. Keep the passive when the actor is unknown or unimportant.';
      issues.push({start: ps.coreStart, end: ps.coreEnd, kind: 'plain', rule: 'passive', scope: 'word', problem: clause, message: msg,
                   source: SOURCES.CEQ_PLAIN + '; ' + SOURCES.FPLG + '; BU Writing Guide in Archaeology', fixes: ps.fixes});
    }
  }
  if (en.nepa) {
    const known = opts.docKnownAcronyms instanceof Set ? opts.docKnownAcronyms : new Set(opts.docKnownAcronyms || []);
    const seen = new Set();
    for (const m of text.matchAll(/(?<![\w&])([A-Z][A-Z&]{1,7}[A-Z]|[A-Z]{2})(s?)(?![\w&])/g)) {
      const ac = m[1]; const key = ac.replace(/&/g, '');
      if (ACRONYM_OK.has(ac) || /^[IVXLC]+$/.test(ac) || seen.has(ac) || known.has(ac) || (opts.personalWords && opts.personalWords.has(ac.toLowerCase()))) continue;
      seen.add(ac);
      const before = text.slice(Math.max(0, m.index - 1), m.index), after = text.slice(m.index + m[0].length, m.index + m[0].length + 2);
      if (before === '(' || /^\s?\(/.test(after)) { known.add(ac); continue; }   // defined here: "Area of Potential Effects (APE)" or "APE (area of ...)"
      if (new RegExp('\\(' + esc(ac) + 's?\\)').test(text.slice(0, m.index))) continue;
      const exp = GLOSSARY[key];
      known.add(ac);   // flag only the first undefined use in the whole document
      add(m.index, m.index + m[0].length, 'nepa', 'acronym', 'Acronym "' + ac + '" appears before it is defined. Spell it out at first use' + (exp ? ': ' + exp + ' (' + ac + ').' : '.'), SOURCES.ACRONYM,
          exp ? [exp + ' (' + ac + ')' + m[2]] : []);
    }
    // "significant" is a NEPA term of art.
    for (const m of text.matchAll(/\b(significant|significantly|insignificant)\b/gi))
      add(m.index, m.index + m[0].length, 'nepa', 'significant', '"Significant" is a NEPA term of art. Use it only for a NEPA significance finding. Otherwise say "large", "important" or give a number.', 'NEPA practice (significance determinations)', []);
    for (const m of text.matchAll(/\b(minimal|negligible|minor|moderate|substantial)\s+(impacts?|effects?)\b|\b(impacts?|effects?)\s+(?:would|will|are|is|were|was|would be|will be|are expected to be|is expected to be)\s+(?:be\s+)?(minimal|negligible|minor|moderate|substantial)\b/gi))
      add(m.index, m.index + m[0].length, 'nepa', 'quantify', 'Impact level stated without a measure. Define the threshold (e.g., acres disturbed, duration) or cite the definition you use.', 'NEPA practice: analytic, not encyclopedic', []);
  }
  if (en.long) {
    for (const s of splitSentences(text)) {
      const n = wordsIn(s.text).length;
      if (n > longLimit) issues.push({start: s.start, end: s.end, kind: 'concise', rule: 'long-sentence', scope: 'sentence', problem: s.text, fixes: [],
        message: 'Long sentence (' + n + ' words). Aim for ' + longLimit + ' or fewer; split it or cut padding.' + (n > 40 ? ' At this length readers lose the thread.' : ''), source: SOURCES.FPLG});
    }
  }
  issues.sort((a, b) => a.start - b.start || b.end - a.end);
  return issues;
}

// Document statistics and NEPA page-limit check.
export const DOC_TYPES = {
  ea: {label: 'Environmental assessment (75-page limit)', pages: 75},
  eis: {label: 'Environmental impact statement (150-page limit)', pages: 150},
  eisx: {label: 'EIS, extraordinarily complex (300-page limit)', pages: 300},
  other: {label: 'Other document (no page limit)', pages: 0}
};
export function docStats(text, opts = {}) {
  const sents = splitSentences(text);
  const words = wordsIn(text); const nw = words.length;
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  const ns = Math.max(1, sents.length);
  const grade = nw ? 0.39 * (nw / ns) + 11.8 * (syl / nw) - 15.59 : 0;
  const wpp = opts.wordsPerPage || 500;
  const pages = nw / wpp;
  const dt = DOC_TYPES[opts.docType || 'other'];
  return {words: nw, sentences: sents.length, avgSentence: nw / ns, grade: Math.max(0, grade), pages, pageLimit: dt.pages,
          overLimit: dt.pages ? pages > dt.pages : false, wordsPerPage: wpp};
}

// Parse a pasted Grammarly personal dictionary (or any word list).
export function parseWordList(raw) {
  const junk = /^(delete|remove|add|edit|search|cancel|save|personal dictionary|dictionary|words?|add word|customize|account|\d+\s*words?|[\W_]+)$/i;
  const out = new Set();
  for (let t of String(raw || '').split(/[\r\n,;\t]+/)) {
    t = t.replace(/^[\s•\-*\d.)]+(?=\S)/, '').replace(/\s+(delete|remove)$/i, '').trim();
    if (!t || t.length > 60 || junk.test(t) || !/[A-Za-z]/.test(t)) continue;
    out.add(t);
  }
  return [...out];
}
// Parse "wrong => right" swap lines.
export function parseSwaps(raw) {
  const out = [];
  for (const line of String(raw || '').split(/\r?\n/)) {
    const m = line.split(/\s*(?:=>|->|→|\t)\s*/);
    if (m.length >= 2 && m[0].trim() && m[1].trim()) out.push([m[0].trim(), m[1].trim()]);
  }
  return out;
}
