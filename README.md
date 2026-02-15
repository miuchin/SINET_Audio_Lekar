# SINET Audio Lekar + NUTRI Pro (Public Demo)

**Authors:** miuchins (Svetozar Miuchin) • **Co-author:** SINET AI  
**Status:** Public demo + ongoing development  
**Date:** 2026-02-15

> ⚠️ Medical disclaimer: This project is **educational/informational** and **not a medical device**. It does not provide diagnosis or treatment. Always consult qualified medical professionals.

---

## 🇷🇸 SR — Pregled

SINET je offline‑friendly web aplikacija (PWA) za:
- **Audio Lekar**: holistički protokoli (frekvencije), katalog simptoma, playlist/protokoli, favoriti, pomoć (Help).
- **Admin Tools**: Inspector (audit), Converter (STL ↔ runtime), DeDuplikator, Runtime generator.
- **NUTRI Pro** (Preview): kanonska baza namirnica + batch obogaćivanje putem AI “NOTES patch” sistema (bez izmišljanja numerike).

### Šta je kanon?
- `data/SINET_STL.json` = **KANON** za simptome (Source of Truth)
- `data/NUTRI_STL.json` = **KANON** za namirnice (Source of Truth)
- Runtime JSON (npr. `SINET_CATALOG.runtime.json`) je **derivat** (generiše se iz kanona)

### PUBLIC redosled (strane)
1) **App (demo):** `index.html`  
2) **Admin Tools (preview):** `admin.html`  
3) **NUTRI Studio (preview):** `sinet-nutri-studio_v1.html`

---

## 🇬🇧 EN — Overview

SINET is an offline‑friendly web app (PWA) that includes:
- **Audio Doctor**: holistic frequency protocols, symptoms catalog, playlists/protocols, favorites, help.
- **Admin Tools**: Inspector (audit), Converter (STL ↔ runtime), DeDuplicator, Runtime generator.
- **NUTRI Pro** (Preview): canonical foods database + batch enrichment via AI “NOTES patch” workflow (no invented numeric nutrition).

### What is canonical?
- `data/SINET_STL.json` = **CANON** for symptoms (Source of Truth)
- `data/NUTRI_STL.json` = **CANON** for foods (Source of Truth)
- Runtime JSON is a **derivative** generated from canon.

### PUBLIC order (pages)
1) **App:** `index.html`  
2) **Admin Tools:** `admin.html`  
3) **NUTRI Studio:** `sinet-nutri-studio_v1.html`

---

# Features (Detaljno / Detailed)

## 1) Audio Lekar (App)
- Loads catalog from `/data/` (STL canon)
- Search by name/description/MKB-10
- Areas (Oblasti) + symptom listing
- Details modal: medical (MKB-10), holistic (psychosomatic cause, prayer/affirmation, folk remedy)
- Playlist/protocol: ordered playback, timers
- Favorites
- Exports (STL JSON view/all + legacy TXT)
- PWA offline + `index-nosw.html` (no-cache emergency)

## 2) Admin Tools
- Inspector: audit missing fields, filters, STL/runtime viewing
- Converter: STL ↔ runtime, auto-detection, normalization, write-back
- DeDuplicator: duplicate detection + merge checklist
- Runtime generator: `SINET_STL.json` → runtime JSON
- NUTRI Studio (Preview): batch engine + prompt generator + import NOTES + merge + export canon

## 3) NUTRI Pro (Preview) — workflow
1) Load canon: `data/NUTRI_STL.json`
2) Choose batch: offset + size (50/100/150)
3) Generate Prompt A (enrich_batch) → send to AI
4) AI returns SINET_NUTRI_NOTES (JSON-only)
5) Import NOTES → Merge into canon
6) Export canon → new `NUTRI_STL.json`

> Numeric values (kcal, mg, %) must not be invented. If no source is available, mark “NEEDS VERIFICATION”.

---

# Install & Run

## Local
```bash
python -m http.server 8000
```

Open:
- App: `http://localhost:8000/index.html`
- Admin: `http://localhost:8000/admin.html`
- No-cache: `http://localhost:8000/index-nosw.html?fresh=1`

## Netlify (static)
- Build command: (none)
- Publish directory: repo root `/`

---

# Roadmap
See: `00_plan_razvoja_SINET_v1.0.md`

---

# License
TBD (MIT / Apache-2.0 / CC BY-NC for data, etc.)
