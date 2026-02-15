# SINET GitHub Patch v15.4.8.1

Ovaj mini paket rešava 2 blokera za Public-Demo repo:

1) `data/SINET_STL.json` (kanonski STL fajl) je nedostajao, a `service-worker.js` ga pre-cache-uje.
2) `sinet-nutri-studio_v1.html` je referenciran u dokumentaciji, ali nije bio u repo root-u.

## Kako primeniti

1. U repo root-u:
   - kopiraj `sinet-nutri-studio_v1.html`
   - zameni `service-worker.js`
2. U folderu `data/`:
   - dodaj `SINET_STL.json`

Zatim push na GitHub / redeploy na Netlify.

Napomena: `service-worker.js` u ovom paketu ima novi `CACHE_NAME` (`v15.4.8.1`), da bi se korisnicima lakše povukao update.
