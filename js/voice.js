// NEPA Plain Writer - Gerad Smith's own writing conventions (drawn from his NSF, RAPID and Eliason proposals).
const SRC = "Your style (from your proposals)";
const SPECIES = {
  moose: 'Alces alces', caribou: 'Rangifer tarandus', wapiti: 'Cervus canadensis', elk: 'Cervus canadensis', bison: 'Bison bison',
  beaver: 'Castor canadensis', wolverine: 'Gulo gulo', wolf: 'Canis lupus', 'arctic ground squirrel': 'Urocitellus parryii',
  'snowshoe hare': 'Lepus americanus', muskrat: 'Ondatra zibethicus', 'Dall sheep': 'Ovis dalli', ptarmigan: 'Lagopus spp.',
  'northern pike': 'Esox lucius', 'salmon': 'Oncorhynchus spp.', 'whitefish': 'Coregonus spp.', 'horse': 'Equus spp.', 'mammoth': 'Mammuthus primigenius'
};
const SLIPS = [
  [/\bendanger of\b/gi, 'in danger of', '"Endanger of" should be "in danger of".'],
  [/\bpeer reviewed(?=\s+(?:journals?|articles?|publications?|papers?|literature))/gi, 'peer-reviewed', 'Hyphenate "peer-reviewed" before a noun.'],
  [/\b(?:compliment(?:s|ed|ing|ary)?)\b(?=\s+(?:the|our|this|these|existing|previous|other|each|and)\b)/gi, null, 'Check: "complement" means to complete or go with; "compliment" means praise.'],
  [/\b(?:plays?|played|playing|key|important|central|major|significant|critical)\s+(?:a\s+|an\s+|the\s+)?(?:\w+\s+)?roll\b/gi, null, '"Roll" should probably be "role".'],
  [/\b(?:more|less|greater|fewer|rather|older|younger|earlier|later|larger|smaller|higher|lower|better|worse|other|deeper|shallower)\s+then\b/gi, null, 'After a comparison, use "than", not "then".'],
  [/\b(?:more|less|fewer|greater)\s+[a-z]+\s+then\b/gi, null, 'After a comparison, use "than", not "then".'],
  [/\b(?:RCYBP|rcybp|RCYBP\.)\b/g, null, 'Make sure uncalibrated ages are labelled ("14C yr BP" or "rcybp") and are not mixed with cal BP in one sentence without labels.'],
];
const PLACEHOLDERS = /\(citation\)|\[\[NEEDED[^\]]*\]\]|\bTBD\b|\bTK\b|\bXXX?\b|\?\?\?|\bfill (?:in|this)\b|\b(?:to write|insert here|add here)\b|…|\.\.\./g;

export function checkVoice(text, opts = {}) {
  const out = [];
  const add = (s, e, rule, msg, reps = [], kind = 'voice') => out.push({start: s, end: e, kind, rule: 'voice:' + rule, scope: 'word', problem: text.slice(s, e), message: msg, source: SRC,
    fixes: reps.map(r => ({label: r, start: s, end: e, text: r}))});
  for (const [re, rep, msg] of SLIPS) for (const m of text.matchAll(re)) {
    if (rep && m[0] === rep) continue;
    let reps = rep ? [rep] : [];
    if (!rep && /roll\b/i.test(m[0])) reps = [m[0].replace(/roll$/i, 'role')];
    if (!rep && /then$/i.test(m[0])) reps = [m[0].replace(/then$/i, 'than')];
    add(m.index, m.index + m[0].length, 'slip', msg, reps);
  }
  for (const m of text.matchAll(PLACEHOLDERS)) add(m.index, m.index + m[0].length, 'placeholder', 'Placeholder left in the text. Fill it in or remove it before submission.', []);
  // Athabascan / Athabaskan: one spelling per document.
  const doc = opts.docText || text;
  const nC = (doc.match(/\bAthabascans?\b/g) || []).length, nK = (doc.match(/\bAthabaskans?\b/g) || []).length;
  if (nC && nK) {
    const keep = nC >= nK ? 'Athabascan' : 'Athabaskan', drop = keep === 'Athabascan' ? 'Athabaskan' : 'Athabascan';
    for (const m of text.matchAll(new RegExp('\\b' + drop + '(s?)\\b', 'g'))) add(m.index, m.index + m[0].length, 'athabascan', 'This document uses both "Athabascan" and "Athabaskan". Pick one; "' + keep + '" is used more here.', [keep + m[1]]);
  }
  if (opts.isRef) return out;   // reference titles are reproduced exactly
  // Species: scientific name at first mention.
  const seen = opts.seenSpecies || new Set();
  for (const [common, bin] of Object.entries(SPECIES)) {
    if (seen.has(common)) continue;
    const re = new RegExp('\\b' + common.replace(/ /g, '\\s+') + '\\b', 'i'); const m = text.match(re);
    if (!m) continue;
    seen.add(common);
    const genus = bin.split(' ')[0];
    const near = text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60);
    if (new RegExp('\\b' + genus + '\\b').test(near) || (opts.docText && opts.docText.indexOf(bin) !== -1 && opts.docText.indexOf(bin) < (opts.docOffset || 0) + m.index)) continue;
    add(m.index, m.index + m[0].length, 'species', 'First mention of ' + m[0] + ': give the scientific name, then the common name, e.g. ' + bin + ' (' + m[0] + '). Italicize the scientific name.', [bin + ' (' + m[0] + ')']);
  }
  // Repeated sentences (copied paragraphs).
  const sentences = opts.seenSentences || new Map();
  for (const sm of text.matchAll(/[^.!?\n]{60,}[.!?]/g)) {
    const k = sm[0].trim().toLowerCase().replace(/\s+/g, ' ');
    if (k.split(' ').length < 12) continue;
    if (sentences.has(k)) add(sm.index, sm.index + sm[0].length, 'repeat', 'This sentence appears earlier in the document. Remove the copy or vary it.', []);
    else sentences.set(k, true);
  }
  return out;
}
