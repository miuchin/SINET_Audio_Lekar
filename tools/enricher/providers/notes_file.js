import fs from 'node:fs';

export const id = 'notes_file';

let cache = null;
let cachePath = null;

function empty(v){
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
}

function loadNotes(p){
  if(!p) return null;
  if(cache && cachePath === p) return cache;
  const txt = fs.readFileSync(p, 'utf8');
  cache = JSON.parse(txt);
  cachePath = p;
  return cache;
}

function safeObj(v){ return v && typeof v === 'object' && !Array.isArray(v) ? v : null; }

function mergeIntoEmpty(target, patch){
  if(!safeObj(target) || !safeObj(patch)) return false;
  let changed = false;
  for(const [k,v] of Object.entries(patch)){
    if(empty(target[k]) && !empty(v)){
      target[k] = v;
      changed = true;
    } else if(safeObj(target[k]) && safeObj(v)){
      if(mergeIntoEmpty(target[k], v)) changed = true;
    }
  }
  return changed;
}

function mergeFrequencies(symptom, freqNotes){
  if(!Array.isArray(symptom.frekvencije) || !safeObj(freqNotes)) return false;
  let changed = false;
  for(const f of symptom.frekvencije){
    const hz = Number(f?.hz ?? f?.value ?? 0);
    if(!Number.isFinite(hz) || hz <= 0) continue;
    const key = String(hz);
    const note = freqNotes[key] || freqNotes[key.replace(/\.0+$/,'')];
    if(!note) continue;

    // fill empty fields only
    if(empty(f.naziv) && !empty(note.naziv)) { f.naziv = note.naziv; changed = true; }
    if(empty(f.opis) && !empty(note.opis)) { f.opis = note.opis; changed = true; }
    if(empty(f.funkcija) && !empty(note.funkcija)) { f.funkcija = note.funkcija; changed = true; }
    if(empty(f.izvor) && !empty(note.izvor)) { f.izvor = note.izvor; changed = true; }
  }
  return changed;
}

export async function enrichSymptom(symptom, ctx){
  const notesFile = ctx?.notesFile || '';
  if(!notesFile) return { changed: false };

  let notes;
  try { notes = loadNotes(notesFile); } catch(e) { return { changed:false }; }
  if(!safeObj(notes)) return { changed:false };

  const symNotes = safeObj(notes.symptoms || notes.simptomi || null);
  const freqNotes = safeObj(notes.frequencies || notes.frekvencije || null);

  let changed = false;

  if(symNotes && symptom?.id && symNotes[symptom.id]){
    const patch = symNotes[symptom.id];
    // merge only into empty fields
    if(mergeIntoEmpty(symptom, patch)) changed = true;
  }

  if(mergeFrequencies(symptom, freqNotes)) changed = true;

  return { changed };
}
