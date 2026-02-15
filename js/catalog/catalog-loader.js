/*
    ====== SINET PROJECT INFO ======
    Project: SINET Audio Lekar
    File: js/catalog/catalog-loader.js
    Version: 1.1
    Author: miuchins | Co-author: SINET AI
    Description: Fetch + normalize + search utilities for SINET_CATALOG.json
*/

export class CatalogLoader {
  constructor(url = "data/SINET_CATALOG.json") {
    this.url = url;
    this.data = null;
    this.items = [];
    this.isLoaded = false;
    this.error = null;
  }

  async load() {
    try {
      const response = await fetch(this.url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP greška! Status: ${response.status}`);
      const json = await response.json();
      const normalized = normalizeCatalog(json);

      this.data = normalized.raw;
      this.items = normalized.items;
      this.isLoaded = true;
      this.error = null;

      console.log(`CatalogLoader: Učitano ${this.items.length} stavki.`);
      return this.items;
    } catch (err) {
      console.error("CatalogLoader Error:", err);
      this.isLoaded = false;
      this.error = err?.message || String(err);
      this.data = null;
      this.items = [];
      return [];
    }
  }

  getItemById(id) { return this.items.find((item) => item.id === id); }
  getItemByUid(uid) {
    const u = Number(uid);
    return this.items.find((item) => Number(item.uid) === u);
  }

  search(query) {
    const lowerQ = String(query || "").trim().toLowerCase();
    if (!lowerQ) return this.items;
    return this.items.filter((item) => {
      const simptom = (item.simptom || "").toLowerCase();
      const oblast = (item.oblast || "").toLowerCase();
      const tags = Array.isArray(item.tags) ? item.tags.join(" ").toLowerCase() : "";
      const mkb = (item.mkb10 || "").toLowerCase();
      return simptom.includes(lowerQ) || oblast.includes(lowerQ) || tags.includes(lowerQ) || mkb.includes(lowerQ);
    });
  }
}

export async function loadCatalog(url = "data/SINET_CATALOG.json") {
  const loader = new CatalogLoader(url);
  const items = await loader.load();
  return { meta: loader.data?.meta || null, items, raw: loader.data };
}

export function normalizeCatalog(json) {
  if (Array.isArray(json)) return { raw: { meta: null, items: json }, items: json };
  const items =
    (json && Array.isArray(json.items) && json.items) ||
    (json && Array.isArray(json.entries) && json.entries) ||
    [];
  const raw = json || { meta: null, items };
  return { raw, items };
}
