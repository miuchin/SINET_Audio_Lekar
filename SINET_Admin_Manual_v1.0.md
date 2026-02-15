# SINET Admin Tools — Uputstvo i protokoli (v1.0)

**Autor:** miuchins (Svetozar Miuchin)  
**Koautor:** SINET AI (GPT Co-author / Engineering Partner)  
**Koncept:** SINET — Sinergija čoveka i AI za dobrobit svih

---

## 0) Svrha dokumenta

Ovo uputstvo objašnjava **kako se koristi SINET Admin Tools paket** (Audio Lekar + Inspector + Converter + DeDuplikator + NUTRI Studio), i definiše **operativne protokole** da bi:

- STL kanon ostao jedini „Source of Truth”
- izmene bile kontrolisane (bez gubitka polja / tabova)
- batch rad (50/100/150) bio ponovljiv i bez dupliranja
- offline rad bio stabilan (PWA / cache)

> **Disclaimer:** Informativno. Ne zamenjuje lekara, nutricionistu ili stručnu dijagnostiku.

---

## 1) Zlatna pravila rada (G0)

Ova pravila važe za sve module (katalog i nutri):

1) **STL je kanon** (Source of Truth). Runtime je derivat (generiše se).  
2) **Zero-break:** ništa ne sme “nestati” (tabovi, polja, opcije).  
3) **Audit log je read-only** (ako postoji).  
4) **Help sistem je obavezan** (u aplikaciji/alatima).  
5) **Delivery modovi:** Mode A (FULL FILE) ili Mode B (MICRO-PARTS) — ali u projektu preferiramo **fajl/ZIP isporuku**.

---

## 2) Struktura projekta (preporučeni layout)

Root (primer):
- `index.html` — glavna aplikacija (PWA)
- `index-nosw.html` — emergency/no-cache ulaz
- `admin.html` — Admin Tools “hub”
- `service-worker.js` — cache (opciono, ali preporučeno)
- `js/` — app, engine, db, catalog
- `data/` — kanonski JSON + exporti + pomoćni resursi
- `schema/` — JSON schema definicije
- `catalog/` — legacy/primeri/dokumenta

### 2.1 Kanonski fajlovi

**Simptomi (STL v1.1)**
- `data/SINET_STL.json`  ✅ (kanon)

**Simptomi (runtime v2)**
- `data/SINET_CATALOG.runtime.json`  (derivat/kompatibilnost)

**Namirnice (NUTRI_STL v1.0)**
- `data/NUTRI_STL.json` ✅ (kanon za NUTRI)
- `data/NUTRI_STL_SEED_from_NutriTablePro_v2.json` (seed/demo import)

> Ako u projektu postoje i `SINET_NUTRI_STL.json` fajlovi: **izaberi 1 kanon** (preporuka: `NUTRI_STL.json`) i ostale tretiraj kao kopije/izvoze.

---

## 3) Pokretanje lokalno (Manjaro/Linux)

U root folderu projekta (gde je `index.html`):

```bash
python -m http.server 8000
```

Otvaranje:
- Glavna app: `http://localhost:8000/index.html`
- Emergency/no-cache: `http://localhost:8000/index-nosw.html?fresh=1`
- Admin Tools: `http://localhost:8000/admin.html`

### 3.1 Service Worker i keš (PWA)

Ako posle zamene fajlova vidiš “staru verziju”:
- DevTools → Application → Service Workers → **Unregister**
- Storage → **Clear site data**
- Hard reload: **Ctrl+Shift+R**
- Ili koristi `index-nosw.html?fresh=...`

---

## 4) Admin Tools — pregled i kada se koristi koji alat

### 4.1 🎧 Audio Lekar (app)

Služi za:
- browsing kataloga
- audio player (start/pause/stop)
- prikaz/izbor frekvencija
- favoriti / preset (ako je uključeno u verziji)

Kada se koristi:
- za „end-user“ test
- za proveru da runtime generisanje nije pokvarilo player

---

### 4.2 🔎 Inspector (Audit kataloga)

Služi za:
- audit kvaliteta kataloga
- filtere tipa: “Fali MKB-10”, “Fali Psihosomatika”, “Fali Molitva”
- pregled jednog simptoma i edit polja
- (ako postoji) AI suggestion banner “AI prepoznao dopunu”

Radi i sa:
- STL (`meta + simptomi[]`)
- runtime (`meta + items[]`)

**Tipičan tok:**
1) `UČITAJ KATALOG`
2) Odaberi filter (npr. “Fali MKB-10”)
3) Prolaziš simptome, dopunjavaš polja
4) `SAČUVAJ IZMENЕ`
5) Na kraju — export / write-back u kanon (preko Converter-a)

---

### 4.3 🔁 Converter (STL ↔ runtime)

Služi za:
- auto-detekciju formata
- normalizaciju strukture
- konverziju STL ↔ runtime
- „write-back“: runtime pun → STL kanon pun

**Najvažniji scenario:**
- Imaš validan runtime (pun), ali STL je “skeleton” → Converter napravi STL koji ima nazive + holistiku + mkb.

---

### 4.4 🧹 DeDuplikator (duplikati)

Služi za:
- detekciju duplih simptoma
- checklist odluke (zadrži / obriši / merge)
- generisanje čistog STL fajla

**Preporuka:**
- pokreći Dedup posle svakog batch-a (20×50 za 1000 stavki)

---

### 4.5 🥗 Namirnice (NUTRI) Studio

Služi za:
- održavanje kanonskog `NUTRI_STL.json`
- import kanona (JSON)
- import SEED-a iz `NutriTable Pro` HTML
- export kanona (JSON)
- reset lokalne NUTRI DB (ako postoji IndexedDB sloj)

**Važno pravilo:**
- AI ne sme da izmišlja numeriku (kcal, g, mg). Numerika dolazi iz seed ili iz FDC/DB.

---

### 4.6 🧬 Generate Runtime iz STL

Služi za:
- generisanje `SINET_CATALOG.runtime.json` iz `SINET_STL.json`
- kompatibilnost sa alatima koji rade sa runtime formatom

**Tok:**
1) Klik “Koristi data/SINET_STL.json” ili učitaj STL fajl
2) Klik “Generiši runtime JSON”
3) Sačuvaj fajl u `data/` folder (ili preuzmi kroz browser)

---

## 5) Operativni protokol: održavanje kataloga simptoma (STL)

### P0 — Pre svake izmene (obavezno)
1) Napravi backup:
   - `data/SINET_STL.json` → `data/SINET_STL.BAK_YYYY-MM-DD.json`
2) Radi izmene nad kopijom ili staging fajlom, pa tek onda zameni kanon.

### P1 — Audit i triage
1) Inspector: učitaj katalog
2) Prođi filtere “Fali …” i napravi listu prioriteta
3) Popravi kritične stvari prvo: naziv, mkb10, uzrok, osnovni opisi

### P2 — Dopuna (manual/AI)
- Manual: upis u Inspector
- AI: radi u batch režimu (50/100) i vraćaj **patch** fajl, ne ceo kanon

### P3 — Normalizacija
- Converter: STL ↔ runtime normalizacija (po potrebi)

### P4 — Dedup
- DeDuplikator: očisti duplikate
- Sačuvaj „clean“ STL kao staging

### P5 — Write-back i zaključavanje
- finalni staging → postaje `data/SINET_STL.json` (kanon)
- čuvaj i “Export SVE” kao istoriju

### P6 — Offline verifikacija
1) `index-nosw.html` test
2) Učitaj katalog, otvori 3–5 simptoma
3) Proveri player start/stop
4) Admin: proveri runtime generator

---

## 6) Operativni protokol: NUTRI kanon + seed + batch

### N0 — Kanon (Source of Truth)
- `data/NUTRI_STL.json` je kanon.
- Seed služi samo za početnu bazu ili demo.

### N1 — Seed import (NutriTable Pro → kanon)
1) NUTRI Studio → Import SEED (HTML)
2) Import
3) Export kanona → snimi kao `data/NUTRI_STL.json`

### N2 — Batch obogaćivanje (50 / 100 / 150)
Preporuka:
- drži `meta.cursor.batch_size` (50/100/150)
- posle svakog batch-a radi:
  - import patch
  - dedup (ako se pojave duplikati ID/naziva)
  - export kanona

### N3 — Patch format (princip)
Umesto da AI vraća ceo kanon, vraća “notes/patch” fajl:
- `SINET_NUTRI_NOTES.json` (schema: “SINET_NUTRI_NOTES”, mode: enrich_batch)
- `notes[]` gde svaka stavka ima:
  - `id`
  - `set{ opis, tags, kompatibilnost, indikatori, sources }`

Zatim Admin/NUTRI alat radi **merge** patch-a u kanon.

### N4 — Biblioteka kompatibilnosti (pravila)
Održavaj “rule library” (min 25 pravila) za:
- vitamin↔mineral
- mineral↔mineral
- faktore (fitati/oksalati) kao “factor” tip

---

## 7) Protokol za Change Request (CR)

Minimalni format (mobile-friendly):
1) Verzija (npr. v15.6)
2) Problem (1–3 rečenice)
3) Očekivanje (“šta mora da radi”)
4) Zabranjeno (ne skraćuj, ne briši)
5) Deliverable (ENTIRE FILE / ZIP)

**Bez potrebe za linijama koda.**

---

## 8) Release protokol (svaka stabilna verzija)

1) Napravi `00_manifest_projekta_vX.Y.md` (verzija, datum, fix, known issues, next)
2) Prođi “validation checklist” (tabovi, export, import, offline, authorship)
3) Napravi ZIP “release” sa:
   - root + js + data + schema + tools
4) Testiraj:
   - desktop + mobile (bar smoke test)

---

## 9) Troubleshooting (najčešće)

### 9.1 “Vidim staru verziju”
- Service Worker: Unregister + Clear site data + hard reload
- ili koristi `index-nosw.html?fresh=...`

### 9.2 “JSON se ne učitava”
- proveri da nema trailing comma
- proveri da je UTF-8
- proveri veličinu fajla i RAM (654+ stavki je OK)

### 9.3 “STL prazno / Simptom 1…”
- to znači da STL nema mapirana polja
- rešenje: runtime → Converter → STL write-back

---

## 10) Sledeći plan (roadmap)

**Katalog:**
- kompletan Admin editor za sva polja STL (uključujući frekvencije + izvore)
- import/export patch-a
- dedupe checklist UX polish

**NUTRI:**
- batch engine (50/100/150) + cursor/next_cursor
- prompt generator (A/B/C) + Copy dugme
- import AI notes patch-a + merge
- offline check (da su NUTRI fajlovi u cache-u)
- 7-dnevni jelovnik generator (profil → menu JSON)

---

**KRAJ** ✅
