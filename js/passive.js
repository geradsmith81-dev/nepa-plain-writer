// NEPA Plain Writer - passive voice: find passive clauses and suggest an active rewrite.
// "The site was recorded by the crew in 2019."  ->  "The crew recorded the site in 2019."
// "Twelve artifacts were identified."            ->  "We identified twelve artifacts."  (or "[who] identified ...")
// The rewrite is a suggestion: the card always shows it before anything changes.

// participle -> [simple past, base form] for irregular verbs
const IRR = {
  arisen: ['arose', 'arise'], awoken: ['awoke', 'awake'], borne: ['bore', 'bear'], beaten: ['beat', 'beat'], become: ['became', 'become'], begun: ['began', 'begin'],
  bent: ['bent', 'bend'], bitten: ['bit', 'bite'], blown: ['blew', 'blow'], broken: ['broke', 'break'], brought: ['brought', 'bring'], built: ['built', 'build'],
  burnt: ['burnt', 'burn'], bought: ['bought', 'buy'], caught: ['caught', 'catch'], chosen: ['chose', 'choose'], cut: ['cut', 'cut'], dealt: ['dealt', 'deal'],
  dug: ['dug', 'dig'], done: ['did', 'do'], drawn: ['drew', 'draw'], driven: ['drove', 'drive'], eaten: ['ate', 'eat'], fed: ['fed', 'feed'], felt: ['felt', 'feel'],
  fought: ['fought', 'fight'], found: ['found', 'find'], flown: ['flew', 'fly'], forbidden: ['forbade', 'forbid'], forgotten: ['forgot', 'forget'],
  forgiven: ['forgave', 'forgive'], frozen: ['froze', 'freeze'], gotten: ['got', 'get'], given: ['gave', 'give'], ground: ['ground', 'grind'], grown: ['grew', 'grow'],
  hung: ['hung', 'hang'], heard: ['heard', 'hear'], hidden: ['hid', 'hide'], hit: ['hit', 'hit'], held: ['held', 'hold'], hurt: ['hurt', 'hurt'], kept: ['kept', 'keep'],
  known: ['knew', 'know'], laid: ['laid', 'lay'], led: ['led', 'lead'], left: ['left', 'leave'], lent: ['lent', 'lend'], let: ['let', 'let'], lit: ['lit', 'light'],
  lost: ['lost', 'lose'], made: ['made', 'make'], meant: ['meant', 'mean'], met: ['met', 'meet'], overseen: ['oversaw', 'oversee'], overtaken: ['overtook', 'overtake'],
  paid: ['paid', 'pay'], put: ['put', 'put'], read: ['read', 'read'], ridden: ['rode', 'ride'], run: ['ran', 'run'], said: ['said', 'say'], seen: ['saw', 'see'],
  sought: ['sought', 'seek'], sold: ['sold', 'sell'], sent: ['sent', 'send'], set: ['set', 'set'], shaken: ['shook', 'shake'], shed: ['shed', 'shed'], shot: ['shot', 'shoot'],
  shown: ['showed', 'show'], shut: ['shut', 'shut'], sunk: ['sank', 'sink'], slain: ['slew', 'slay'], spoken: ['spoke', 'speak'], spent: ['spent', 'spend'],
  split: ['split', 'split'], spread: ['spread', 'spread'], stolen: ['stole', 'steal'], struck: ['struck', 'strike'], stuck: ['stuck', 'stick'], sworn: ['swore', 'swear'],
  swept: ['swept', 'sweep'], taken: ['took', 'take'], taught: ['taught', 'teach'], torn: ['tore', 'tear'], told: ['told', 'tell'], thought: ['thought', 'think'],
  thrown: ['threw', 'throw'], understood: ['understood', 'understand'], undertaken: ['undertook', 'undertake'], upheld: ['upheld', 'uphold'], worn: ['wore', 'wear'],
  woven: ['wove', 'weave'], won: ['won', 'win'], withdrawn: ['withdrew', 'withdraw'], written: ['wrote', 'write'], rewritten: ['rewrote', 'rewrite'], begotten: ['begot', 'beget']
};
const IRR_RE = Object.keys(IRR).join('|');
// -ed participles that are adjectives or nouns, not passives
const NOT_PART = new Set(['need','feed','seed','speed','bleed','breed','creed','deed','heed','reed','weed','bed','red','shed','sled','wed','bred','fled','hundred','kindred','sacred','naked','wicked','rugged','ragged','jagged','crooked','beloved','aged','learned','wretched','tired','interested','concerned','based','located','dated','required','related','supposed','used','married','qualified','limited','detailed','advanced','experienced','skilled','talented','complicated','sophisticated','dedicated','determined','balanced','mixed','varied','unpublished','unrecorded','undisturbed','undated','unexcavated','untested','situated','composed','comprised','involved','pleased','excited','surprised','prepared','scheduled','expected','designed','intended','allowed','permitted','authorized','proposed','considered','listed','eligible','exposed','buried','preserved','disturbed','associated','confined','restricted','closed','opened','dominated','characterized','known']);
// keep only when "by" names an actor: then even "is located by" etc. are rewritten
const ADJ_UNLESS_BY = NOT_PART;
const ADV = '(?:not|also|often|then|now|generally|typically|usually|still|already|further|previously|currently|newly|largely|primarily|partially|fully|well|first|later|subsequently|initially|recently|systematically|carefully|routinely|commonly|frequently|rarely|only|thus|therefore|consistently|ultimately|probably|likely|possibly)';
const AUX = '(is|are|was|were|(?:has|have|had)(?:\\s+' + ADV + ')?\\s+been|(?:will|would)(?:\\s+' + ADV + ')?\\s+have\\s+been|(?:will|would|can|could|may|might|must|should|shall)(?:\\s+' + ADV + ')?\\s+be)';
const PASSIVE = new RegExp('\\b' + AUX + '\\s+(?:(' + ADV + '(?:\\s+' + ADV + ')?)\\s+)?(\\w+ed|' + IRR_RE + ')\\b', 'gi');

const DOUBLE_KEEP = /(ll|ss|ff|dd|zz|ck)$/;
const NO_E = new Set(['visit','limit','edit','exhibit','inhibit','deposit','credit','audit','benefit','target','budget','market','profit','posit','solicit','elicit',
  'inherit','prohibit','interpret','bracket','pocket','blanket','ticket','forfeit','inhabit','merit','orbit','spirit','consider','cover','offer','enter','order','alter',
  'gather','monitor','register','filter','discover','recover','render','wonder','answer','deliver','differ','author','anchor','vendor','sponsor','mentor','honor',
  'color','favor','labor','harbor','factor','doctor','tutor','mirror','motor','flavor','humor','open','happen','listen','threaten','strengthen','widen','deepen',
  'abandon','summon','question','mention','position','condition','section','partition','fashion','reason','season','poison','imprison','label','model','travel',
  'cancel','signal','catalog','total','level','channel','tunnel','fuel','develop','gallop','gossip','envelop','focus','bias','benefit','parallel','marshal','pencil','counsel']);
// participle -> base form ("located" -> "locate", "mapped" -> "map", "identified" -> "identify")
export function baseForm(part) {
  const p = part.toLowerCase();
  if (IRR[p]) return IRR[p][1];
  if (!p.endsWith('ed')) return p;
  if (p.endsWith('ied') && p.length > 4) return p.slice(0, -3) + 'y';
  const stem = p.slice(0, -2);
  if (stem.endsWith('e')) return p.slice(0, -1);                         // agreed -> agree
  if (NO_E.has(stem)) return stem;
  if (DOUBLE_KEEP.test(stem)) return stem;                                // installed, assessed, added
  if (/([b-df-hj-np-tv-z])\1$/.test(stem)) return stem.slice(0, -1);      // mapped -> map, occurred -> occur
  const last = stem.slice(-1), prev = stem.slice(-2, -1), prev2 = stem.slice(-3, -2);
  const V = c => 'aeiou'.includes(c);
  if (last === 'u') return stem + 'e';                                    // continued -> continue
  if ('vzc'.includes(last)) return stem + 'e';                            // observe, analyze, place (but not "ck", handled above)
  if (last === 'g') return stem + 'e';                                    // manage, judge, change
  if (last === 's') return stem + 'e';                                    // use, propose, collapse, increase (ss handled above)
  if (last === 'l' && !V(prev) && !'rwl'.includes(prev)) return stem + 'e'; // sample, settle
  if ('hwxy'.includes(last)) return stem;                                 // reach, follow, mix, survey
  if (!V(prev)) return stem;                                              // consonant cluster: record, collect, conduct, form
  // single vowel before the final consonant
  if (V(prev2)) {                                                         // vowel pair: treat, clean, gain, shout (but -iate, -uate, -uire)
    if (last === 't' && (prev2 === 'i' || prev2 === 'u') && prev === 'a') return stem + 'e';   // repatriate, evaluate
    if (last === 'r' && prev2 === 'u' && prev === 'i') return stem + 'e';                       // require, acquire
    return stem;
  }
  if (last === 'n' && (prev === 'o' || prev === 'e')) return stem;        // abandon, open (zone is rare)
  if (last === 'r' && prev === 'e') return stem;                          // consider, cover (mostly in NO_E)
  return stem + 'e';                                                      // locate, note, describe, determine, compile, name, shape, store
}
export function pastForm(part) { const p = part.toLowerCase(); return IRR[p] ? IRR[p][0] : p; }
function thirdPerson(base) {
  if (base === 'have') return 'has'; if (base === 'do') return 'does'; if (base === 'be') return 'is';
  if (/(s|x|z|ch|sh|o)$/.test(base)) return base + 'es';
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + 'ies';
  return base + 's';
}
const OBJ = {i: 'me', we: 'us', they: 'them', he: 'him', she: 'her', who: 'whom', it: 'it', you: 'you'};
function asObject(np, sentenceInitial) {
  const w = np.trim(); const low = w.toLowerCase();
  if (OBJ[low]) return OBJ[low];
  // A sentence-initial common noun ("Burials", "Charcoal samples") loses its capital when it moves; acronyms and multi-word names keep theirs.
  const ws = w.split(/\s+/);
  if (sentenceInitial && /^[A-Z][a-z]/.test(ws[0]) && !(ws[1] && /^[A-Z]/.test(ws[1]))) return w.charAt(0).toLowerCase() + w.slice(1);
  // lower-case a sentence-initial determiner or number word; keep proper nouns
  if (/^(?:The|A|An|This|These|That|Those|Our|Its|Their|His|Her|Each|Every|All|Some|Most|Many|Several|Few|No|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Twenty|Thirty|Forty|Fifty|Hundreds|Thousands|Both|Any|Another|Such|Further|Additional|Other)\b/.test(w)) return w.charAt(0).toLowerCase() + w.slice(1);
  return w;
}
function plural(np) {
  const w = np.trim().toLowerCase();
  if (/^(?:we|they|you|i)$/.test(w)) return true;
  if (/\band\b/.test(w)) return true;
  const head = w.replace(/\s+(?:of|from|in|at|on|for|with)\s+.*$/, '').split(/\s+/).pop();
  return /[^su]s$/.test(head) || /(?:people|data|remains|personnel|staff|crew members|police|media)$/.test(head);
}
const AGENT_START = /^(?:the|a|an|our|their|its|his|her|this|these|those|we|us|they|them|you|staff|crew|archaeologists?|researchers?|investigators?|one|two|three|four|five|six|seven|eight|nine|ten|several|many|multiple|local|Tribal|tribal|community|federal|state|agency|project|[A-Z][\w'’-]*)\b/;
const INSTRUMENT = /^(?:XRF|pXRF|AMS|GIS|GPS|LiDAR|LIDAR|SEM|OSL|TL|ICP-MS|INAA|FTIR|XRD|GPR|UAV|DGPS|RTK|hand|screening|flotation|radiocarbon|machine|backhoe|excavator)\b/;
const NOT_AGENT = /^(?:hand|means|mistake|accident|chance|default|far|then|now|way|virtue|comparison|contrast|weight|volume|area|length|depth|\d)/i;
const AGENT_STOP = /\s+(?:in|at|on|during|from|with|for|near|using|after|before|between|within|under|over|along|to|into|through|because|since|as|when|while|where|which|that|who|but|prior|following|according|throughout|around|across|beside|below|above|behind|beyond|via|without|despite|against|toward|towards|upon|onto|among|amid|like|unlike|until|except|outside|inside|so|than|if|once|whereas|although|though|whether|then|now|today|later|again|early|late|in order|on behalf|each|every|per|annually|yearly|daily|weekly|seasonally|again|also|and\s+(?:was|were|is|are|has|have|had|then|later|will|would|subsequently))\b|[,;:.!?()]|$/;

function conjugate(aux, part, agentPlural, isWe) {
  const a = aux.toLowerCase().replace(/\s+/g, ' ');
  const base = baseForm(part), past = pastForm(part);
  const partLc = part.toLowerCase();
  if (a === 'was' || a === 'were') return past;
  if (a === 'is' || a === 'are') return (agentPlural || isWe) ? base : thirdPerson(base);
  if (a === 'has been' || a === 'have been') return ((agentPlural || isWe) ? 'have ' : 'has ') + partLc;
  if (a === 'had been') return 'had ' + partLc;
  if (a === 'will have been' || a === 'would have been') return a.replace(' been', '') + ' ' + partLc;
  const modal = a.replace(/ be$/, '');
  return modal + ' ' + base;
}

// Returns [{start, end, aux, part, fixes:[{label,start,end,text}]}]
export function findPassives(text) {
  const out = [];
  for (const m of text.matchAll(PASSIVE)) {
    let aux = m[1].replace(/\s+/g, ' '), adv = m[2] || '', part = m[3];
    const inner = aux.match(new RegExp('^(\\w+) (' + ADV + ') (.+)$', 'i'));      // "has also been" -> aux "has been", adverb "also"
    if (inner) { aux = inner[1] + ' ' + inner[3]; adv = (inner[2] + (adv ? ' ' + adv : '')); }
    const p = part.toLowerCase();
    const after = text.slice(m.index + m[0].length);
    const by = after.match(/^\s+by\s+(?!\s)/);
    let agent = null, agentEnd = m.index + m[0].length;
    if (by) {
      const rest = after.slice(by[0].length);
      if (AGENT_START.test(rest) && !NOT_AGENT.test(rest) && !INSTRUMENT.test(rest)) {
        const stop = rest.search(AGENT_STOP);
        const cand = rest.slice(0, stop < 0 ? rest.length : stop).trim();
        if (cand && cand.split(/\s+/).length <= 8) { agent = cand; agentEnd = m.index + m[0].length + by[0].length + rest.indexOf(cand) + cand.length; }
      }
    }
    if (!agent && (ADJ_UNLESS_BY.has(p) || (!IRR[p] && !p.endsWith('ed')))) continue;
    if (/^\s+(?:to|that|than|of|about|with)\b/.test(after) && !agent && /(?:required|expected|known|considered|believed|thought|said|reported|designed|intended|needed|asked|allowed)$/.test(p)) {
      // "is required to", "is expected that" - flag without a rewrite
      out.push({start: m.index, end: m.index + m[0].length, coreStart: m.index, coreEnd: m.index + m[0].length, fixes: []}); continue;
    }
    // subject: from the start of the clause up to the auxiliary
    const before = text.slice(0, m.index);
    const cut = Math.max(before.search(/[^.!?;:]*$/), 0);
    let clauseStart = cut;
    const clause = before.slice(cut);
    const comma = clause.lastIndexOf(', ');
    let intro = '';
    if (comma >= 0) { intro = clause.slice(0, comma + 2); clauseStart = cut + comma + 2; }
    let subject = text.slice(clauseStart, m.index);
    const lead = subject.match(/^\s*/)[0]; clauseStart += lead.length; subject = subject.trim();
    // relative clause: "... artifacts that were recovered by the crew" -> "that the crew recovered"
    const conj = subject.match(/^(?:and|but|or|so|yet)\s+/i);              // ", and charcoal was collected" -> keep "and" outside the rewrite
    if (conj) { clauseStart += conj[0].length; subject = subject.slice(conj[0].length); }
    const rel = subject.match(/^(.*\b)(that|which|who)$/i);
    let relWord = null;
    if (rel) { relWord = rel[2]; clauseStart += rel[1].length; subject = relWord; }
    else {
      // Split at a subordinator ("because the site ...") always; at "and/but/or" only when a full clause comes before it
      // ("We dug, and artifacts were ...") - never inside a compound subject ("Microblades and debitage were ...").
      const sub2 = subject.match(/^(.*?\b(?:because|although|while|when|since|if|so|after|before|where|as|whereas)\s+)(.+)$/i)
        || subject.match(/^(.*\b(?:and|but|or)\s+)(.+)$/i);
      const finite = t => /\b(?:is|are|was|were|has|have|had|did|does|do|will|would|can|could|\w+ed|found|made|took|dug|saw|went|began)\b/i.test(t);
      if (sub2 && sub2[2].split(/\s+/).length <= 10 && (!/\b(?:and|but|or)\s+$/i.test(sub2[1]) || finite(sub2[1].replace(/\b(?:and|but|or)\s+$/i, '')))) {
        clauseStart += sub2[1].length; subject = sub2[2];
      }
    }
    const words = subject ? subject.split(/\s+/).length : 0;
    const elided = !subject || /\b(?:and|or|but|the|a|an|their|its|his|her|our|my|your|this|these|those|of|to|for|with)$/i.test(subject) || /^(?:their|its|his|her|our|my|your)$/i.test(subject) || /\b(?:is|are|was|were|has|have|had|will|would|did|does|do|been|be)\b/i.test(subject);
    const fixes = [];
    const atSentenceStart = /(?:^|[.!?]\s+)$/.test(text.slice(0, clauseStart)) || (clauseStart === cut + lead.length && !intro);
    const sharedSubject = /^\s+(?:and|or|but)\s+(?:was|were|is|are|has|have|had|will|would|then)\b/i.test(text.slice(agent ? agentEnd : m.index + m[0].length));
    if (!elided && !sharedSubject && words >= 1 && words <= 12 && !/^(?:it|there)\b/i.test(subject)) {
      const actorOpts = agent ? [agent] : ['we', '[who]'];
      for (const actor of actorOpts) {
        const isWe = actor.toLowerCase() === 'we';
        const verb = conjugate(aux, part, plural(actor), isWe);
        const advTxt = adv ? adv.toLowerCase() + ' ' : '';
        let actorTxt = actor;
        if (/^(?:The|A|An|Our|Their|This|These|Those)\b/.test(actorTxt)) actorTxt = actorTxt.charAt(0).toLowerCase() + actorTxt.slice(1);
        let rewritten;
        if (relWord) rewritten = relWord.toLowerCase() + ' ' + actorTxt + ' ' + advTxt + verb;
        else {
          // "has also been recorded" -> "we have also recorded": put the adverb after the first auxiliary word
          const vp = verb.split(' ');
          const verbTxt = vp.length > 1 && advTxt ? vp[0] + ' ' + advTxt + vp.slice(1).join(' ') : advTxt + verb;
          rewritten = actorTxt + ' ' + verbTxt + ' ' + asObject(subject, atSentenceStart && !intro);
        }
        if (atSentenceStart && !relWord) rewritten = rewritten[0] === '[' ? '[' + rewritten.charAt(1).toUpperCase() + rewritten.slice(2) : rewritten.charAt(0).toUpperCase() + rewritten.slice(1);
        const end = agent ? agentEnd : m.index + m[0].length;
        fixes.push({label: 'Rewrite: ' + rewritten + (actor === '[who]' ? '  (name who did it)' : ''), start: clauseStart, end, text: rewritten});
      }
      out.push({start: clauseStart, end: agent ? agentEnd : m.index + m[0].length, coreStart: m.index, coreEnd: agent ? agentEnd : m.index + m[0].length, fixes});
    } else {
      out.push({start: m.index, end: agent ? agentEnd : m.index + m[0].length, coreStart: m.index, coreEnd: agent ? agentEnd : m.index + m[0].length, fixes: []});
    }
  }
  return out;
}
