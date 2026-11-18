// NEPA Plain Writer - settings and personal dictionary, saved on this device (browser storage).
import { parseWordList, parseSwaps } from './rules.js';
const KEY = 'nepa-plain-writer-v1';
const DEFAULTS = {
  words: [], swapsText: '', docType: 'ea', audience: 'technical', wordsPerPage: 500, longLimit: 25,
  enabled: {care: true, spelling: true, grammar: true, concise: true, plain: true, scicomm: true, cite: true, voice: true, nepa: true, personal: true, passive: true, filler: true, long: true}
};
let cache = null;
export function settings() {
  if (cache) return cache;
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  cache = Object.assign({}, DEFAULTS, s);
  cache.enabled = Object.assign({}, DEFAULTS.enabled, s.enabled || {});
  cache.swaps = parseSwaps(cache.swapsText);
  return cache;
}
export function saveSettings(patch) {
  const s = Object.assign(settings(), patch);
  if (patch.enabled) s.enabled = Object.assign({}, settings().enabled, patch.enabled);
  s.swaps = parseSwaps(s.swapsText);
  const {swaps, ...persist} = s;
  try { localStorage.setItem(KEY, JSON.stringify(persist)); } catch (e) {}
  cache = s;
  if (persistHook) { try { persistHook(JSON.stringify(persist)); } catch (e) {} }
  return s;
}
// Optional extra place to keep settings (Google Docs keeps them in your Google account).
let persistHook = null;
export function setPersistHook(fn) { persistHook = fn; }
export function loadSettingsJSON(json) {
  let o = {}; try { o = JSON.parse(json || '{}'); } catch (e) {}
  cache = Object.assign({}, DEFAULTS, o);
  cache.enabled = Object.assign({}, DEFAULTS.enabled, o.enabled || {});
  cache.swaps = parseSwaps(cache.swapsText);
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
}
export function addWords(raw) {
  const add = Array.isArray(raw) ? raw : parseWordList(raw);
  const set = new Set(settings().words);
  let n = 0; for (const w of add) if (!set.has(w)) { set.add(w); n++; }
  saveSettings({words: [...set].sort((a, b) => a.localeCompare(b))});
  return n;
}
export function removeWord(w) { saveSettings({words: settings().words.filter(x => x !== w)}); }
export function allPersonalWords() { return settings().words; }
let sharedWords = [];
export function setSharedWords(list) { sharedWords = list; }
export function personalWordSet() {
  const s = new Set(); for (const w of [...settings().words, ...sharedWords]) s.add(w.toLowerCase()); return s;
}
export function exportBackup() {
  const {words, swapsText, docType, audience, wordsPerPage, longLimit, enabled} = settings();
  return JSON.stringify({app: 'NEPA Plain Writer', version: 2, words, swapsText, docType, audience, wordsPerPage, longLimit, enabled}, null, 1);
}
export function importBackup(json) {
  const o = JSON.parse(json);
  if (o.words) addWords(o.words);
  const patch = {};
  for (const k of ['swapsText', 'docType', 'audience', 'wordsPerPage', 'longLimit', 'enabled']) if (o[k] !== undefined) patch[k] = o[k];
  saveSettings(patch);
}
