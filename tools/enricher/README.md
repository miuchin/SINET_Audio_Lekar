# SINET Enricher Tool (skeleton)

Ovaj alat služi da popuni ("enrich") STL katalog **offline** — bez menjanja postojećih vrednosti, već samo dopunjava prazna polja.

## Principi
- **Jedan izvor istine:** ulaz je `SINET_STL.json` (canonical)
- **Ne prepisuj:** dopunjavaj samo prazna polja ("", null, undefined)
- **Audit trail:** svako pokretanje dodaje zapis u `meta.audit[]`
- **Proverljivost:** gde god može, dopuni `izvor` (URL / autor / delo / licenca)

## Kako se pokreće
```bash
node tools/enricher/enrich.js --in data/SINET_STL.json --out data/SINET_STL.enriched.json
```

Opcije:
- `--providers mkb10_local,freq_notes_local` (default: svi)
- `--dry-run` (ne piše fajl, samo prikazuje sažetak)

## Struktura
- `tools/enricher/enrich.js` – CLI + pipeline
- `tools/enricher/providers/*` – pluggable provajderi
- `tools/enricher/lib/*` – util (audit, safe-set, hash)

## Provider API (minimal)
Svaki provider exportuje:
```js
export const id = 'mkb10_local';
export function enrichSymptom(symptom, ctx) {
  // vrati { changed: boolean, patch: object }
}
```

## Audit format (`meta.audit[]`)
Primer zapisa:
```json
{
  "ts": "2026-02-10T10:00:00.000Z",
  "tool": "sinet-enricher",
  "toolVersion": "0.1.0",
  "mode": "enrich",
  "providers": ["mkb10_local", "freq_notes_local"],
  "input": "data/SINET_STL.json",
  "output": "data/SINET_STL.enriched.json",
  "summary": { "simptomi": 654, "updated": 12, "skipped": 642 }
}
```

---
Autor: miuchins + SINET AI


## Notes import (batch)
Ako želiš da uvezeš rezultate iz AI/web istraživanja u jedan fajl, koristi `--notes`:

```bash
node tools/enricher/enrich.js --in data/SINET_STL.json --out data/SINET_STL.enriched.json --notes data/ENRICH_NOTES.json --providers notes_file
```

Minimalni format `ENRICH_NOTES.json` (sve je opciono, ali *ključevi moraju biti string*):
```json
{
  "symptoms": {
    "sys-hitno-glavobolja": {
      "opis": "Kratak opis…",
      "mkb10": { "code": "R51", "opis": "Headache", "izvor": { "url": "https://…" } }
    }
  },
  "frequencies": {
    "95": { "naziv": "…", "opis": "…", "funkcija": "…", "izvor": { "url": "https://…" } }
  }
}
```

Pravila:
- Enricher **ne prepisuje postojeće vrednosti** – popunjava samo prazna polja.
- `frequencies` se mapira po `hz` (string: "95", "95.0", "432").
