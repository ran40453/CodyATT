import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PopoverContext = React.createContext({});

const Popover = ({ children, open: controlledOpen, onOpenChange, defaultOpen = false }) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = React.useCallback((val) => {
        if (controlledOpen === undefined) setInternalOpen(val);
        onOpenChange?.(val);
    }, [controlledOpen, onOpenChange]);
    return (
        <PopoverContext.Provider value={{ isOpen, setOpen }}>
            <div className="relative inline-block">{children}</div>
        </PopoverContext.Provider>
    );
};

const PopoverTrigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
    const { isOpen, setOpen } = React.useContext(PopoverContext);
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            ref,
            onClick: (e) => { children.props.onClick?.(e); setOpen(!isOpen); },
            ...props
        });
    }
    return (
        <div ref={ref} onClick={() => setOpen(!isOpen)} className="inline-block" {...props}>
            {children}
        </div>
    );
});
PopoverTrigger.displayName = "PopoverTrigger";

const PopoverContent = React.forwardRef(({ className, align = "center", side = "bottom", sideOffset = 8, children, ...props }, ref) => {
    const { isOpen, setOpen } = React.useContext(PopoverContext);
    const contentRef = React.useRef(null);

    React.useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e) => {
            if (!contentRef.current?.contains(e.target)) setOpen(false);
        };
        setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen, setOpen]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={contentRef}
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className={cn(
                        "fixed z-[9000] bg-neumo-bg rounded-2xl shadow-neumo-raised border border-white/60 p-4",
                        className
                    )}
                    {...props}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
});
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };
