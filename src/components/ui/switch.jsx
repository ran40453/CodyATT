import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef(({ className, checked, onCheckedChange, defaultChecked, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false);
    const controlled = checked !== undefined;
    const active = controlled ? checked : isChecked;

    const handleClick = () => {
        const next = !active;
        if (!controlled) setIsChecked(next);
        onCheckedChange?.(next);
    };

    return (
        <button
            ref={ref}
            type="button"
            role="switch"
            aria-checked={active}
            onClick={handleClick}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neumo-brand/50 disabled:opacity-50",
                active
                    ? "bg-neumo-brand shadow-[0_4px_12px_rgba(99,102,241,0.4)] shadow-neumo-pressed"
                    : "bg-neumo-bg shadow-neumo-pressed",
                className
            )}
            {...props}
        >
            <motion.span
                layout
                transition={{ type: "spring", stiffness: 700, damping: 35 }}
                className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full shadow-neumo-flat mt-0.5",
                    active ? "ml-[22px] bg-white" : "ml-0.5 bg-[#E0E5EC]"
                )}
            />
        </button>
    );
});
Switch.displayName = "Switch";

export { Switch };
