import { useEffect } from 'react';
import { playBubble, playTick, triggerHaptic } from '../lib/audio';

export function useClickFeedback() {
    useEffect(() => {
        const handleClick = (e) => {
            // Determine if clicking an interactive element
            // Heuristic: Check if the target or any parent is a standard interactive element
            const target = e.target;
            const interactive = target.closest('button, a, input, select, textarea, [role="button"], .cursor-pointer');
            const isInteractive = !!interactive;

            if (isInteractive) {
                // === Interactive: Bubble + Heavy Haptic ===
                triggerHaptic('heavy');
                playBubble();
            } else {
                // === Background: Tick + Light Haptic ===
                triggerHaptic('light');
                playTick();
            }
        };

        // Attach to window capture phase
        window.addEventListener('click', handleClick, true);

        // Cleanup
        return () => {
            window.removeEventListener('click', handleClick, true);
        };
    }, []);
}
