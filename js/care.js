// NEPA Plain Writer - CARE Principles for Indigenous Data Governance, applied to writing.
// Carroll, S. R., et al. 2020. The CARE Principles for Indigenous Data Governance. Data Science Journal 19(1):43. doi:10.5334/dsj-2020-043
// Global Indigenous Data Alliance (GIDA), 2019. These checks are prompts for the writer's judgment and for consultation, not rulings.
export const CARE = {
  C: {name: 'Collective benefit', short: 'C', ask: 'Say how the work benefits the descendant community: access to collections and results, return of results, training or hiring, heritage and language work.'},
  A: {name: 'Authority to control', short: 'A', ask: 'Show that the community decides how its information is used: Tribal consultation, consent, data-sharing or review agreements, and protection of sensitive locations.'},
  R: {name: 'Responsibility', short: 'R', ask: 'Credit Indigenous knowledge to its holders with permission, say how results go back to the community, and how the community reviewed the text.'},
  E: {name: 'Ethics', short: 'E', ask: 'Minimize harm: respectful terms the community prefers, no deficit or erasing language, confidentiality for burials and sacred places.'}
};
const SRC = {
  C: 'CARE: Collective benefit (GIDA 2019; Carroll et al. 2020)',
  A: 'CARE: Authority to control (GIDA 2019; Carroll et al. 2020). Site-location confidentiality: NHPA 54 U.S.C. 307103; ARPA 16 U.S.C. 470hh',
  R: 'CARE: Responsibility (GIDA 2019; Carroll et al. 2020)',
  E: 'CARE: Ethics (GIDA 2019; Carroll et al. 2020)'
};

// [regex source, principle, message, suggestions, strength]
const TERMS = [
  ['prehistor(?:y|ic)|prehispanic|pre-[Hh]ispanic|precolumbian|pre-[Cc]olumbian|pre-European', 'E', 'Avoid terms with an implicit colonial bias (SAA Style Guide 2023 §1.1.13). Use the most specific term: the period or tradition name (e.g., Northern Archaic, Middle Holocene) or "ancestral [community]". Capitalize legacy terms (Late Precontact).', []],
  ['informants?', 'E', 'Name people as knowledge holders, consultants or Elders (with their permission) rather than "informants".', ['knowledge holder', 'consultant']],
  ['(?:myths?|legends?|folklore|folk tales?)', 'E', 'For Indigenous histories, "oral history" or "oral tradition" respects them as history, not fiction.', ['oral history', 'oral tradition']],
  ['(?:pristine|untouched|virgin)\\s+(?:wilderness|land|lands|landscape|forest|country)', 'E', 'This erases Indigenous presence. These are homelands; describe the land and its people.', ['homeland', 'ancestral lands']],
  ['(?:the\\s+)?New World', 'E', '"New World" centres European arrival. Use "the Americas" or the region name.', ['the Americas']],
  ['(?:abandoned|deserted)\\s+(?:site|sites|village|villages|camp|camps|settlement|settlements)', 'E', '"Abandoned" can imply a people disappeared. Consider "no longer occupied", or explain the move (seasonal round, relocation).', ['no longer occupied']],
  ['primitive|Stone Age|savages?|simple hunter-gatherers', 'E', 'Deficit language. Describe the technology or way of life on its own terms.', []],
  ['squaw|half-breeds?|redskins?', 'E', 'Offensive term. Replace it unless you are quoting a historical source, and then say so.', []],
  ['Eskimos?', 'E', 'Many Alaska Native people prefer their own names (Iñupiat, Yup\'ik, Cup\'ik, St. Lawrence Island Yupik) or Inuit. Check the community\'s preference; keep it in legal or historical names.', ['Iñupiat', 'Yup\'ik']],
  ['Aleuts?', 'E', 'Many communities prefer Unangan (Unangax̂). Check preference; keep "Aleut" in legal or organizational names (e.g., Aleut Corporation).', ['Unangan']],
  ['the\\s+[Nn]atives', 'E', 'Use "Native people", "Alaska Native people" or the community\'s name, not "the Natives".', ['Alaska Native people', 'Native people']],
  ['(?:extinct|dead)\\s+languages?', 'E', 'Many communities call a language with no current speakers "sleeping" or "dormant", because revitalization is possible.', ['sleeping language', 'dormant language']],
  ['berdache', 'E', 'Use "two-spirit" (SAA Style Guide 2023 §1.1.13).', ['two-spirit']],
  ['slaves?', 'E', 'Consider "enslaved person" or "enslaved people" (SAA Style Guide 2023 §1.1.13).', ['enslaved people']],
  ['Anasazi', 'E', 'Use "Ancestral Puebloan" (SAA Style Guide 2023 §1.1.13).', ['Ancestral Puebloan']],
  ['skeletal material|human specimens?|skeletons? (?:were|was) (?:recovered|collected|removed)', 'E', 'Use respectful language for the remains of people and how they were treated (SAA Style Guide 2023 §1.1.12). Ask descendant communities which terms they prefer, e.g. "ancestral remains" or "the remains of [number] people".', ['ancestral remains']],
  ['vanished\\s+(?:people|peoples|culture|cultures|tribe|tribes)', 'E', 'Peoples rarely vanish; descendants are often living nearby. Name the descendant community where known.', []],
];
// Silence or non-response treated as consent.
const SILENCE = /\b(?:no (?:objections?|concerns?|comments?|responses?) (?:were|was) (?:received|raised|expressed|made)|(?:did|does|do) not (?:respond|reply|object|comment)|(?:a |the )?lack of (?:interest|response|objection)|no response was received|has not responded|have not responded|declined to comment)\b/gi;
// Location detail that can expose sites.
const LOCATIONS = [
  [/\b\d{1,2}(?:\.\d{3,})\s*°?\s*[NS]?,?\s+-?\d{1,3}(?:\.\d{3,})\s*°?\s*[EW]?\b/g, 'Decimal latitude/longitude'],
  [/\b\d{1,3}\s*°\s*\d{1,2}\s*['’′]\s*(?:\d{1,2}(?:\.\d+)?\s*["”″])?\s*[NSEW]\b/g, 'Degrees-minutes coordinates'],
  [/\b(?:UTM|Zone\s*\d{1,2}[A-Z]?)\b[^.]{0,40}?\b\d{6,7}\s*(?:m\s*)?[EN]?\b/gi, 'UTM coordinates'],
  [/\b\d{6}\s*m?\s*E(?:asting)?\b|\b\d{7}\s*m?\s*N(?:orthing)?\b/g, 'UTM easting/northing'],
  [/\bT\.?\s?\d{1,3}\s?[NS]\.?,?\s*R\.?\s?\d{1,3}\s?[EW]\.?(?:,?\s*(?:Sec(?:tion|\.)?\s*\d{1,2}))?/g, 'Legal land description (township, range, section)'],
];
const SENSITIVE = /\b(?:human remains|burials?|graves?|grave goods|cemeter(?:y|ies)|sacred sites?|sacred places?|ceremonial sites?|funerary objects?|ancestral remains)\b/gi;
const CONFIDENTIAL_CUE = /\b(?:confidential|withheld|redact|restricted|not (?:be )?disclosed|consent|permission|consultation|NAGPRA|Tribal Historic Preservation|THPO)\b/i;
// Indigenous knowledge statements that need attribution.
const KNOWLEDGE = /\b(?:oral (?:history|histories|tradition|traditions|accounts?)|Elders?|traditional (?:ecological )?knowledge|TEK|Indigenous knowledge|local knowledge|place[- ]names?|according to (?:local|community) (?:residents|members|people))\b/i;
const CITED = /\([^()]*(?:\b1[89]\d\d|\b20\d\d|personal communication|pers\. comm|interview|shared with permission)[^()]*\)|\bpersonal communication\b|\bwith (?:their |his |her )?permission\b/i;

export function checkCare(text, opts = {}) {
  const out = [];
  const add = (s, e, p, rule, msg, reps = []) => out.push({start: s, end: e, kind: 'care', care: p, rule: 'care:' + rule, scope: 'word', problem: text.slice(s, e),
    message: '[' + CARE[p].name + '] ' + msg, source: SRC[p], fixes: reps.map(r => ({label: r, start: s, end: e, text: /^[A-Z]/.test(text.slice(s, e)) ? r.charAt(0).toUpperCase() + r.slice(1) : r}))});
  for (const [src, p, msg, reps] of TERMS) {
    for (const m of text.matchAll(new RegExp('(?<![\\w-])(?:' + src + ')(?![\\w-])', src === 'Eskimos?' || src === 'Aleuts?' ? 'g' : 'gi'))) {
      // keep legal and organizational names
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 25);
      if (/^\s+(?:Corporation|Pribilof|Region|Islands?|Range|Basin|Peninsula|International|Heritage|Language Center)\b/.test(after)) continue;
      add(m.index, m.index + m[0].length, p, src.slice(0, 18), msg, reps);
    }
  }
  for (const m of text.matchAll(/(?<![\w-])indigenous(?![\w-])(?!\s+(?:plants?|species|flora|fauna|vegetation|grasses|trees|to)\b)/g)) add(m.index, m.index + m[0].length, 'E', 'capital', 'Capitalize "Indigenous" when it refers to peoples and their identity (SAA Style Guide 2023 §1.1.13); lowercase only for plain adjectives (indigenous plants).', ['Indigenous']);
  for (const m of text.matchAll(/(?<![\w-])native(?=\s+(?:people|peoples|community|communities|Alaskans?|corporations?|villages?|[Ee]lders?|languages?|lands?|nations?|Tribes?)\b)/g))
    add(m.index, m.index + m[0].length, 'E', 'capital', 'Capitalize "Native" when it refers to Alaska Native or Native American peoples (SAA Style Guide 2023 §1.1.13).', ['Native']);
  for (const m of text.matchAll(SILENCE))
    add(m.index, m.index + m[0].length, 'A', 'silence', 'Silence or no response is not consent. Record what consultation happened and what the community decided; follow up before treating the matter as settled.', []);
  const publicMode = opts.audience === 'public';
  for (const [re, what] of LOCATIONS) for (const m of text.matchAll(re))
    add(m.index, m.index + m[0].length, 'A', 'location', what + ' can expose a site. Use landform and general area in public text; put exact locations in a confidential appendix, with the community\'s agreement (NHPA 54 U.S.C. 307103; ARPA 16 U.S.C. 470hh).', []);
  if (publicMode) for (const m of text.matchAll(/\b[A-Z]{3}-\d{3,5}\b/g))
    add(m.index, m.index + m[0].length, 'A', 'ahrs', 'Site number (AHRS) in a public document. Site numbers lead to locations; consider removing them from the public version.', []);
  for (const m of text.matchAll(SENSITIVE)) {
    const sentStart = Math.max(text.lastIndexOf('.', m.index - 1), text.lastIndexOf('\n', m.index - 1)) + 1;
    let sentEnd = text.slice(m.index).search(/[.!?](?:\s|$)/); sentEnd = sentEnd < 0 ? text.length : m.index + sentEnd + 1;
    if (CONFIDENTIAL_CUE.test(text.slice(sentStart, sentEnd)) || (opts.docText && CONFIDENTIAL_CUE.test(opts.docText))) continue;
    add(m.index, m.index + m[0].length, 'A', 'sensitive', 'Sensitive cultural information. Say how it is protected and that the descendant community agreed to what is shared here (NAGPRA, consultation, confidentiality).', []);
  }
  // Responsibility: attribute Indigenous knowledge, sentence by sentence.
  const sentRe = /[^.!?\n]+[.!?]?/g; let m;
  while ((m = sentRe.exec(text))) {
    const s = m[0]; if (!KNOWLEDGE.test(s) || CITED.test(s)) continue;
    const k = s.match(KNOWLEDGE); const st = m.index + k.index;
    out.push({start: st, end: st + k[0].length, kind: 'care', care: 'R', rule: 'care:attribution', scope: 'word', problem: k[0],
      message: '[Responsibility] Indigenous knowledge in this sentence has no attribution. Cite the knowledge holder with permission in SAA form, (D. Goodfish Cardinal 2004), with a References Cited entry: Last, First. Year. Topic. Nation/Community. Where they live. Oral teaching, personal communication, Month Day (SAA §3.4.17, §3.12.16). Review the citation with the person and note the permission. Or cite the published source (e.g., Kari; Mishler 1986).',
      source: SRC.R, fixes: []});
  }
  return out;
}

// Document-level CARE checklist: which principles does the text address?
const CUES = {
  C: /\b(?:benefits? (?:to|for) (?:the )?(?:community|communities|Tribes?|descendants?)|community benefit|return(?:ing)? (?:of )?(?:results|data|collections)|descendant[- ]community access|local hire|hire local|training (?:of )?(?:local|Tribal|community)|capacity[- ]building|language (?:revitalization|program)|heritage program|shared with (?:the )?community)\b/i,
  A: /\b(?:consultation|consulted|government-to-government|free, prior,? and informed consent|FPIC|consent|data[- ]sharing agreement|data sovereignty|memorandum of agreement|Tribal Historic Preservation Officer|THPO|Tribal (?:council|government|approval|review)|community review)\b/i,
  R: /\b(?:personal communication|shared with permission|with (?:their |his |her )?permission|co-?authored|co-?authors?|reviewed by (?:the )?(?:Tribe|community|Elders?)|reported (?:back )?to (?:the )?(?:community|Tribe)|community meetings?|presentations? (?:to|in) (?:the )?(?:community|village))\b/i,
  E: /\b(?:confidential|confidentiality|culturally sensitive|NAGPRA|repatriation|minimi[sz]e harm|do no harm|respect(?:ful)?|ethic(?:s|al)|Indigenous data governance|CARE principles)\b/i
};
export function careChecklist(docText) {
  const res = {};
  for (const p of Object.keys(CARE)) { const m = docText.match(CUES[p]); res[p] = {found: !!m, cue: m ? m[0] : null}; }
  const indigenous = /\b(?:Indigenous|Native|Tribe|Tribal|Dene|Athabas[ck]an|Gwich'in|Koyukon|Ahtna|Dena'ina|Iñupiat|Inupiat|Yup'ik|Unangan|Alutiiq|Sugpiaq|Tlingit|Haida|Tsimshian|First Nations?|ancestral|descendant)\b/i.test(docText);
  return {applies: indigenous, principles: res};
}
