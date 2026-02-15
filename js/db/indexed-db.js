/*
  SINET Audio Lekar — IndexedDB Layer
  File: js/db/indexed-db.js
  Version: 1.2
  Author: miuchins | Co-author: SINET AI
  Notes:
    - Favorites, main playlist, last session resume, audit log (append-only)
*/

const DB_CONFIG = {
  name: "SINET_Audio_DB",
  version: 3,
};

class SinetDB {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  async init() {
    if (this.isReady && this.db) return true;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains("state")) {
          db.createObjectStore("state", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("favorites")) {
          db.createObjectStore("favorites", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("playlists")) {
          db.createObjectStore("playlists", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("audit_log")) {
          db.createObjectStore("audit_log", { keyPath: "id", autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;
        console.log("SINET DB: Ready");
        resolve(true);
      };

      request.onerror = () => {
        console.error("SINET DB: Init error", request.error);
        reject(request.error);
      };
    });
  }

  async _ensure() {
    if (!this.db || !this.isReady) await this.init();
  }

  _tx(storeName, mode) {
    if (!this.db) throw new Error("DB not initialized");
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }

  _put(storeName, item) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, "readwrite");
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  _getRaw(storeName, key) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, "readonly");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  _get(storeName, key) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, "readonly");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? (req.result.data ?? req.result) : null);
      req.onerror = () => reject(req.error);
    });
  }

  _getAll(storeName) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, "readonly");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  _delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, "readwrite");
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  /* ---------- Audit (append-only) ---------- */
  async logAction(category, action, details = "") {
    try {
      await this._ensure();
      await this._put("audit_log", {
        timestamp: new Date().toISOString(),
        category, action, details,
        userAgent: navigator.userAgent
      });
    } catch(e) {}
  }

  async getAuditLog(limit = 500) {
    await this._ensure();
    const all = await this._getAll("audit_log");
    return all.slice(Math.max(0, all.length - limit));
  }

  /* ---------- Favorites ---------- */
  async toggleFavorite(simptomId) {
    await this._ensure();
    const exists = await this._getRaw("favorites", simptomId);
    if (exists) {
      await this._delete("favorites", simptomId);
      this.logAction("USER", "Removed Favorite", simptomId);
      return false;
    }
    await this._put("favorites", { id: simptomId, addedAt: Date.now() });
    this.logAction("USER", "Added Favorite", simptomId);
    return true;
  }

  async getFavorites() {
    await this._ensure();
    return this._getAll("favorites");
  }

  /* ---------- Main playlist ---------- */
  async saveMainPlaylist(items) {
    await this._ensure();
    return this._put("state", { key: "main_playlist", data: Array.isArray(items) ? items : [], updatedAt: Date.now() });
  }

  async getMainPlaylist() {
    await this._ensure();
    const v = await this._get("state", "main_playlist");
    return Array.isArray(v) ? v : [];
  }

  async clearMainPlaylist() {
    await this._ensure();
    return this._delete("state", "main_playlist");
  }

  /* ---------- Resume state ---------- */
  async savePlayerState(stateData) {
    await this._ensure();
    return this._put("state", { key: "last_session", data: stateData || null, updatedAt: Date.now() });
  }

  async getPlayerState() {
    await this._ensure();
    return this._get("state", "last_session");
  }

  async clearPlayerState() {
    await this._ensure();
    return this._delete("state", "last_session");
  }

  /* ---------- Backup / Restore ---------- */
  async exportAll() {
    await this._ensure();
    const state = await this._getAll("state");
    const favorites = await this._getAll("favorites");
    const audit = await this._getAll("audit_log");
    return { exportedAt: new Date().toISOString(), state, favorites, audit };
  }

  async importAll(payload) {
    await this._ensure();
    if (!payload || typeof payload !== "object") throw new Error("Invalid backup file");

    // read-only audit philosophy: DO NOT import audit
    const state = Array.isArray(payload.state) ? payload.state : [];
    const favorites = Array.isArray(payload.favorites) ? payload.favorites : [];

    for (const s of state) await this._put("state", s);
    for (const f of favorites) await this._put("favorites", f);

    this.logAction("USER", "Restore Backup", "Imported state+favorites");
    return true;
  }
}

window.db = new SinetDB();
console.log("SINET DB: Kreirana globalna instanca window.db");
