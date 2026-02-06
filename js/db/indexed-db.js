/*
    ====== SINET PROJECT INFO ======
    Project: SINET Audio Lekar
    File: js/db/indexed-db.js
    Version: 1.0
    Author: miuchins (Svetozar Miuchin)
    Co-author: SINET AI (GPT Co-author)
    Date: 2026-02-04
    Description: IndexedDB wrapper for handling persistence (Resume state, Favorites, Logs).
    Standard: SINET GEM v7.2 (Physical DB, No localStorage for critical data).
*/

/* 🚩 START: DB Configuration */
const DB_CONFIG = {
    name: 'SINET_Audio_DB',
    version: 1,
    stores: {
        state: 'key',        // key-value store za podešavanja i resume state
        favorites: 'id',     // store za ID-eve omiljenih simptoma
        playlists: 'id',     // store za korisničke plejliste
        audit_log: '++id'    // auto-increment store za logove
    }
};
/* 🚩 END: DB Configuration */


/* 🚩 START: Main DB Class */
class SinetDB {
    constructor() {
        this.db = null;
        this.isReady = false;
    }

    /**
     * Inicijalizacija i otvaranje baze
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Kreiranje Store-ova ako ne postoje
                if (!db.objectStoreNames.contains('state')) {
                    db.createObjectStore('state', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('favorites')) {
                    db.createObjectStore('favorites', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('playlists')) {
                    db.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('audit_log')) {
                    db.createObjectStore('audit_log', { keyPath: 'id', autoIncrement: true });
                }
                console.log("SINET DB: Upgrade complete.");
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isReady = true;
                console.log("SINET DB: Connected successfully.");
                this.logAction("SYSTEM", "Database initialized.");
                resolve(true);
            };

            request.onerror = (event) => {
                console.error("SINET DB: Connection error", event.target.error);
                reject("DB Error");
            };
        });
    }

    /* =========================================
       AUDIT LOG SYSTEM (SINET Standard G0.10)
       ========================================= */
    
    async logAction(category, action, details = "") {
        if (!this.db) return;
        const entry = {
            timestamp: new Date().toISOString(),
            category: category,
            action: action,
            details: details,
            userAgent: navigator.userAgent
        };
        return this._put('audit_log', entry);
    }

    async getAuditLog() {
        return this._getAll('audit_log');
    }

    /* =========================================
       RESUME STATE MANAGER (Ključno za Senior App)
       ========================================= */

    /**
     * Čuva trenutno stanje playera (gde smo stali)
     * @param {Object} stateData - { activePresetId, currentFreqIndex, elapsedTimeSec }
     */
    async savePlayerState(stateData) {
        const payload = {
            key: 'last_session',
            data: stateData,
            updatedAt: Date.now()
        };
        // Logujemo samo ako je došlo do promene preseta, da ne gušimo log
        if (stateData.activePresetId) {
            // Tihi save bez loga za svaku sekundu, loguje se samo start/stop u playeru
        }
        return this._put('state', payload);
    }

    /**
     * Vraća gde smo stali
     */
    async getPlayerState() {
        return this._get('state', 'last_session');
    }

    async clearPlayerState() {
        return this._delete('state', 'last_session');
    }

    /* =========================================
       FAVORITES MANAGER
       ========================================= */

    async toggleFavorite(simptomId) {
        const existing = await this._get('favorites', simptomId);
        if (existing) {
            await this._delete('favorites', simptomId);
            this.logAction("USER", "Removed Favorite", simptomId);
            return false; // Removed
        } else {
            await this._put('favorites', { id: simptomId, addedAt: Date.now() });
            this.logAction("USER", "Added Favorite", simptomId);
            return true; // Added
        }
    }

    async getFavorites() {
        return this._getAll('favorites');
    }

    async isFavorite(simptomId) {
        const item = await this._get('favorites', simptomId);
        return !!item;
    }

    /* =========================================
       INTERNAL HELPERS (Generic Methods)
       ========================================= */

    async _put(storeName, item) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async _get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ? request.result.data || request.result : null);
            request.onerror = () => reject(request.error);
        });
    }

    async _getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async _delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
}

// Export globalne instance (Singleton)
// OBAVEZNO: Kačimo ga direktno na window da bi ga app.js video!
window.db = new SinetDB();
console.log("SINET DB: Kreirana globalna instanca window.db");

/* 🚩 END: Main DB Class */

