import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DialogContext = React.createContext({});

const Dialog = ({ children, open: controlledOpen, onOpenChange, defaultOpen = false }) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

    const setOpen = React.useCallback((val) => {
        if (controlledOpen === undefined) setInternalOpen(val);
        onOpenChange?.(val);
    }, [controlledOpen, onOpenChange]);

    React.useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            document.removeEventListener("keydown", onKey);
        };
    }, [isOpen, setOpen]);

    return (
        <DialogContext.Provider value={{ isOpen, setOpen }}>
            {children}
        </DialogContext.Provider>
    );
};

const DialogTrigger = ({ children, asChild }) => {
    const { setOpen } = React.useContext(DialogContext);
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, { onClick: (e) => { children.props.onClick?.(e); setOpen(true); } });
    }
    return <span onClick={() => setOpen(true)}>{children}</span>;
};

const DialogClose = ({ children, asChild }) => {
    const { setOpen } = React.useContext(DialogContext);
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, { onClick: (e) => { children.props.onClick?.(e); setOpen(false); } });
    }
    return <span onClick={() => setOpen(false)}>{children}</span>;
};

const DialogContent = React.forwardRef(({ className, children, showCloseButton = true, ...props }, ref) => {
    const { isOpen, setOpen } = React.useContext(DialogContext);
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                >
                    <motion.div
                        className="absolute inset-0 bg-[#2D3748]/20 backdrop-blur-sm"
                        onClick={() => setOpen(false)}
                    />
                    <motion.div
                        ref={ref}
                        initial={{ scale: 0.93, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.93, opacity: 0, y: 12 }}
                        transition={{ type: "spring", stiffness: 420, damping: 30 }}
                        className={cn(
                            "relative z-10 w-full max-w-lg bg-neumo-bg rounded-3xl shadow-neumo-raised p-6",
                            className
                        )}
                        {...props}
                    >
                        {showCloseButton && (
                            <button
                                onClick={() => setOpen(false)}
                                className="absolute top-4 right-4 p-2 rounded-xl text-[#2D3748]/40 hover:text-[#2D3748] shadow-neumo-flat hover:shadow-neumo-raised transition-all"
                            >
                                <X size={16} />
                            </button>
                        )}
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }) => (
    <div className={cn("flex flex-col gap-1.5 mb-4", className)} {...props} />
);

const DialogFooter = ({ className, ...props }) => (
    <div className={cn("flex justify-end gap-3 mt-6 pt-4 border-t border-[#b8bec7]/20", className)} {...props} />
);

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-base font-black text-[#2D3748] tracking-tight", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs text-[#2D3748]/50 font-bold", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose };
