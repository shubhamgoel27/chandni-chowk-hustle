const AudioManager = {
    ctx: null,
    masterGain: null,
    musicGain: null,
    sfxGain: null,
    initialized: false,
    musicPlaying: false,
    musicInterval: null,

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.6;
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.15;
            this.musicGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playTone(freq, duration, type = 'sine', gainNode = null, volume = 0.3) {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(gainNode || this.sfxGain);
        osc.start(t);
        osc.stop(t + duration);
    },

    playNoise(duration, gainNode = null, volume = 0.2) {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(gainNode || this.sfxGain);
        source.start(t);
    },

    jump() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.12);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.15);
    },

    doubleJump() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.1);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(700, t + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(1100, t + 0.15);
        gain2.gain.setValueAtTime(0.15, t + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(t + 0.05);
        osc2.stop(t + 0.18);
    },

    collect() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        [523, 659, 784].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, t + i * 0.06);
            gain.gain.setValueAtTime(0.2, t + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.15);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.06);
            osc.stop(t + i * 0.06 + 0.15);
        });
    },

    powerUp() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        [392, 494, 587, 784, 988].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(f, t + i * 0.08);
            gain.gain.setValueAtTime(0.12, t + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.2);
        });
    },

    hit() {
        if (!this.initialized) return;
        this.playNoise(0.2, this.sfxGain, 0.4);
        this.playTone(150, 0.3, 'sawtooth', this.sfxGain, 0.2);
    },

    stomp() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.25);
    },

    dash() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.2);
        this.playNoise(0.1, this.sfxGain, 0.15);
    },

    slide() {
        if (!this.initialized) return;
        this.playNoise(0.15, this.sfxGain, 0.1);
        this.playTone(120, 0.2, 'sine', this.sfxGain, 0.1);
    },

    levelComplete() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const notes = [523, 587, 659, 784, 880, 988, 1047];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, t + i * 0.1);
            gain.gain.setValueAtTime(0.25, t + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.3);
        });
    },

    gameOver() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const notes = [440, 370, 311, 261, 220];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, t + i * 0.2);
            gain.gain.setValueAtTime(0.15, t + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.4);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.2);
            osc.stop(t + i * 0.2 + 0.4);
        });
    },

    rickshawHorn() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(350, t);
        osc.frequency.setValueAtTime(450, t + 0.1);
        osc.frequency.setValueAtTime(350, t + 0.2);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.3);
    },

    startMusic() {
        if (!this.initialized || this.musicPlaying) return;
        this.musicPlaying = true;
        let beat = 0;
        const bpm = 140;
        const interval = (60 / bpm) * 1000;

        const bassNotes = [130, 146, 164, 146, 130, 110, 130, 146];
        const melodyNotes = [523, 587, 659, 784, 659, 587, 523, 440];

        this.musicInterval = setInterval(() => {
            if (!this.initialized || !this.musicPlaying) return;
            const t = this.ctx.currentTime;

            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bassOsc.type = 'triangle';
            bassOsc.frequency.setValueAtTime(bassNotes[beat % bassNotes.length], t);
            bassGain.gain.setValueAtTime(0.12, t);
            bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            bassOsc.connect(bassGain);
            bassGain.connect(this.musicGain);
            bassOsc.start(t);
            bassOsc.stop(t + 0.3);

            if (beat % 2 === 0) {
                const tablaOsc = this.ctx.createOscillator();
                const tablaGain = this.ctx.createGain();
                tablaOsc.type = 'sine';
                tablaOsc.frequency.setValueAtTime(beat % 4 === 0 ? 80 : 120, t);
                tablaOsc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
                tablaGain.gain.setValueAtTime(0.2, t);
                tablaGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                tablaOsc.connect(tablaGain);
                tablaGain.connect(this.musicGain);
                tablaOsc.start(t);
                tablaOsc.stop(t + 0.1);

                this.playNoise(0.05, this.musicGain, 0.08);
            }

            if (beat % 4 === 0) {
                const melOsc = this.ctx.createOscillator();
                const melGain = this.ctx.createGain();
                melOsc.type = 'sine';
                melOsc.frequency.setValueAtTime(melodyNotes[(beat / 4) % melodyNotes.length], t);
                melGain.gain.setValueAtTime(0.06, t);
                melGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                melOsc.connect(melGain);
                melGain.connect(this.musicGain);
                melOsc.start(t);
                melOsc.stop(t + 0.4);
            }

            beat++;
        }, interval);
    },

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    },

    splash() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        this.playNoise(0.15, this.sfxGain, 0.2);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }
};
