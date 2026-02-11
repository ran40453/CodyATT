import { useEffect, useRef } from 'react';

export function useClickFeedback() {
    // Lazy initialization of AudioContext
    const audioCtxRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            // Determine if clicking an interactive element
            // Heuristic: Check if the target or any parent is a standard interactive element
            const target = e.target;
            const interactive = target.closest('button, a, input, select, textarea, [role="button"], .cursor-pointer');
            const isInteractive = !!interactive;

            // Haptic Feedback (Mobile)
            // Note: iOS Safari does not support navigator.vibrate. Works on Android.
            if (navigator.vibrate) {
                try {
                    // Stronger vibration for interactive (15ms), lighter for bg (5ms)
                    navigator.vibrate(isInteractive ? 15 : 5);
                } catch (e) {
                    // Ignore errors if vibration not supported/allowed
                }
            }

            // Audio Feedback (Desktop/Mobile)
            try {
                if (!audioCtxRef.current) {
                    // Create context on first interaction to bypass autoplay policies
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (AudioContext) {
                        audioCtxRef.current = new AudioContext();
                    }
                }

                const ctx = audioCtxRef.current;
                if (ctx && ctx.state !== 'closed') {
                    // Resume if suspended (common in browsers)
                    if (ctx.state === 'suspended') {
                        ctx.resume();
                    }

                    const t = ctx.currentTime;
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    if (isInteractive) {
                        // === Interactive Sound: "Crystal Bell" ===
                        // High frequency transparent tone (1200Hz -> 800Hz)
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(1200, t);
                        osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);

                        gain.gain.setValueAtTime(0.0, t);
                        gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
                        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

                        osc.start(t);
                        osc.stop(t + 0.35);
                    } else {
                        // === Background Sound: "Low Thud" ===
                        // Low frequency punch (80Hz -> 40Hz)
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(80, t);
                        osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

                        gain.gain.setValueAtTime(0.0, t);
                        gain.gain.linearRampToValueAtTime(0.15, t + 0.005); // Lower volume
                        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

                        osc.start(t);
                        osc.stop(t + 0.15);
                    }

                    // Cleanup
                    setTimeout(() => {
                        osc.disconnect();
                        gain.disconnect();
                    }, 400);
                }
            } catch (err) {
                console.warn('Audio feedback failed:', err);
            }
        };

        // Attach to window capture phase to ensure it runs before other handlers stop propagation
        window.addEventListener('click', handleClick, true);

        // Cleanup
        return () => {
            window.removeEventListener('click', handleClick, true);
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
                audioCtxRef.current = null;
            }
        };
    }, []);
}
