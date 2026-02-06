/*
    ====== SINET PROJECT INFO ======
    Project: SINET Audio Lekar
    File: js/app.js (v3.2 - Final Release with Help)
    Author: miuchins | Co-author: SINET AI
*/

import { SinetAudioEngine } from './audio/audio-engine.js';
import { CatalogLoader } from './catalog/catalog-loader.js';

class App {
    constructor() {
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

        // Cache UI
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

        this.onAudioTick = this.onAudioTick.bind(this);
        this.onFreqChange = this.onFreqChange.bind(this);
        this.onAudioComplete = this.onAudioComplete.bind(this);
    }

    async init() {
        console.log("SINET App v3.2: Initializing...");
        
        this.loadSettings();
        try { if (this.db) await this.db.init(); } catch (e) { console.error("DB Error", e); }
        
        await this.catalog.load();
        
        this.renderSystemPresets(); 
        this.renderCatalogUI(this.catalog.items, false); 

        this.audio.onTick = this.onAudioTick;
        this.audio.onFreqChange = this.onFreqChange;
        this.audio.onComplete = this.onAudioComplete;

        await this.checkResume();
        this.setupEventListeners();
        console.log("SINET App: Ready.");
    }

    /* --- WAKE LOCK --- */
    async requestWakeLock() {
        try { if ('wakeLock' in navigator) { this.wakeLock = await navigator.wakeLock.request('screen'); } } catch (e) {}
    }
    async releaseWakeLock() {
        if (this.wakeLock !== null) { await this.wakeLock.release(); this.wakeLock = null; }
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
            html += `<li><div class="cat-icon" style="font-size:1rem; color:#888;">${index + 1}.</div><div class="cat-info"><strong>${item.simptom}</strong><small>${item.userDuration} min po frekv.</small></div><div class="cat-action" onclick="app.removeFromPlaylist(${index})" style="color:#C0392B;">✖</div></li>`;
        });
        html += '</ul>';
        container.innerHTML = html;
    }

    removeFromPlaylist(index) { this.playlist.splice(index, 1); this.renderPlaylistUI(); }
    clearPlaylist() { if(confirm("Obriši listu?")) { this.playlist = []; this.renderPlaylistUI(); } }

    startPlaylist() {
        if (this.playlist.length === 0) return;
        this.isPlaylistActive = true;
        this.currentPlaylistIndex = 0;
        this.playPlaylistItem(0);
    }

    playPlaylistItem(index) {
        if (index >= this.playlist.length) { this.onPlaylistFinished(); return; }
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
        this.showScreen('player');
        this.updatePlayButton(true);
    }

    onPlaylistFinished() {
        this.isPlaylistActive = false;
        if(this.ui.player.playlistStatus) this.ui.player.playlistStatus.style.display = 'none';
        this.releaseWakeLock();
        alert("Playlista završena!");
        this.showScreen('playlist');
    }

    /* --- BACKUP & RESTORE --- */
    async exportData() {
        if (!this.db) return;
        try {
            const favorites = await this.db.getFavorites();
            const exportObj = {
                version: "3.2", date: new Date().toISOString(), favorites: favorites,
                settings: { theme: localStorage.getItem('sinet_theme'), font: localStorage.getItem('sinet_font') }
            };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
            const a = document.createElement('a');
            a.setAttribute("href", dataStr); a.setAttribute("download", "sinet_backup.json");
            document.body.appendChild(a); a.click(); a.remove();
        } catch (e) { alert("Greška pri izvozu."); }
    }

    importData(inputElement) {
        const file = inputElement.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.favorites) {
                    for (const fav of data.favorites) {
                        const isFav = await this.db.isFavorite(fav.id);
                        if (!isFav) await this.db.toggleFavorite(fav.id);
                    }
                }
                if (data.settings) {
                    if (data.settings.theme) this.toggleTheme(data.settings.theme === 'dark');
                    if (data.settings.font) this.toggleFontSize(data.settings.font === 'large');
                }
                alert("Podaci uvezeni!"); this.renderFavoritesUI();
            } catch (err) { alert("Neispravan fajl."); }
        };
        reader.readAsText(file);
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
        this.saveStateToDB();
    }
    onAudioComplete() {
        if (this.isPlaylistActive) {
            setTimeout(() => { this.playPlaylistItem(this.currentPlaylistIndex + 1); }, 2000);
        } else {
            this.updatePlayButton(false); this.releaseWakeLock(); alert("Terapija završena."); this.stopPlayer();
        }
    }

    /* --- UI & RENDER --- */
    renderSystemPresets() {
        const container = this.ui.systemPresetsContainer;
        if (!container) return;
        const sysItems = this.catalog.items.filter(item => item.id && item.id.startsWith('sys-'));
        if (sysItems.length === 0) { container.innerHTML = "<p style='padding:20px; text-align:center'>Nema sistemskih preseta.</p>"; return; }
        const groups = {};
        sysItems.forEach(item => {
            const oblast = item.oblast || "Razno"; if (!groups[oblast]) groups[oblast] = []; groups[oblast].push(item);
        });
        let html = "";
        Object.keys(groups).sort().forEach(oblast => {
            html += `<h3 class="sys-group-title">${oblast}</h3><div class="sys-group-grid">`;
            groups[oblast].forEach(item => {
                let icon = "⚡"; if(oblast.includes("Bol"))icon="💊"; if(oblast.includes("Autoimune"))icon="🛡️"; if(oblast.includes("Varenje"))icon="🍏";
                html += `<div class="sys-card" onclick="app.openDetails('${item.id}')"><div class="sys-icon">${icon}</div><div class="sys-content"><div class="sys-title">${item.simptom}</div><div class="sys-desc">${item.opis||''}</div></div><div class="sys-play-icon">▶</div></div>`;
            });
            html += `</div>`;
        });
        container.innerHTML = html;
    }

    renderCatalogUI(items, expandAll = false) {
        const container = this.ui.catalogAccordion;
        if (!container) return;
        const groups = {};
        items.forEach(item => { const oblast = item.oblast || "Ostalo"; if (!groups[oblast]) groups[oblast] = []; groups[oblast].push(item); });
        let html = "";
        Object.keys(groups).sort().forEach((oblast) => {
            const groupItems = groups[oblast];
            const showClass = expandAll ? "show" : ""; const activeClass = expandAll ? "active" : "";
            html += `<div class="accordion-group"><button class="accordion-header ${activeClass}" onclick="app.toggleAccordion(this)">${oblast} <span style="font-size:0.8rem; opacity:0.6; margin-left:10px">(${groupItems.length})</span></button><div class="accordion-content ${showClass}"><ul class="catalog-list-style">`;
            groupItems.forEach(item => {
                const shield = item.id && item.id.startsWith('sys-') ? "🛡️ " : "";
                html += `<li onclick="window.app.openDetails('${item.id}')"><div class="cat-icon">📄</div><div class="cat-info"><strong>${shield}${item.simptom}</strong><small>${item.frekvencije.length} frekv.</small></div><div class="cat-action">✏️</div></li>`;
            });
            html += `</ul></div></div>`;
        });
        container.innerHTML = html;
    }
    toggleAccordion(btn) { btn.classList.toggle("active"); btn.nextElementSibling.classList.toggle("show"); }
    filterCatalog() {
        const q = this.ui.searchInput.value.toLowerCase();
        if(!q) { this.renderCatalogUI(this.catalog.items,false); return; }
        const r = this.catalog.items.filter(i => (i.simptom && i.simptom.toLowerCase().includes(q)) || (i.oblast && i.oblast.toLowerCase().includes(q)));
        this.renderCatalogUI(r, true);
    }

    /* --- EDITOR & DETAILS --- */
    async openDetails(id) {
        const item = this.catalog.getItemById(id); if (!item) return;
        this.selectedItem = JSON.parse(JSON.stringify(item));
        this.customDuration = item.trajanjePoFrekvencijiMin || 5;
        this.ui.editor.title.innerText = this.selectedItem.simptom;
        this.ui.editor.desc.innerText = this.selectedItem.opis || "";
        this.ui.editor.slider.value = this.customDuration;
        this.updateDuration(this.customDuration);
        if (this.db) { const isFav = await this.db.isFavorite(item.id); this.updateFavButtonState(isFav); }
        this.renderFrequencyEditor();
        this.showScreen('details');
    }
    renderFrequencyEditor() {
        const list = this.ui.editor.list; list.innerHTML = "";
        this.selectedItem.frekvencije.forEach((freq, index) => {
            const li = document.createElement('li'); li.className = "freq-item";
            const isChecked = freq.enabled !== false ? "checked" : "";
            li.innerHTML = `<input type="checkbox" class="freq-check" ${isChecked} onchange="app.toggleFreq(${index}, this.checked)"><span class="freq-hz">${freq.value} Hz</span><span class="freq-desc">${freq.svrha||''}</span><button onclick="app.previewFreq(${freq.value})"></button>`;
            list.appendChild(li);
        });
    }
    toggleFreq(idx, val) { if(this.selectedItem.frekvencije[idx]) this.selectedItem.frekvencije[idx].enabled = val; }
    updateDuration(val) { this.customDuration = parseInt(val); this.ui.editor.valDisplay.innerText = val + " min"; }
    startTherapyFromEditor() {
        const active = this.selectedItem.frekvencije.filter(f => f.enabled !== false);
        if(active.length===0){alert("Izaberite bar jednu!");return;}
        this.audio.loadSequence(active, this.customDuration*60);
        this.audio.play(); this.requestWakeLock();
        this.ui.player.title.innerText = this.selectedItem.simptom;
        this.isPlaylistActive = false;
        if(this.ui.player.playlistStatus) this.ui.player.playlistStatus.style.display='none';
        this.showScreen('player'); this.updatePlayButton(true); if(this.db) this.db.clearPlayerState();
    }

    /* --- FAVORITES --- */
    async renderFavoritesUI() {
        const container = this.ui.favList; if (!container || !this.db) return;
        const favData = await this.db.getFavorites();
        if (!favData || favData.length === 0) { container.innerHTML = "<p>Nema favorita.</p>"; return; }
        let html = '<ul class="catalog-list-style">';
        favData.forEach(f => {
            const item = this.catalog.getItemById(f.id);
            if (item) html += `<li onclick="window.app.openDetails('${item.id}')"><div class="cat-icon">⭐</div><div class="cat-info"><strong>${item.simptom}</strong><small>${item.oblast}</small></div><div class="cat-action">✏️</div></li>`;
        });
        html += '</ul>'; container.innerHTML = html;
    }
    async toggleCurrentFavorite() { if(!this.selectedItem || !this.db) return; const isFav = await this.db.toggleFavorite(this.selectedItem.id); this.updateFavButtonState(isFav); if(this.ui.screens.favorites.style.display==='block') this.renderFavoritesUI(); }
    updateFavButtonState(isFav) { const btn = this.ui.editor.favBtn; if(btn) { btn.classList.toggle('active', isFav); btn.innerHTML = isFav ? "❤️" : "♡"; } }

    /* --- UTILS --- */
    togglePlayPause() { if(this.audio.isPlaying){this.audio.pause();this.updatePlayButton(false);this.releaseWakeLock();}else{this.audio.play();this.updatePlayButton(true);this.requestWakeLock();} }
    stopPlayer() { this.audio.stop(); this.updatePlayButton(false); this.releaseWakeLock(); this.showScreen(this.isPlaylistActive ? 'playlist' : 'details'); }
    updatePlayButton(isPlaying) { const btn = this.ui.player.btnPlay; btn.innerText=isPlaying?"⏸ PAUZA":"▶ NASTAVI"; btn.className=isPlaying?"ctrl-btn stop":"ctrl-btn play"; }
    previewFreq(hz) { this.audio.init(); this.audio.playFrequency(hz); setTimeout(()=>this.audio.stopOscillator(),3000); }
    showScreen(name) { Object.values(this.ui.screens).forEach(el=>{if(el)el.style.display='none'}); const t=this.ui.screens[name]; if(t)t.style.display='block'; if(name==='favorites')this.renderFavoritesUI(); if(name==='playlist')this.renderPlaylistUI(); document.getElementById('main-nav').classList.remove('open'); }
    formatTime(s) { const m=Math.floor(s/60); const sc=Math.floor(s%60); return `${m}:${sc<10?'0'+sc:sc}`; }
    toggleTheme(isDark) { document.body.classList.toggle('dark-mode', isDark); localStorage.setItem('sinet_theme', isDark?'dark':'light'); }
    toggleFontSize(isLarge) { document.body.classList.toggle('font-large', isLarge); localStorage.setItem('sinet_font', isLarge?'large':'normal'); }
    loadSettings() { if(localStorage.getItem('sinet_theme')==='dark'){document.body.classList.add('dark-mode');document.getElementById('theme-toggle').checked=true;} if(localStorage.getItem('sinet_font')==='large'){document.body.classList.add('font-large');document.getElementById('font-toggle').checked=true;} }
    async resetAllData() { if(confirm("Obriši sve?")) { indexedDB.deleteDatabase('SINET_Audio_DB').onsuccess=()=>{localStorage.clear();location.reload();} } }
    async checkResume() { if(!this.db)return; const s=await this.db.getPlayerState(); if(s&&s.activePresetId){ this.ui.player.resumeBox.style.display='block'; this.ui.player.resumeBox.querySelector('button').onclick=()=>{ const i=this.catalog.getItemById(s.activePresetId); if(i){ this.ui.player.title.innerText=i.simptom; this.audio.loadSequence(i.frekvencije,(i.trajanjePoFrekvencijiMin||5)*60,s.currentFreqIndex,s.elapsedInCurrent); this.showScreen('player'); this.audio.play(); this.requestWakeLock(); this.ui.player.resumeBox.style.display='none'; this.updatePlayButton(true); } }; } }
    playPreset(tag) { let item=this.catalog.getItemById(tag); if(item)this.openDetails(item.id); else alert("Nije nadjeno"); }

    // --- NOVA FUNKCIJA ZA HELP (DODATA OVDE) ---
    toggleHelp() {
        const modal = document.getElementById('help-modal');
        if (modal && modal.style.display === 'none') {
            modal.style.display = 'flex';
            document.getElementById('main-nav').classList.remove('open');
        } else if (modal) {
            modal.style.display = 'none';
        }
    }

    setupEventListeners() {
        this.ui.player.btnPlay.onclick = () => this.togglePlayPause();
        document.getElementById('btn-stop').onclick = () => this.stopPlayer();
        document.getElementById('unlock-audio-btn').onclick = () => { this.audio.init(); alert("Zvuk aktiviran!"); };
        const nav = document.getElementById('main-nav');
        document.getElementById('menu-btn').onclick = () => nav.classList.add('open');
        document.getElementById('close-menu-btn').onclick = () => nav.classList.remove('open');
        window.app = this; 
        window.UI = { showSection: (s) => this.showScreen(s) };
    }
}

const myApp = new App();
window.addEventListener('DOMContentLoaded', () => { myApp.init(); });
