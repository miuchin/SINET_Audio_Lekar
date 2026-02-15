/*
  SINET STL → Runtime Adapter (v1.1)
  File: js/catalog/stl-adapter.js

  Purpose:
    App UI/player expects "runtime" items:
      { items: [ { id, simptom, opis, oblast, frekvencije:[{value,svrha,izvor,enabled}], holisticki:{...} } ] }

    Canonical STL uses:
      { meta, simptomi: [ { id, uid?, naziv, opis, mkb10, psihosomatika, afirmacija, molitva, narodni_lek, akupresura, frekvencije:[{hz,naziv,opis,funkcija,izvor}] } ] }

  This adapter:
    - Detects STL payload
    - Converts into runtime items[]
    - Adds reasonable defaults for oblast + presets (sys-hitno-*)
    - Preserves rich source objects (keeps original under *_obj fields)
*/

function isObj(v){ return v && typeof v === 'object' && !Array.isArray(v); }

function slugToTitle(slug){
  return String(slug || "")
    .replace(/[_]+/g, "-")
    .replace(/-+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(w => w.length ? (w[0].toUpperCase() + w.slice(1)) : w)
    .join(" ");
}

function deriveNameFromId(id){
  const s = String(id || "");
  if (!s) return "";
  if (s.startsWith("sys-hitno-")) return "HITNO: " + slugToTitle(s.slice("sys-hitno-".length));
  const parts = s.split("-");
  if (parts.length > 1) return slugToTitle(parts.slice(1).join("-"));
  return slugToTitle(s);
}

function sourceToString(src){
  if (!src) return '';
  if (typeof src === 'string') return src;
  if (!isObj(src)) return String(src);

  // Prefer URL as most "verifiable" in UI
  const url = src.url || src.URL || src.link;
  if (url) return String(url);

  // Then system/author/work
  const parts = [];
  if (src.sistem) parts.push(src.sistem);
  if (src.tradicija) parts.push(src.tradicija);
  if (src.autor) parts.push(src.autor);
  if (src.delo) parts.push(src.delo);
  if (src.licenca) parts.push(src.licenca);
  return parts.filter(Boolean).join(' • ');
}

function mkbToBadge(mkb){
  if (!mkb) return '';
  if (typeof mkb === 'string') return mkb;
  if (!isObj(mkb)) return String(mkb);
  return mkb.code || mkb.sifra || mkb.sifra_mkb || '';
}

function freqToRuntime(f){
  if (!f) return null;

  const hz = Number(f.hz ?? f.value ?? f.Hz ?? 0);
  if (!Number.isFinite(hz) || hz <= 0) return null;

  const naziv = (f.naziv || '').toString().trim();
  const opis = (f.opis || f.description || '').toString().trim();
  const funkcija = (f.funkcija || f.svrha || '').toString().trim();

  // Recommended/optimal duration (minutes) if present in STL (optional)
  const recMinRaw =
    (f.trajanje_min ?? f.trajanjeMin ?? f.preporuceno_min ?? f.preporucenoMin ?? f.preporucenoTrajanjeMin ?? null);
  const trajanje_min = (recMinRaw === null || recMinRaw === undefined || recMinRaw === '')
    ? null
    : Math.max(0, Number(recMinRaw) || 0);

  // "svrha" is the primary short label used by legacy UI lists
  const svrha = (funkcija || naziv || opis || '').toString();

  const izvorObj = f.izvor || null;
  const izvor = sourceToString(izvorObj) || '—';

  return {
    value: hz,

    // Rich STL fields (kept for Player + Inspector)
    naziv,
    opis,
    funkcija,
    trajanje_min,

    // Legacy runtime fields (for existing UI)
    svrha,
    izvor,
    izvor_obj: izvorObj,
    enabled: f.enabled !== false,

    // For Now-Playing list
    desc: svrha,
    src: izvor
  };
}

function holistikaFromSTL(stl){
  const h = {};

  if (stl.psihosomatika) {
    h.psihosomatika = {
      uzrok: stl.psihosomatika.uzrok || '',
      lek: stl.psihosomatika.lek || ''
    };
  }

  if (stl.afirmacija) {
    h.afirmacija = {
      tekst: stl.afirmacija.tekst || '',
      autor: stl.afirmacija.autor || '',
      izvor: stl.afirmacija.izvor || ''
    };
  }

  if (stl.molitva) {
    // legacy UI used "duhovnost.tekst"
    h.duhovnost = {
      tekst: stl.molitva.tekst || '',
      izvor: stl.molitva.izvor || ''
    };
    h.molitva = { ...h.duhovnost };
  }

  if (stl.narodni_lek) {
    // STL: { tekst, napomena, izvor }
    const opis = stl.narodni_lek.opis || stl.narodni_lek.tekst || '';
    h.saveti = { narodno: opis };
    h.narodni_lek = { opis };
  }

  return h;
}

function oblastFromId(id){
  const s = String(id || "");
  if (!s) return "Ostalo";
  if (s.startsWith("sys-hitno-")) return "01. PRVA POMOĆ (AKUTNO)";

  const prefix = s.split("-")[0];
  const map = {
    sys: "Sistem",
    rife: "Rife (osnovno)",
    akutne: "Akutno",
    bolovi: "Bolovi",
    varenje: "Varenje",
    nervni: "Nervni sistem",
    disanje: "Disanje",
    jetra: "Jetra i žuč",
    neuro: "Neurologija",
    koza: "Koža",
    psycho: "Psihosomatika",
    psy: "Psihosomatika",
    oci: "Oči",
    kosa: "Kosa",
    hormoni: "Hormoni",
    imunitet: "Imunitet",
    zubi: "Zubi i vilica"
  };
  return map[prefix] || slugToTitle(prefix) || "Ostalo";
}

export function isSTLCatalog(data){
  return isObj(data) && Array.isArray(data.simptomi) && isObj(data.meta);
}

export function stlToRuntimeItems(stlCatalog){
  const simptomi = Array.isArray(stlCatalog?.simptomi) ? stlCatalog.simptomi : [];
  const items = [];

  for (const s of simptomi) {
    if (!s || !s.id) continue;

    const freqs = Array.isArray(s.frekvencije)
      ? s.frekvencije.map(freqToRuntime).filter(Boolean)
      : [];

    // display name: prefer STL naziv unless it is a placeholder like "Simptom 123"
    let display = (s.naziv || s.simptom || String(s.id)).toString().trim();
    if (/^Simptom\s+\d+$/i.test(display) || !display) {
      display = deriveNameFromId(s.id);
    }

    const isHitno = String(s.id).startsWith("sys-hitno-");
    const quickGroup = s.quickGroup || (isHitno ? "01. PRVA POMOĆ (AKUTNO)" : undefined);
    const seniorQuick = (typeof s.seniorQuick === "boolean") ? s.seniorQuick : isHitno;

    items.push({
      uid: s.uid ?? null,
      id: String(s.id),
      version: "stl",
      status: "active",

      oblast: s.oblast || oblastFromId(s.id),
      podOblast: s.podOblast ?? null,

      simptom: display,
      opis: s.opis || '',

      mkb10: mkbToBadge(s.mkb10),
      mkb10_obj: s.mkb10 || null,

      holisticki: holistikaFromSTL(s),

      akupresura: s.akupresura || null,

      frekvencije: freqs,

      // Presets / quick help
      seniorQuick,
      quickGroup,

      _stl: s
    });
  }

  return items;
}

export function normalizeCatalogPayload(raw){
  if (!raw) return { meta: null, items: [] };

  // Already runtime-ish
  if (Array.isArray(raw)) return { meta: null, items: raw };
  if (Array.isArray(raw.items)) return { meta: raw.meta || null, items: raw.items };
  if (Array.isArray(raw.entries)) return { meta: raw.meta || null, items: raw.entries };

  // STL
  if (isSTLCatalog(raw)) {
    return { meta: raw.meta || null, items: stlToRuntimeItems(raw) };
  }

  return { meta: raw.meta || null, items: [] };
}
