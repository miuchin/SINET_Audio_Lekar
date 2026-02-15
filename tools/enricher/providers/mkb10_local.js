import { safeSet } from '../lib/utils.js';

export const id = 'mkb10_local';

// Minimal offline map (extend as you grow)
const MAP = {
  "pain-toothache-sos": { sifra: "K00-K08" },
  "zubi-vilica-zubobolja": { sifra: "K00-K08" },
  "zubi-vilica-upala-zubnog-zivca": { sifra: "K04" }
};

export function enrichSymptom(symptom, ctx) {
  const m = MAP[symptom.id];
  if (!m) return { changed: false, patch: null };

  let changed = false;
  symptom.mkb10 = symptom.mkb10 || {};
  changed = safeSet(symptom, 'mkb10.sifra', m.sifra) || changed;
  if (m.naziv) changed = safeSet(symptom, 'mkb10.naziv', m.naziv) || changed;

  // ensure mkb source base
  if (!symptom.mkb10.izvor) symptom.mkb10.izvor = { sistem: "ICD-10 / MKB-10", url: "" };

  return { changed, patch: changed ? { mkb10: symptom.mkb10 } : null };
}
