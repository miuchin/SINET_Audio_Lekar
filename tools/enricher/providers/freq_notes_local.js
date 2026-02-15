import { isEmpty } from '../lib/utils.js';

export const id = 'freq_notes_local';

// Extremely small example map; extend gradually.
// IMPORTANT: keep wording honest and non-medical. Prefer "tradicionalno se navodi".
const FREQ_MAP = {
  174: { naziv: "Solfeggio 174", funkcija: "Tradicionalno se navodi za smirenje i osećaj olakšanja.", izvor: { sistem: "Solfeggio", url: "" } },
  528: { naziv: "Solfeggio 528", funkcija: "Tradicionalno se povezuje sa pozitivnim stanjem i fokusom.", izvor: { sistem: "Solfeggio", url: "" } }
};

export function enrichSymptom(symptom, ctx) {
  const list = Array.isArray(symptom.frekvencije) ? symptom.frekvencije : [];
  let changed = false;

  for (const f of list) {
    const hz = Number(f.hz || f.value);
    if (!Number.isFinite(hz)) continue;

    const m = FREQ_MAP[hz];
    if (!m) continue;

    if (isEmpty(f.naziv) && m.naziv) { f.naziv = m.naziv; changed = true; }
    if (isEmpty(f.funkcija) && m.funkcija) { f.funkcija = m.funkcija; changed = true; }
    if (!f.izvor && m.izvor) { f.izvor = m.izvor; changed = true; }
  }

  return { changed, patch: changed ? { frekvencije: symptom.frekvencije } : null };
}
