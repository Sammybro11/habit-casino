import { IS_FIREFOX, createElement, shuffle, resetAnimations, stopAtAnimation } from './utils';
import { SMSoundService } from './sound';

export class Reel {

    static C_REEL = 'sm__reel';
    static C_CELL = 'sm__cell';
    static C_CELL_SHADOW = 'sm__cell--has-shadow';
    static C_CELL_BLUR = 'sm__cell--has-blur';
    static C_FIGURE = 'sm__figure';
    static C_IS_STOP = 'is-stop';

    static V_INDEX = '--index';

    static STOP_ANIMATION_DURATION_MULTIPLIER = 5;

    root;
    style;

    index;
    alpha;
    shadowCount;

    angle = 0;
    stopAt = 0;

    constructor(index, alpha, symbols, diameter) {
        this.index = index;
        this.alpha = alpha;

        const { C_REEL, C_CELL, C_CELL_SHADOW, C_CELL_BLUR, C_FIGURE, C_IS_STOP, V_INDEX } = Reel;
        const root = this.root = createElement([C_REEL, C_IS_STOP]);
        const style = this.style = root.style;

        style.setProperty(V_INDEX, index);

        if (!symbols) {
            return;
        }

        let cellShadowClasses;
        let shadowOpacityWeight;

        if (IS_FIREFOX) {
            cellShadowClasses = [C_CELL, C_CELL_SHADOW];
            shadowOpacityWeight = 0.5;
        } else {
            cellShadowClasses = [C_CELL, C_CELL_SHADOW, C_CELL_BLUR];
            shadowOpacityWeight = 1;
        }

        const shadowCount = this.shadowCount = Math.max(2, Math.round((diameter - 0.5 - (2 * index)) * Math.PI / symbols.length));
        const beta = 1 / shadowCount;

        symbols = shuffle(symbols);

        symbols.forEach((symbol, symbolIndex) => {
            const cellFigure = createElement(C_FIGURE, symbol);

            const cell = createElement(C_CELL, cellFigure, symbolIndex * alpha);

            root.appendChild(cell);

            for (let shadowIndex = 1; shadowIndex < shadowCount; ++shadowIndex) {
                root.appendChild(createElement(
                    cellShadowClasses,
                    cellFigure.cloneNode(true),
                    alpha * (symbolIndex + (beta * shadowIndex)),
                    `opacity: ${shadowOpacityWeight * (1 - (beta * shadowIndex))}; `,
                ));
            }
        });
    }

    reset() {
        const { root, style, stopAt } = this;

        root.classList.remove(Reel.C_IS_STOP);
        style.transform = `rotate(${this.angle = ((360 - stopAt) % 360)}deg)`;
        style.animation = '';

        this.stopAt = 0;
    }

    stop(speed, deltaAlpha) {
        const { alpha, root } = this;
        const angle = (360 - this.angle - deltaAlpha) % 360;
        const index = Math.ceil(angle / alpha);
        const stopAt = index * alpha;
        const animationName = `stop-${this.index}-${Math.round(Math.random() * 1e9)}`;
        const animationDuration = stopAtAnimation(
            animationName,
            (360 - angle) % 360,
            (360 - stopAt) % 360,
            alpha,
            speed,
        ) * Reel.STOP_ANIMATION_DURATION_MULTIPLIER;

        this.stopAt = stopAt;
        this.style.animation = `${animationName} ${animationDuration}ms ease-out forwards`;
        root.classList.add(Reel.C_IS_STOP);
    }

}

export class CasinoMachine {

    static MIN_SPIN = 900;
    static REEL_STOP_GAP = 400;
    static BLIP_RATE = 4;

    static C_IS_WIN = 'is-win';
    static C_IS_DIM = 'is-dim';

    reels = [];
    currentReel = null;
    pendingOutcome = null;
    revealTimeouts = [];
    startedAt = 0;
    blipCounter = 0;
    lastUpdate = 0;

    constructor(reelsEl, { symbols, onOutcome, tierRing = {}, reelCount = 3, speed = -0.552 }) {
        this.reelsEl = reelsEl;
        this.symbols = symbols;
        this.onOutcome = onOutcome;
        this.tierRing = tierRing;
        this.reelCount = reelCount;
        this.speed = speed;
        this.blipFading = 1 / reelCount;
        this.alpha = 360 / symbols.length;

        const diameter = (2 * reelCount) + 3;

        for (let reelIndex = 0; reelIndex < reelCount; ++reelIndex) {
            const reel = new Reel(reelIndex, this.alpha, symbols, diameter);

            reelsEl.appendChild(reel.root);
            this.reels.push(reel);
        }

        reelsEl.appendChild(new Reel(reelCount).root);
    }

    start() {
        this.revealTimeouts.forEach(clearTimeout);
        this.revealTimeouts = [];
        this.pendingOutcome = null;
        this.currentReel = 0;
        this.startedAt = performance.now();
        this.reels.forEach((reel) => {
            reel.reset();
            reel.root.classList.remove(CasinoMachine.C_IS_WIN, CasinoMachine.C_IS_DIM);
        });
        resetAnimations();

        SMSoundService.coin();

        this.lastUpdate = performance.now();
        requestAnimationFrame(() => this.tick());
    }

    reveal(outcome, selectedTier) {
        this.pendingOutcome = outcome;
        this.selectedTier = selectedTier;

        const wait = Math.max(0, CasinoMachine.MIN_SPIN - (performance.now() - this.startedAt));

        this.revealTimeouts = [
            setTimeout(() => this.stopReel(0), wait),
            setTimeout(() => this.stopReel(1), wait + CasinoMachine.REEL_STOP_GAP),
            setTimeout(() => {
                this.stopReel(2);
                this.stop();
            }, wait + (2 * CasinoMachine.REEL_STOP_GAP)),
        ];
    }

    stop() {
        const outcome = this.pendingOutcome;

        this.currentReel = null;

        const tierIndex = this.tierRing[outcome?.result?.Reward];
        const paidIndex = this.tierRing[this.selectedTier];

        if (tierIndex != null) {
            this.reels.forEach((reel, i) => reel.root.classList.add(i === tierIndex ? CasinoMachine.C_IS_WIN : CasinoMachine.C_IS_DIM));
        } else if (outcome?.result === 'Jackpot') {
            this.reels.forEach((reel) => reel.root.classList.add(CasinoMachine.C_IS_WIN));
        }

        if (tierIndex != null && paidIndex != null && tierIndex < paidIndex) {
            SMSoundService.unlucky();
        } else {
            SMSoundService.win();
        }

        this.onOutcome(outcome);
    }

    tick() {
        const { reels, speed, currentReel, lastUpdate } = this;
        const now = performance.now();
        const deltaTime = now - lastUpdate;
        const deltaAlpha = deltaTime * speed;

        if (currentReel === null) {
            return;
        }

        const blipCounter = this.blipCounter = (this.blipCounter + 1) % CasinoMachine.BLIP_RATE;

        if (blipCounter === 0) SMSoundService.blip(1 - (this.blipFading * currentReel));

        this.lastUpdate = now;

        for (let i = reels.length - 1; i >= currentReel; --i) {
            const reel = reels[i];
            const angle = reel.angle = (360 + (reel.angle + deltaAlpha)) % 360;

            reel.style.transform = `rotate(${angle}deg)`;
        }

        requestAnimationFrame(() => this.tick());
    }

    stopReel(reelIndex) {
        const { speed } = this;
        const deltaAlpha = (performance.now() - this.lastUpdate) * speed;

        this.reels[reelIndex].stop(speed, deltaAlpha);

        ++this.currentReel;

        SMSoundService.stop();
    }

    abort() {
        this.revealTimeouts.forEach(clearTimeout);
        this.revealTimeouts = [];
        this.pendingOutcome = null;
        this.currentReel = null;
        this.reels.forEach((reel) => {
            reel.reset();
            reel.root.classList.remove(CasinoMachine.C_IS_WIN, CasinoMachine.C_IS_DIM);
        });
        resetAnimations();
    }

    destroy() {
        this.abort();
        this.reelsEl.replaceChildren();
    }

}
