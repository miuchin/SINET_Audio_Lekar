/*
    ====== SINET PROJECT INFO ======
    Project: SINET Audio Lekar
    File: js/app.js (v4.4 - FINAL FIX: AUTO-JUMP)
    Author: miuchins | Co-author: SINET AI
    Status: FULL VERSION (Not shortened)
*/

import { SinetAudioEngine } from './audio/audio-engine.js';
import { CatalogLoader } from './catalog/catalog-loader.js';

// 1. GLOBALNI UI HELPER
window.UI = {
    showSection: (sectionId) => {
        if (window.app) window.app.showScreen(sectionId);
    }
};

class App {
    constructor() {
        // ODMAH DEKLARIŠEMO APP DA BUDE DOSTUPNA
        window.app = this;

        this.audio = new SinetAudioEngine();
        this.catalog = new CatalogLoader();
        this.db = window.db; 

        this.selectedItem = null;
        this.customDuration = 5;
        
        // --- PLAYLIST STATE ---
        this.playlist = [];
        this.isPlaylistActive = false;
        this.currentPlaylistIndex = 0;
        this.wakeLock = null;

        // Cache UI (Prazno na početku, puni se u init)
        this.ui = {};
    }

    async init() {
        console.log("SINET App v4.4: Initializing...");
        
        // 1. Učitaj UI elemente
        this.cacheUI();

        // 2. Učitaj podešavanja
        this.loadSettings();
        
        // 3. Poveži Bazu
        try { 
            if (this.db) await this.db.init(); 
        } catch (e) { 
            console.error("DB Error", e); 
        }
        
        // 4. Učitaj Katalog
        await this.catalog.load();
        
        this.renderSystemPresets(); 
        this.renderCatalogUI(this.catalog.items, false); 

        // 5. Audio Događaji (Arrow funkcije za stabilnost)
        this.audio.onTick = (s) => this.onAudioTick(s);
        this.audio.onFreqChange = (f) => this.onFreqChange(f);
        this.audio.onComplete = () => this.onAudioComplete();

        // 6. Proveri da li treba nastaviti sesiju
        await this.checkResume();
        
        this.setupEventListeners();
        console.log("SINET App: Ready.");
    }

    cacheUI() {
        this.ui = {
            screens: {
                home: document.getElementById('section-home'),
                catalog: document.getElementById('section-catalog'),
                favorites: document.getElementById('section-favorites'),
                playlist: document.getElementById('section-playlist'),
                details: document.getElementById('section-details'),
                player: document.getElementById('section-player'),
                settings: document.getElementById('section-settings')
            },
            player: {
                title: document.getElementById('current-symptom-name'),
                hz: document.getElementById('current-hz'),
                desc: document.getElementById('current-desc'),
                fill: document.getElementById('progress-fill'),
                timeNow: document.getElementById('time-elapsed'),
                timeTotal: document.getElementById('time-total'),
                btnPlay: document.getElementById('btn-play-pause'),
                btnStop: document.getElementById('btn-stop'),
                resumeBox: document.getElementById('resume-notify'),
                playlistStatus: document.getElementById('playlist-status'),
                playlistCounter: document.getElementById('playlist-counter')
            },
            editor: {
                title: document.getElementById('detail-title'),
                desc: document.getElementById('detail-desc'),
                list: document.getElementById('editor-freq-list'),
                slider: document.getElementById('duration-slider'),
                valDisplay: document.getElementById('timer-val-display'),
                favBtn: document.getElementById('fav-toggle-btn')
            },
            catalogAccordion: document.getElementById('catalog-accordion'),
            favList: document.getElementById('favorites-list'),
            searchInput: document.getElementById('search-input'),
            systemPresetsContainer: document.getElementById('system-presets-container'),
            playlistContainer: document.getElementById('playlist-container'),
            btnPlayPlaylist: document.getElementById('btn-play-playlist')
        };
    }

    /* --- FUNKCIJE ZA HELP I WAKE LOCK --- */
    toggleHelp() {
        const modal = document.getElementById('help-modal');
        const nav = document.getElementById('main-nav');
        if (modal) {
            if (modal.style.display === 'none') {
                modal.style.display = 'flex';
                if(nav) nav.classList.remove('open');
            } else {
                modal.style.display = 'none';
            }
        }
    }

    async requestWakeLock() {
        try { 
            if ('wakeLock' in navigator) { 
                this.wakeLock = await navigator.wakeLock.request('screen'); 
            } 
        } catch (e) { console.warn("WakeLock failed", e); }
    }
    
    async releaseWakeLock() {
        if (this.wakeLock !== null) { 
            await this.wakeLock.release(); 
            this.wakeLock = null; 
        }
    }

    /* --- PLAYLIST LOGIC --- */
    addToPlaylistFromEditor() {
        if (!this.selectedItem) return;
        const itemCopy = JSON.parse(JSON.stringify(this.selectedItem));
        itemCopy.userDuration = this.customDuration;
        this.playlist.push(itemCopy);
        alert(`Dodato u playlistu: ${itemCopy.simptom}`);
        this.renderPlaylistUI();
    }

    renderPlaylistUI() {
        const container = this.ui.playlistContainer;
        if (!container) return;
        
        if (this.playlist.length === 0) {
            container.innerHTML = "<p style='text-align:center; padding:20px; color:#999'>Lista je prazna. Dodajte simptome iz Kataloga klikom na ➕.</p>";
            if(this.ui.btnPlayPlaylist) this.ui.btnPlayPlaylist.style.display = 'none';
            return;
        }
        
        if(this.ui.btnPlayPlaylist) this.ui.btnPlayPlaylist.style.display = 'block';
        
        let html = '<ul class="catalog-list-style">';
        this.playlist.forEach((item, index) => {
            html += `<li>
                <div class="cat-icon" style="font-size:1rem; color:#888;">${index + 1}.</div>
                <div class="cat-info">
                    <strong>${item.simptom}</strong>
                    <small>${item.userDuration} min po frekv.</small>
                </div>
                <div class="cat-action" onclick="app.removeFromPlaylist(${index})" style="color:#C0392B;">✖</div>
            </li>`;
        });
        html += '</ul>';
        container.innerHTML = html;
    }

    removeFromPlaylist(index) { 
        this.playlist.splice(index, 1); 
        this.renderPlaylistUI(); 
    }
    
    clearPlaylist() { 
        if(confirm("Da li ste sigurni da želite da obrišete listu?")) { 
            this.playlist = []; 
            this.renderPlaylistUI(); 
        } 
    }

    startPlaylist() {
        if (this.playlist.length === 0) return;
        this.isPlaylistActive = true;
        this.currentPlaylistIndex = 0;
        this.playPlaylistItem(0);
    }

    playPlaylistItem(index) {
        if (index >= this.playlist.length) { 
            this.onPlaylistFinished(); 
            return; 
        }
        
        const item = this.playlist[index];
        this.currentPlaylistIndex = index;
        
        this.ui.player.title.innerText = `[${index+1}/${this.playlist.length}] ${item.simptom}`;
        if(this.ui.player.playlistStatus) {
            this.ui.player.playlistStatus.style.display = 'block';
            this.ui.player.playlistCounter.innerText = `${index+1} od ${this.playlist.length}`;
        }
        
        const durationSec = (item.userDuration || 5) * 60;
        const activeFreqs = item.frekvencije.filter(f => f.enabled !== false);
        
        this.audio.loadSequence(activeFreqs, durationSec);
        this.audio.play();
        this.requestWakeLock();
        
        // --- HITAN FIX: PREBACIVANJE NA PLAYER I SKROLOVANJE NA VRH ---
        this.showScreen('player');
        window.scrollTo(0, 0); 
        // -------------------------------------------------------------
        
        this.updatePlayButton(true);
    }

    onPlaylistFinished() {
        this.isPlaylistActive = false;
        if(this.ui.player.playlistStatus) this.ui.player.playlistStatus.style.display = 'none';
        this.releaseWakeLock();
        alert("Playlista završena!");
        this.showScreen('playlist');
    }

    /* --- AUDIO HANDLERS --- */
    onAudioTick(stats) {
        const pct = (stats.elapsedInFreq / stats.durationPerFreq) * 100;
        this.ui.player.fill.style.width = pct + "%";
        this.ui.player.timeNow.innerText = this.formatTime(stats.elapsedInFreq);
        this.ui.player.timeTotal.innerText = this.formatTime(stats.durationPerFreq);
    }
    
    onFreqChange(freqObj) {
        this.ui.player.hz.innerText = freqObj.value + " Hz";
        this.ui.player.desc.innerText = freqObj.svrha || "";
        this.saveStateToDB(); // Čuvamo stanje
    }
    
    // --- FUNKCIJA ZA ČUVANJE STANJA (ZAŠTIĆENA) ---
    async saveStateToDB() {
        if (!this.db || !this.selectedItem) return;
        
        // PROVERA: Da li Audio Context postoji? Ako ne, ne radi ništa (da ne pukne)
        if (!this.audio.audioContext) return; 

        try {
            await this.db.savePlayerState({
                activePresetId: this.selectedItem.id,
                currentFreqIndex: this.audio.currentIndex,
                elapsedInCurrent: this.audio.audioContext.currentTime - this.audio.startTime
            });
        } catch (e) { 
            console.warn("Save state failed", e); // Samo upozorenje, ne ruši app
        }
    }

    onAudioComplete() {
        if (this.isPlaylistActive) {
            setTimeout(() => { 
                this.playPlaylistItem(this.currentPlaylistIndex + 1); 
            }, 2000);
        } else {
            this.updatePlayButton(false); 
            this.releaseWakeLock(); 
            alert("Terapija završena."); 
            this.stopPlayer();
        }
    }

    /* --- UI RENDER (PUN KOD - BEZ SKRAĆIVANJA) --- */
    renderSystemPresets() {
        const container = this.ui.systemPresetsContainer; 
        if (!container) return;
        
        const sysItems = this.catalog.items.filter(item => item.id && item.id.startsWith('sys-'));
        
        if (sysItems.length === 0) { 
            container.innerHTML = "<p style='padding:20px; text-align:center'>Nema sistemskih preseta.</p>"; 
            return; 
        }
        
        const groups = {};
        sysItems.forEach(item => {
            const oblast = item.oblast || "Razno"; 
            if (!groups[oblast]) groups[oblast] = []; 
            groups[oblast].push(item);
        });
        
        let html = "";
        Object.keys(groups).sort().forEach(oblast => {
            html += `<h3 class="sys-group-title">${oblast}</h3><div class="sys-group-grid">`;
            groups[oblast].forEach(item => {
                let icon = "⚡"; 
                if(oblast.includes("Bol")) icon="💊"; 
                if(oblast.includes("Autoimune")) icon="🛡️"; 
                if(oblast.includes("Varenje")) icon="🍏";
                if(oblast.includes("Srce")) icon="❤️";
                if(oblast.includes("Nervi")) icon="🧠";
                
                html += `<div class="sys-card" onclick="app.openDetails('${item.id}')">
                    <div class="sys-icon">${icon}</div>
                    <div class="sys-content">
                        <div class="sys-title">${item.simptom}</div>
                        <div class="sys-desc">${item.opis||''}</div>
                    </div>
                    <div class="sys-play-icon">▶</div>
                </div>`;
            });
            html += `</div>`;
        });
        container.innerHTML = html;
    }

    renderCatalogUI(items, expandAll = false) {
        const container = this.ui.catalogAccordion;
        if (!container) return;
        
        if(items.length === 0) {
            container.innerHTML = "<p style='text-align:center; padding:20px;'>Nema rezultata.</p>";
            return;
        }

        const groups = {};
        items.forEach(item => { 
            const oblast = item.oblast || "Ostalo"; 
            if (!groups[oblast]) groups[oblast] = []; 
            groups[oblast].push(item); 
        });
        
        let html = "";
        Object.keys(groups).sort().forEach((oblast) => {
            const groupItems = groups[oblast];
            const showClass = expandAll ? "show" : ""; 
            const activeClass = expandAll ? "active" : "";
            
            html += `<div class="accordion-group">
                <button class="accordion-header ${activeClass}" onclick="app.toggleAccordion(this)">
                    ${oblast} <span style="font-size:0.8rem; opacity:0.6; margin-left:10px">(${groupItems.length})</span>
                </button>
                <div class="accordion-content ${showClass}">
                    <ul class="catalog-list-style">`;
            
            groupItems.forEach(item => {
                const shield = item.id && item.id.startsWith('sys-') ? "🛡️ " : "";
                html += `<li onclick="window.app.openDetails('${item.id}')">
                    <div class="cat-icon">📄</div>
                    <div class="cat-info">
                        <strong>${shield}${item.simptom}</strong>
                        <small>${item.frekvencije.length} frekvencija</small>
                    </div>
                    <div class="cat-action">✏️</div>
                </li>`;
            });
            html += `</ul></div></div>`;
        });
        container.innerHTML = html;
    }

    toggleAccordion(btn) { 
        btn.classList.toggle("active"); 
        btn.nextElementSibling.classList.toggle("show"); 
    }

    filterCatalog() {
        const q = this.ui.searchInput.value.toLowerCase();
        if(!q) { 
            this.renderCatalogUI(this.catalog.items, false); 
            return; 
        }
        const r = this.catalog.items.filter(i => 
            (i.simptom && i.simptom.toLowerCase().includes(q)) || 
            (i.oblast && i.oblast.toLowerCase().includes(q))
        );
        this.renderCatalogUI(r, true);
    }

    /* --- EDITOR & DETAILS (SA OPISIMA) --- */
    async openDetails(id) {
        const item = this.catalog.getItemById(id); 
        if (!item) return;
        
        this.selectedItem = JSON.parse(JSON.stringify(item));
        this.customDuration = item.trajanjePoFrekvencijiMin || 5;
        
        this.ui.editor.title.innerText = this.selectedItem.simptom;
        this.ui.editor.desc.innerText = this.selectedItem.opis || "";
        this.ui.editor.slider.value = this.customDuration;
        
        this.updateDuration(this.customDuration);
        
        if (this.db) { 
            const isFav = await this.db.isFavorite(item.id); 
            this.updateFavButtonState(isFav); 
        }
        
        this.renderFrequencyEditor();
        this.showScreen('details');
    }

    renderFrequencyEditor() {
        const list = this.ui.editor.list; 
        list.innerHTML = "";
        
        this.selectedItem.frekvencije.forEach((freq, index) => {
            const li = document.createElement('li'); 
            li.className = "freq-item";
            const isChecked = freq.enabled !== false ? "checked" : "";
            
            // VRATIO SAM OPIS FREKVENCIJE (SVRHA)
            li.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; width:100%;">
                    <input type="checkbox" class="freq-check" ${isChecked} onchange="app.toggleFreq(${index}, this.checked)">
                    <div style="display:flex; flex-direction:column;">
                        <span class="freq-hz" style="font-weight:bold; font-size:1.1rem;">${freq.value} Hz</span>
                        <span class="freq-desc" style="font-size:0.85rem; color:#666;">${freq.svrha || 'Standardna frekvencija'}</span>
                    </div>
                </div>
                <button class="btn-preview" onclick="app.previewFreq(${freq.value})" style="padding:5px 10px; font-size:0.8rem;">🔊</button>
            `;
            list.appendChild(li);
        });
    }

    toggleFreq(idx, val) { 
        if(this.selectedItem.frekvencije[idx]) 
            this.selectedItem.frekvencije[idx].enabled = val; 
    }
    
    updateDuration(val) { 
        this.customDuration = parseInt(val); 
        this.ui.editor.valDisplay.innerText = val + " min"; 
    }
    
    startTherapyFromEditor() {
        const active = this.selectedItem.frekvencije.filter(f => f.enabled !== false);
        if(active.length === 0){
            alert("Morate izabrati bar jednu frekvenciju!");
            return;
        }
        this.audio.loadSequence(active, this.customDuration * 60);
        this.audio.play(); 
        this.requestWakeLock();
        
        this.ui.player.title.innerText = this.selectedItem.simptom;
        this.isPlaylistActive = false;
        
        if(this.ui.player.playlistStatus) 
            this.ui.player.playlistStatus.style.display = 'none';
        
        // --- HITAN FIX: PREBACIVANJE NA PLAYER I SKROLOVANJE NA VRH ---
        this.showScreen('player'); 
        window.scrollTo(0, 0); 
        // -------------------------------------------------------------
        
        this.updatePlayButton(true); 
        
        if(this.db) this.db.clearPlayerState();
    }

    /* --- UTILS --- */
    togglePlayPause() { 
        if(this.audio.isPlaying){
            this.audio.pause();
            this.updatePlayButton(false);
            this.releaseWakeLock();
        } else {
            this.audio.play();
            this.updatePlayButton(true);
            this.requestWakeLock();
        } 
    }
    
    stopPlayer() { 
        this.audio.stop(); 
        this.updatePlayButton(false); 
        this.releaseWakeLock(); 
        this.showScreen('details'); 
    }
    
    updatePlayButton(isPlaying) { 
        const btn = this.ui.player.btnPlay; 
        if(btn) {
            btn.innerText = isPlaying ? "⏸ PAUZA" : "▶ NASTAVI"; 
            btn.className = isPlaying ? "ctrl-btn stop" : "ctrl-btn play";
        } 
    }
    
    previewFreq(hz) { 
        this.audio.init(); 
        this.audio.playFrequency(hz); 
        setTimeout(() => this.audio.stopOscillator(), 2000); 
    }
    
    showScreen(name) { 
        Object.values(this.ui.screens).forEach(el => {
            if(el) el.style.display = 'none';
        }); 
        
        const t = this.ui.screens[name]; 
        if(t) t.style.display = 'block'; 
        
        if(name === 'favorites') this.renderFavoritesUI(); 
        if(name === 'playlist') this.renderPlaylistUI(); 
        
        document.getElementById('main-nav').classList.remove('open'); 
    }
    
    formatTime(s) { 
        const m = Math.floor(s / 60); 
        const sc = Math.floor(s % 60); 
        return `${m}:${sc < 10 ? '0' + sc : sc}`; 
    }

    /* --- FAVORITES --- */
    async renderFavoritesUI() { 
        const container = this.ui.favList; 
        if (!container || !this.db) return;
        
        const favData = await this.db.getFavorites();
        if (!favData || favData.length === 0) { 
            container.innerHTML = "<p style='padding:20px; text-align:center'>Nema favorita.</p>"; 
            return; 
        }
        
        let html = '<ul class="catalog-list-style">';
        favData.forEach(f => {
            const item = this.catalog.getItemById(f.id);
            if (item) html += `<li onclick="app.openDetails('${item.id}')">
                <div class="cat-icon">⭐</div>
                <strong>${item.simptom}</strong>
            </li>`;
        });
        html += '</ul>'; 
        container.innerHTML = html; 
    }
    
    updateFavButtonState(isFav) { 
        const btn = this.ui.editor.favBtn; 
        if(btn) { 
            btn.innerHTML = isFav ? "❤️" : "♡"; 
            btn.classList.toggle('active', isFav); 
        } 
    }
    
    async toggleCurrentFavorite() { 
        if(this.selectedItem && this.db) { 
            const s = await this.db.toggleFavorite(this.selectedItem.id); 
            this.updateFavButtonState(s); 
        } 
    }

    /* --- BACKUP & IMPORT --- */
    async exportData() { 
        if(!this.db) return; 
        const f = await this.db.getFavorites(); 
        const d = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({favorites: f})); 
        const a = document.createElement('a'); 
        a.href = d; 
        a.download = "sinet_backup.json"; 
        document.body.appendChild(a); 
        a.click(); 
        a.remove(); 
    }
    
    importData(el) { 
        const f = el.files[0]; 
        if(!f) return; 
        const r = new FileReader(); 
        r.onload = async(e) => { 
            try {
                const d = JSON.parse(e.target.result); 
                if(d.favorites) for(const fav of d.favorites) await this.db.toggleFavorite(fav.id); 
                alert("Uspešno uvezeno!"); 
                this.renderFavoritesUI(); 
            } catch(e) { alert("Neispravan fajl."); }
        }; 
        r.readAsText(f); 
    }

    /* --- SETTINGS --- */
    toggleTheme(v) { 
        document.body.classList.toggle('dark-mode', v); 
        localStorage.setItem('sinet_theme', v ? 'dark' : 'light'); 
    }
    
    toggleFontSize(v) { 
        document.body.classList.toggle('font-large', v); 
        localStorage.setItem('sinet_font', v ? 'large' : 'normal'); 
    }
    
    loadSettings() { 
        if(localStorage.getItem('sinet_theme') === 'dark') {
            document.body.classList.add('dark-mode');
            const t = document.getElementById('theme-toggle');
            if(t) t.checked = true;
        } 
        if(localStorage.getItem('sinet_font') === 'large') {
            document.body.classList.add('font-large');
            const f = document.getElementById('font-toggle');
            if(f) f.checked = true;
        } 
    }
    
    async resetAllData() { 
        if(confirm("Da li ste sigurni? Ovo briše SVE favorite.")) { 
            indexedDB.deleteDatabase('SINET_Audio_DB').onsuccess = () => {
                localStorage.clear();
                location.reload();
            } 
        } 
    }
    
    async checkResume() { 
        if(!this.db) return; 
        try {
            const s = await this.db.getPlayerState(); 
            if(s && s.activePresetId){ 
                this.ui.player.resumeBox.style.display = 'block'; 
                this.ui.player.resumeBox.querySelector('button').onclick = () => { 
                    const i = this.catalog.getItemById(s.activePresetId); 
                    if(i){ 
                        this.ui.player.title.innerText = i.simptom; 
                        this.audio.loadSequence(i.frekvencije, (i.trajanjePoFrekvencijiMin||5)*60, s.currentFreqIndex, s.elapsedInCurrent); 
                        this.showScreen('player'); 
                        this.audio.play(); 
                        this.requestWakeLock(); 
                        this.ui.player.resumeBox.style.display = 'none'; 
                        this.updatePlayButton(true); 
                    } 
                }; 
            }
        } catch(e) { console.log("No resume state"); } 
    }

    setupEventListeners() {
        if(this.ui.player.btnPlay) this.ui.player.btnPlay.onclick = () => this.togglePlayPause();
        if(this.ui.player.btnStop) this.ui.player.btnStop.onclick = () => this.stopPlayer();
        
        const unlockBtn = document.getElementById('unlock-audio-btn');
        if(unlockBtn) unlockBtn.onclick = () => { this.audio.init(); alert("Zvuk aktiviran!"); };
        
        const nav = document.getElementById('main-nav');
        const menuBtn = document.getElementById('menu-btn');
        const closeMenuBtn = document.getElementById('close-menu-btn');
        
        if(menuBtn) menuBtn.onclick = () => nav.classList.add('open');
        if(closeMenuBtn) closeMenuBtn.onclick = () => nav.classList.remove('open');
        
        window.app = this; 
    }
}

const myApp = new App();
window.addEventListener('DOMContentLoaded', () => { myApp.init(); });
