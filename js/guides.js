// NEPA Plain Writer - archaeology writing craft, from the guides the user chose:
//  BU  = Boston University Archaeology, "Writing Guide in Archaeology" (Runnels and Murray)
//  HAM = Bill White, Succinct Research: "Good archaeology writing is based on hamburgers" and "Archaeology Hack #9: Write clearly and logically"
//  AAI = Alexandria Archive Institute, "Writing with Archaeological Inspiration" (2022): writing as a daily habit
export const GUIDES = {
  BU: 'BU Writing Guide in Archaeology',
  HAM: 'Succinct Research: hamburger paragraphs',
  HACK: 'Succinct Research: write clearly and logically',
  AAI: 'Alexandria Archive Institute: writing as practice'
};
const CONTRACTIONS = {
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'cannot', "won't": 'will not', "isn't": 'is not', "aren't": 'are not',
  "wasn't": 'was not', "weren't": 'were not', "hasn't": 'has not', "haven't": 'have not', "hadn't": 'had not', "couldn't": 'could not',
  "shouldn't": 'should not', "wouldn't": 'would not', "it's": 'it is', "that's": 'that is', "there's": 'there is', "they're": 'they are',
  "we're": 'we are', "you're": 'you are', "I'm": 'I am', "let's": 'let us', "we've": 'we have', "they've": 'they have', "we'll": 'we will',
  "they'll": 'they will', "it'll": 'it will', "who's": 'who is', "what's": 'what is'
};
// [regex, message, suggestions]
const VAGUE = [
  [/\b(?:a lot of|lots of|tons of|a bunch of|loads of)\b/gi, 'Vague quantity. Give the number or a measured term.', ['many', 'most']],
  [/\ba lot\b/gi, 'Vague. Give the number, or say "often" or "much".', ['often', 'much']],
  [/\b(?:cool|awesome|huge|super|amazing|incredible|crazy)\b/gi, 'Slang or a vague intensifier. Use a precise, measured word.', []],
  [/\b(?:pretty much|kind of|sort of|more or less)\b/gi, 'Vague hedge. State the claim and its limits directly.', ['']],
  [/\b(?:stuff|things like that|and so on and so forth)\b/gi, 'Vague. Name what you mean.', []]
];
const DOUBLE_NEG = /\bnot\s+(?:un(?:common|usual|like|likely|reasonable|important|known|related|expected|founded|typical)|in(?:significant|considerable|frequent(?:ly)?|appropriate|consistent)|im(?:possible|probable|material)|dis(?:similar|agree(?:able)?)|without)\b/gi;
const CONFUSED = [
  [/\b(?:the|an|any|no|adverse|negative|positive|little|direct|indirect|cumulative|significant)\s+affects?\b/gi, 'Here the noun is "effect" (affect is usually the verb).', m => [m.replace(/affect/i, 'effect')]],
  [/\b(?:will|would|could|may|might|can|not|to)\s+effect\s+(?:the|a|an|its|their|our|on)\b/gi, 'Check: "affect" (to influence) is usually the verb; "effect" as a verb means "to bring about".', m => [m.replace(/effect/i, 'affect')]],
  [/\bit's\s+(?:own|use|function|location|size|age|shape|surface|context|condition|significance|edges?|base|margin|interior|exterior)\b/gi, '"It\'s" means "it is". The possessive is "its".', m => [m.replace(/it's/i, 'its')]],
  [/\bits\s+(?:a|an|the|not|been|likely|possible|clear|important|unclear|probable)\b/gi, '"Its" is possessive. For "it is" or "it has", write it out (no contractions).', m => [m.replace(/^its/i, 'it is')]],
  [/\b(?:a|this|that|one|single)\s+phenomena\b|\bphenomena\s+(?:is|was|has)\b/gi, '"Phenomena" is plural; the singular is "phenomenon".', m => [m.replace(/phenomena/i, 'phenomenon')]],
  [/\b(?:a|this|that|one|single)\s+criteria\b|\bcriteria\s+(?:is|was|has)\b/gi, '"Criteria" is plural; the singular is "criterion".', m => [m.replace(/criteria/i, 'criterion')]],
  [/\b(?:artifact|artefact|feature|site|flake|tool|sample|bone|sherd|unit|component|date|burial)'s\s+(?:were|are|have|from|in|at|of|and)\b/gi, 'Plural, not possessive: no apostrophe ("artifacts were", not "artifact\'s were").', m => [m.replace(/'s/, 's')]]
];
// Process-first sentences (Hack #9): readers want what you found, not how long it took or who found it.
const PROCESS_OPEN = /^(?:During|Over|Throughout|In the course of|As part of)\s+(?:the|our|this)\s+(?:[\w-]+\s+){0,7}?(?:investigations?|surveys?|fieldwork|field season|season|testing|excavations?|inventory|work|project)\b[^,]{0,60},/i;
const ACTOR_TAIL = /\bby\s+(?:the\s+)?(?:field\s+)?(?:crew|crew members|field personnel|project (?:staff|personnel|archaeologists?)|field technicians?|archaeologists?|investigators|researchers|staff)\b/gi;
const FUTURE_ABSTRACT = /\b(?:will|shall)\s+(?:be\s+)?(?:examine|examined|discuss|discussed|describe|described|present|presented|explore|explored|investigate|investigated|analy[sz]e|analy[sz]ed|address|addressed|outline|outlined|review|reviewed|argue|consider|considered|evaluate|evaluated)\b|\b(?:this|the present) (?:paper|article|report|study|chapter) (?:will|aims to|seeks to|attempts to)\b/gi;

function sentencesOf(text) { return [...text.matchAll(/[^.!?]+(?:[.!?]+["”’)]?|$)/g)].map(m => ({s: m.index, t: m[0]})).filter(x => /\w/.test(x.t)); }
const isHeading = t => t.trim().length < 90 && !/[.!?:;]\s*$/.test(t.trim()) && t.trim().split(/\s+/).length <= 12;

function findAbstract(doc) { const m = doc.match(/^\s*Abstract\s*[:.]?\s*\r?\n+\s*([^\n]+)/im); return m ? m[1].trim() : null; }

export function checkGuides(text, opts = {}) {
  const out = [];
  const add = (s, e, rule, msg, src, reps = [], scope = 'word') => out.push({start: s, end: e, kind: 'craft', rule: 'craft:' + rule, scope, wide: rule === 'process', problem: text.slice(s, e),
    message: msg, source: src, fixes: reps.map(r => ({label: r === '' ? 'Delete "' + text.slice(s, e) + '"' : r, start: s, end: e,
      text: r === '' ? '' : (/^[A-Z]/.test(text.slice(s, e)) ? r.charAt(0).toUpperCase() + r.slice(1) : r)}))});
  if (opts.isRef) return out;
  const inQuote = i => { const before = text.slice(0, i); return ((before.match(/[“"]/g) || []).length - (before.match(/[”]/g) || []).length) % 2 === 1; };
  // BU: no contractions, slang, vague words or double negatives.
  for (const m of text.matchAll(/\b[A-Za-z]+['’](?:t|s|re|m|ve|ll)\b/g)) {
    const k = m[0].replace('’', "'"); const key = Object.keys(CONTRACTIONS).find(c => c.toLowerCase() === k.toLowerCase());
    if (!key || inQuote(m.index)) continue;
    if (/^it'?s$/i.test(k) && /^\s+(?:own|use|function|location|size|age|shape|surface|context|condition|significance|edges?|base|margin|interior|exterior)\b/i.test(text.slice(m.index + m[0].length))) continue;
    add(m.index, m.index + m[0].length, 'contraction', 'No contractions in formal writing. Write it out.', GUIDES.BU, [CONTRACTIONS[key]]);
  }
  for (const [re, msg, reps] of VAGUE) for (const m of text.matchAll(re)) if (!inQuote(m.index)) add(m.index, m.index + m[0].length, 'vague', msg, GUIDES.BU, reps);
  for (const m of text.matchAll(DOUBLE_NEG)) add(m.index, m.index + m[0].length, 'doubleneg', 'Double negative. Say it positively ("common", "similar", "likely"), or give the number.', GUIDES.BU, []);
  for (const [re, msg, fix] of CONFUSED) for (const m of text.matchAll(re)) add(m.index, m.index + m[0].length, 'confused', msg, GUIDES.BU, fix(m[0]));
  // Hack #9: lead with the finding.
  for (const sn of sentencesOf(text)) {
    const t = sn.t.replace(/^\s+/, ''); const off = sn.s + (sn.t.length - t.length);
    const m = t.match(PROCESS_OPEN);
    if (m) add(off, off + m[0].length, 'process', 'Lead with what you found. "We identified 12 artifact concentrations" beats "During the course of our week-long field investigation, 12 artifact concentrations were identified by the field crew."', GUIDES.HACK, []);
  }
  for (const m of text.matchAll(ACTOR_TAIL)) add(m.index, m.index + m[0].length, 'actor', 'Readers rarely need to know which crew member did it. Make the sentence active ("We recorded ...") or cut this phrase.', GUIDES.HACK, ['']);
  // BU: the abstract says what you did, in 100-300 words.
  const abs = opts.docText ? findAbstract(opts.docText) : null;
  if (abs && text.trim() === abs) {
    const n = (text.match(/\b[\w'’-]+\b/g) || []).length;
    if (n < 100 || n > 300) add(0, text.length, 'abstractlen', 'Abstract has ' + n + ' words. Aim for 100 to 300, naming the subject, topic and hypothesis, and summarizing results and conclusions.', GUIDES.BU, [], 'paragraph');
    for (const m of text.matchAll(FUTURE_ABSTRACT)) add(m.index, m.index + m[0].length, 'abstractfuture', 'An abstract states what you did, not what you will do. Use the past or present tense ("We show ...", "Results indicate ...").', GUIDES.BU, []);
  }
  // Hamburger paragraphs: 2-7 sentences; top bun = topic sentence, meat = support, bottom bun = conclusion.
  if (!isHeading(text)) {
    const ns = sentencesOf(text).length;
    if (ns > 7) add(0, text.length, 'burgerlong', 'This paragraph has ' + ns + ' sentences. Hamburger paragraphs run 2 to 7: a topic sentence, the supporting details, and a closing sentence. Split it where the topic changes.', GUIDES.HAM, [], 'paragraph');
    else if (ns === 1 && (text.match(/\b[\w'’-]+\b/g) || []).length > 12 && !opts.isListItem)
      add(0, text.length, 'burgerthin', 'One-sentence paragraph. Give it support (evidence, data, a citation) and a closing sentence, or join it to the paragraph it belongs with.', GUIDES.HAM, [], 'paragraph');
  }
  return out;
}

// Document checklist from the BU guide (shown under the CARE panel).
export function craftChecklist(doc) {
  const paras = doc.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
  const bodyStart = paras.findIndex(p => !isHeading(p) && p !== findAbstract(doc));
  const opening = paras.slice(Math.max(0, bodyStart), Math.max(0, bodyStart) + 2).join(' ');
  const refAt = paras.findIndex(p => /^(?:References Cited|References|Literature Cited|Bibliography|Works Cited)$/i.test(p));
  const body = refAt > 0 ? paras.slice(0, refAt) : paras;
  const lastPara = [...body].reverse().find(p => !isHeading(p)) || '';
  const abs = findAbstract(doc);
  const absWords = abs ? (abs.match(/\b[\w'’-]+\b/g) || []).length : 0;
  const usesDates = /\b(?:\d{3,5}\s*(?:±|\+\/-)|cal\s?(?:BP|AD|BC)|\d{3,5}\s+(?:BP|B\.P\.)|14C|radiocarbon)\b/i.test(doc);
  const items = [
    {key: 'question', label: 'Question or hypothesis stated in the opening paragraph', ok: /\b(?:hypothes[ie]s|research questions?|we (?:argue|propose|test|ask|suggest)|I (?:argue|propose|test)|(?:this|the) (?:paper|article|report|study|chapter) (?:argues|tests|examines|asks|shows|evaluates)|objectives? (?:is|are|of)|purpose of this|question(?:s)? (?:is|are|of))\b/i.test(opening), src: GUIDES.BU},
    {key: 'abstract', label: abs ? 'Abstract length 100-300 words (now ' + absWords + ')' : 'Abstract present (100-300 words)', ok: !!abs && absWords >= 100 && absWords <= 300, src: GUIDES.BU, optional: !abs},
    {key: 'conclusion', label: 'Last paragraph opens with the conclusion', ok: /^(?:(?:In (?:sum|summary|conclusion),?\s+)?(?:the|our|these|this|we|results|evidence|data)\b)/i.test(lastPara) && !/^(?:This (?:paper|report|chapter) (?:has|was|is))/i.test(lastPara), src: GUIDES.BU},
    {key: 'negative', label: 'Negative evidence or alternative explanations considered', ok: /\b(?:however|alternative(?:ly| explanations?| hypothes[ie]s)?|does not support|do not support|did not support|inconsistent with|contrary to|counter-?evidence|negative evidence|limitations?|we cannot rule out|equifinality)\b/i.test(doc), src: GUIDES.BU},
    ...(usesDates ? [{key: 'dates', label: 'Date conventions explained (calibrated or uncalibrated, curve, program)', ok: /\b(?:IntCal\s?\d*|calibrat(?:ed|ion) (?:with|using)|OxCal|CALIB|Bchron|rcarbon|uncalibrated)\b/i.test(doc), src: GUIDES.BU + '; SAA §3.3.5'}] : [])
  ];
  return items;
}
