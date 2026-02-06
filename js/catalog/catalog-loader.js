/*
    ====== SINET PROJECT INFO ======
    Project: SINET Audio Lekar
    File: js/catalog/catalog-loader.js
    Version: 1.0
    Author: miuchins | Co-author: SINET AI
    Description: Handles fetching and parsing of the SINET JSON Catalog.
*/

export class CatalogLoader {
    constructor(url = 'data/SINET_CATALOG.json') {
        this.url = url;
        this.data = null;
        this.items = [];
        this.isLoaded = false;
    }

    async load() {
        try {
            console.log(`CatalogLoader: Fetching ${this.url}...`);
            const response = await fetch(this.url);
            
            if (!response.ok) {
                throw new Error(`HTTP greška! Status: ${response.status}`);
            }

            const json = await response.json();
            
            // Validacija strukture prema SINET standardu (Primer_Kataloga.json)
            if (!json.items || !Array.isArray(json.items)) {
                throw new Error("Neispravan format kataloga: Nedostaje 'items' niz.");
            }

            this.data = json;
            this.items = json.items; // Glavni niz simptoma
            this.isLoaded = true;
            
            console.log(`CatalogLoader: Uspešno učitano ${this.items.length} stavki.`);
            return this.items;

        } catch (error) {
            console.error("CatalogLoader Error:", error);
            // Vraćamo prazan niz da ne srušimo aplikaciju, ali logujemo grešku
            return [];
        }
    }

    /**
     * Pronalazi stavku po ID-u
     */
    getItemById(id) {
        return this.items.find(item => item.id === id);
    }

    /**
     * Vraća stavke koje sadrže određeni tag ili tekst (za Pretragu)
     */
    search(query) {
        const lowerQ = query.toLowerCase();
        return this.items.filter(item => 
            (item.simptom && item.simptom.toLowerCase().includes(lowerQ)) ||
            (item.tags && item.tags.some(t => t.toLowerCase().includes(lowerQ)))
        );
    }

    /**
     * Vraća presete za početnu stranu na osnovu tagova ili oblasti
     * Primer: getPresets('Varenje')
     */
    getPresetsByCategory(category) {
        return this.items.filter(item => 
            item.oblast && item.oblast.toLowerCase() === category.toLowerCase()
        );
    }
}
