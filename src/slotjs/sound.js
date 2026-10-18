import { IS_FIREFOX } from './utils';

window.AudioContext = window.AudioContext || window.webkitAudioContext;

const context = new AudioContext();

export class Sound {

    url = '';

    buffer = null;

    sources = [];

    constructor(url) {
        this.url = url;
    }

    load() {
        if (!this.url) return Promise.reject(new Error(`Missing or invalid URL: ${this.url}`));

        if (this.buffer) return Promise.resolve(this.buffer);

        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();

            request.open('GET', this.url, true);
            request.responseType = 'arraybuffer';

            request.onload = () => {
                context.decodeAudioData(request.response, (buffer) => {
                    if (!buffer) {
                        console.log(`Sound decoding error: ${this.url}`);

                        reject(new Error(`Sound decoding error: ${this.url}`));

                        return;
                    }

                    this.buffer = buffer;

                    resolve(buffer);
                });
            };

            request.onerror = (err) => {
                console.log('Sound XMLHttpRequest error:', err);

                reject(err);
            };

            request.send();
        });
    }

    play(volume = 1, time = 0) {
        if (!this.buffer) return;

        if (context.state === 'suspended') context.resume();

        const source = context.createBufferSource();

        source.buffer = this.buffer;

        const insertedAt = this.sources.push(source) - 1;

        source.onended = () => {
            source.stop(0);

            this.sources.splice(insertedAt, 1);
        };

        const gainNode = context.createGain();

        gainNode.gain.value = volume;

        source.connect(gainNode).connect(context.destination);

        source.start(time);
    }

    stop() {
        this.sources.forEach((source) => {
            source.stop(0);
        });

        this.sources = [];
    }

}

class SMSoundServiceClass {

    static EXTENSION = IS_FIREFOX ? 'ogg' : 'mp3';

    blipSound = new Sound(`./sounds/blip.${SMSoundServiceClass.EXTENSION}`);
    coinSound = new Sound(`./sounds/coin.${SMSoundServiceClass.EXTENSION}`);
    stopSound = new Sound(`./sounds/stop.${SMSoundServiceClass.EXTENSION}`);
    unluckySound = new Sound(`./sounds/unlucky.${SMSoundServiceClass.EXTENSION}`);
    winSound = new Sound(`./sounds/win.${SMSoundServiceClass.EXTENSION}`);

    soundsStatus = 'loading';

    isEnabled = false;

    constructor() {
        this.loadSounds();
    }

    loadSounds() {
        this.soundsStatus = 'loading';
        this.isEnabled = false;

        Promise.all([
            this.blipSound.load(),
            this.coinSound.load(),
            this.stopSound.load(),
            this.unluckySound.load(),
            this.winSound.load(),
        ]).then(() => {
            this.soundsStatus = 'loaded';
            this.isEnabled = true;
        }).catch(() => {
            this.soundsStatus = 'error';
            this.isEnabled = false;
        });
    }

    blip(...args) {
        this.isEnabled && this.blipSound.play(...args);
    }

    coin(...args) {
        this.isEnabled && this.coinSound.play(...args);
    }

    stop(...args) {
        this.isEnabled && this.stopSound.play(...args);
    }

    unlucky(...args) {
        this.isEnabled && this.unluckySound.play(...args);
    }

    win(...args) {
        this.isEnabled && this.winSound.play(...args);
    }

}

export const SMSoundService = new SMSoundServiceClass();
