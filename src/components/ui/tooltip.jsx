import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const TooltipContext = React.createContext({});

const TooltipProvider = ({ children, delayDuration = 400 }) => (
    <TooltipContext.Provider value={{ delayDuration }}>
        {children}
    </TooltipContext.Provider>
);

const Tooltip = ({ children, open: controlledOpen }) => {
    const [open, setOpen] = React.useState(false);
    const isOpen = controlledOpen !== undefined ? controlledOpen : open;
    return (
        <TooltipContext.Provider value={{ open: isOpen, setOpen }}>
            <div className="relative inline-flex">{children}</div>
        </TooltipContext.Provider>
    );
};

const TooltipTrigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
    const { setOpen } = React.useContext(TooltipContext);
    const triggerRef = React.useRef(null);
    const combinedRef = ref || triggerRef;

    return (
        <div
            ref={combinedRef}
            onMouseEnter={() => setOpen?.(true)}
            onMouseLeave={() => setOpen?.(false)}
            onFocus={() => setOpen?.(true)}
            onBlur={() => setOpen?.(false)}
            className="inline-flex"
            {...props}
        >
            {children}
        </div>
    );
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef(({ className, sideOffset = 6, children, ...props }, ref) => {
    const { open } = React.useContext(TooltipContext);
    if (!open) return null;
    return createPortal(
        <div
            ref={ref}
            className={cn(
                "fixed z-[9999] pointer-events-none",
                className
            )}
            style={{ transform: "translate(-50%, calc(-100% - 8px))" }}
            {...props}
        >
            <div className="bg-[#2D3748] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                {children}
            </div>
        </div>,
        document.body
    );
});
TooltipContent.displayName = "TooltipContent";

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
