/*
    ====== SINET PROJECT INFO ======
    Project: SINET Audio Lekar
    File: js/audio/audio-engine.js
    Version: 1.0
    Author: miuchins | Co-author: SINET AI
    Description: Advanced Audio Engine for sequencing frequencies using Web Audio API.
    Features: Smooth Fading, Sequencing, Timer Callbacks, Resume capability.
*/

/* 🚩 START: Audio Engine Class */
export class SinetAudioEngine {
    constructor() {
        this.ctx = null;            // AudioContext
        this.oscillator = null;     // Trenutni oscilator
        this.gainNode = null;       // Kontrola jačine (Volume/Fade)
        
        // Stanje Player-a
        this.isPlaying = false;
        this.isPaused = false;
        
        // Podaci o sekvenci (Playlist)
        this.playlist = [];         // Niz frekvencija koji sviramo
        this.currentIndex = 0;      // Koju frekvenciju trenutno sviramo
        this.durationPerFreq = 300; // Koliko traje jedna frekvencija (u sekundama, default 5 min)
        this.timer = null;          // JS Interval za brojanje vremena
        this.elapsedInCurrent = 0;  // Koliko je prošlo vremena u TRENUTNOJ frekvenciji

        // Callbacks (Funkcije koje UI šalje Engine-u da bi znao šta se dešava)
        this.onTick = null;         // Poziva se svake sekunde (za Progress Bar)
        this.onFreqChange = null;   // Poziva se kad se promeni frekvencija
        this.onComplete = null;     // Poziva se kad je cela terapija gotova
    }

    /* --- 1. INICIJALIZACIJA --- */
    init() {
        if (!this.ctx) {
            // Kreiramo AudioContext samo na prvu interakciju korisnika (Browser policy)
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /* --- 2. UPRAVLJANJE LISTOM (Load Sequence) --- */
    /**
     * Učitava listu frekvencija iz kataloga
     * @param {Array} frequencies - Niz objekata [{value: 120, svrha: '...'}, ...]
     * @param {Number} durationSec - Trajanje jedne frekvencije u sekundama
     * @param {Number} startIndex - (Opcija) Od koje frekvencije krećemo (za Resume)
     * @param {Number} startElapsed - (Opcija) Koliko je sekundi već prošlo u toj frekvenciji
     */
    loadSequence(frequencies, durationSec = 300, startIndex = 0, startElapsed = 0) {
        this.playlist = frequencies;
        this.durationPerFreq = durationSec;
        this.currentIndex = startIndex;
        this.elapsedInCurrent = startElapsed;
        console.log(`AudioEngine: Loaded ${frequencies.length} freqs. Starting at #${startIndex}, time: ${startElapsed}s`);
    }

    /* --- 3. PLAY / PAUSE / STOP --- */
    
    play() {
        this.init(); // Osiguraj da imamo Context

        if (this.isPaused) {
            // Ako je bila pauza, nastavi
            this.isPaused = false;
            this.isPlaying = true;
            this.playFrequency(this.playlist[this.currentIndex].value); // Ponovo pokreni zvuk
            this.startTimer();
            return;
        }

        if (this.playlist.length === 0) {
            console.error("AudioEngine: Empty playlist!");
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;
        
        // Pokreni trenutnu frekvenciju
        const currentFreq = this.playlist[this.currentIndex];
        this.playFrequency(currentFreq.value);
        this.startTimer();
        
        // Javi UI-ju šta svira
        if (this.onFreqChange) this.onFreqChange(currentFreq, this.currentIndex);
    }

    pause() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.isPaused = true;
        this.stopOscillator(); // Ugasi zvuk, ali ne resetuj brojace
        this.stopTimer();
        console.log("AudioEngine: Paused.");
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.stopOscillator();
        this.stopTimer();
        
        // Resetuj brojace na nulu
        this.currentIndex = 0;
        this.elapsedInCurrent = 0;
        console.log("AudioEngine: Stopped and Reset.");
    }

    /* --- 4. GENERISANJE ZVUKA (CORE) --- */
    
    playFrequency(hz) {
        // Prvo ugasi stari zvuk (sa Fade Out)
        this.stopOscillator();

        // Kreiraj novi oscilator
        this.oscillator = this.ctx.createOscillator();
        this.gainNode = this.ctx.createGain();

        // Podešavanja
        this.oscillator.type = 'sine'; // Sinusni talas je najprijatniji za seniore
        this.oscillator.frequency.value = hz;

        // Povezivanje: Osc -> Gain -> Speakers
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);

        // FADE IN (Meki ulazak da ne "pucne")
        // Postavi gain na 0, pa ga podigni na 0.5 u roku od 1 sekunde
        this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 1);

        this.oscillator.start();
        console.log(`AudioEngine: Playing ${hz} Hz`);
    }

    stopOscillator() {
        if (this.oscillator) {
            // FADE OUT (Meki izlazak)
            // Trenutnu vrednost spusti na 0.001 (skoro nula) za 0.5 sekundi
            // WebAudio ne voli ramp to 0, zato koristimo 0.001
            try {
                this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
                this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.ctx.currentTime);
                this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
                
                // Zaustavi oscilator nakon fade-outa
                const oldOsc = this.oscillator;
                setTimeout(() => {
                    oldOsc.stop();
                    oldOsc.disconnect();
                }, 550);
            } catch (e) {
                // Fallback ako nesto pukne
                this.oscillator.stop();
            }
            this.oscillator = null;
        }
    }

    /* --- 5. TAJMER I SEKVENCA --- */

    startTimer() {
        this.stopTimer(); // Za svaki slucaj očisti stari

        this.timer = setInterval(() => {
            if (!this.isPlaying || this.isPaused) return;

            this.elapsedInCurrent++;

            // Javi UI-ju progres (svake sekunde)
            if (this.onTick) {
                this.onTick({
                    elapsedTotal: this.calculateTotalElapsed(),
                    elapsedInFreq: this.elapsedInCurrent,
                    durationPerFreq: this.durationPerFreq,
                    currentIndex: this.currentIndex,
                    totalItems: this.playlist.length
                });
            }

            // Provera da li je vreme za sledeću frekvenciju
            if (this.elapsedInCurrent >= this.durationPerFreq) {
                this.nextTrack();
            }

        }, 1000); // 1 sekunda
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    nextTrack() {
        this.currentIndex++;
        this.elapsedInCurrent = 0;

        // Da li smo došli do kraja liste?
        if (this.currentIndex >= this.playlist.length) {
            this.completeTherapy();
        } else {
            // Pusti sledeću
            const nextFreq = this.playlist[this.currentIndex];
            this.playFrequency(nextFreq.value);
            if (this.onFreqChange) this.onFreqChange(nextFreq, this.currentIndex);
        }
    }

    completeTherapy() {
        this.stop();
        if (this.onComplete) this.onComplete();
        console.log("AudioEngine: Therapy Complete.");
    }

    /* --- HELPER ZA RESUME --- */
    calculateTotalElapsed() {
        // Vraća ukupno vreme proteklo od početka terapije
        return (this.currentIndex * this.durationPerFreq) + this.elapsedInCurrent;
    }
    
    // Metoda za dobijanje trenutnog stanja (za čuvanje u DB)
    getState() {
        return {
            currentIndex: this.currentIndex,
            elapsedInCurrent: this.elapsedInCurrent,
            isPlaying: this.isPlaying
        };
    }
}
/* 🚩 END: Audio Engine Class */
