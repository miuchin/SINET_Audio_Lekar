# SINET GitHub Patch v15.4.8.2 (iOS + Netlify fix)

Ovaj patch rešava 3 praktična problema:

1) **Netlify 404 za `data/SINET_STL.json`**  
   - dodaje kanonski fajl `data/SINET_STL.json` u repo (uklanja 404 i stabilizuje STL auto-detekciju).

2) **Service Worker nije robustan** (instalacija može da padne ako 1 fajl fali)  
   - menja install logiku: cache-uje assete pojedinačno i preskače 404.

3) **iPhone / iOS UI + background (best-effort)**  
   - `AKTIVIRAJ` dugme je sada **vidljivo** (nije više `display:none`)  
   - dodata je **safe-area** podrška (`viewport-fit=cover` + padding za notch)  
   - audio output se (na iOS-u) pokušava routovati kroz `<audio>` element (MediaStream) kao **best-effort** za lock-screen/background.

> Napomena (realnost iOS-a): Safari/PWA može i dalje povremeno pauzirati WebAudio u pozadini. Ovo je “best-effort” i uz UX hint ostaje preporuka: **ne zaključavati ekran tokom terapije** / koristiti *Add to Home Screen* + *Guided Access*.

---

## Kako primeniti (GitHub)

1. U repo root-u zameni:
   - `index.html`
   - `service-worker.js`
   - `js/app.js`
   - `js/audio/audio-engine.js`

2. U folderu `data/` dodaj:
   - `SINET_STL.json`

3. Commit + push na GitHub.

4. Netlify: redeploy (ili sačekaj auto deploy).

---

## Kako forsirati update (browser)

- Desktop Chrome: hard refresh (Ctrl+Shift+R)
- iOS Safari: Settings → Safari → Advanced → Website Data → (site) → Remove  
  ili: otvoriti site, pa u iOS Safari “aA” → Website Settings → Clear Data (ako postoji)

Datum: 2026-02-15
