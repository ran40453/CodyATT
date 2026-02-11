// Audio Context Singleton
let audioCtx = null;

const getCtx = () => {
    // Lazy init
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    // Auto-resume if suspended (browser policy)
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { });
    }
    return audioCtx;
};

export const playBubble = () => {
    try {
        const ctx = getCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Bubble Sound: Sine sweep 400Hz -> 1000Hz (Water drop effect)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(1000, t + 0.1);

        gain.gain.setValueAtTime(0.0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.start(t);
        osc.stop(t + 0.25);

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 300);
    } catch (e) {
        // Ignore audio errors
    }
};

export const playTick = () => {
    try {
        const ctx = getCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Wood Block: Sine 800Hz, very short envelope
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);

        gain.gain.setValueAtTime(0.0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        osc.start(t);
        osc.stop(t + 0.05);

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 100);
    } catch (e) {
        // Ignore audio errors
    }
};

export const triggerHaptic = (style = 'light') => {
    if (navigator.vibrate) {
        try {
            if (style === 'heavy') navigator.vibrate(15);
            else navigator.vibrate(5);
        } catch (e) {
            // Ignore vibration errors
        }
    }
}
