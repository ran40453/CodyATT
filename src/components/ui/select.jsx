import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const SelectContext = React.createContext({});

const Select = ({ children, value: controlledValue, onValueChange, defaultValue }) => {
    const [open, setOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
    const value = controlledValue !== undefined ? controlledValue : internalValue;

    const handleSelect = (val) => {
        if (controlledValue === undefined) setInternalValue(val);
        onValueChange?.(val);
        setOpen(false);
    };

    React.useEffect(() => {
        if (!open) return;
        const close = (e) => {
            if (!e.target.closest("[data-select-root]")) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    return (
        <SelectContext.Provider value={{ open, setOpen, value, handleSelect }}>
            <div data-select-root className="relative w-full">
                {children}
            </div>
        </SelectContext.Provider>
    );
};

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext);
    return (
        <button
            ref={ref}
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
                "flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-bold text-[#2D3748] bg-neumo-bg shadow-neumo-pressed transition-all focus:outline-none focus:ring-2 focus:ring-neumo-brand/40 disabled:opacity-50",
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown size={14} className={cn("text-[#2D3748]/40 transition-transform duration-200", open && "rotate-180")} />
        </button>
    );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ placeholder }) => {
    const { value } = React.useContext(SelectContext);
    return <span className={value ? "text-[#2D3748]" : "text-[#2D3748]/30"}>{value || placeholder}</span>;
};

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => {
    const { open } = React.useContext(SelectContext);
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className={cn(
                        "absolute top-full left-0 right-0 mt-2 z-50 bg-neumo-bg rounded-2xl shadow-neumo-raised max-h-60 overflow-y-auto",
                        className
                    )}
                    {...props}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
});
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef(({ className, value: itemValue, children, ...props }, ref) => {
    const { value, handleSelect } = React.useContext(SelectContext);
    const isSelected = value === itemValue;
    return (
        <div
            ref={ref}
            onClick={() => handleSelect(itemValue)}
            className={cn(
                "relative flex items-center justify-between px-4 py-2.5 text-sm font-bold cursor-pointer transition-all",
                isSelected ? "text-neumo-brand bg-neumo-brand/5" : "text-[#2D3748] hover:bg-neumo-brand/5 hover:text-neumo-brand",
                className
            )}
            {...props}
        >
            {children}
            {isSelected && <Check size={12} className="text-neumo-brand" />}
        </div>
    );
});
SelectItem.displayName = "SelectItem";

const SelectGroup = ({ children, ...props }) => <div {...props}>{children}</div>;
const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#2D3748]/40", className)} {...props} />
));
SelectLabel.displayName = "SelectLabel";
const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("my-1 h-px bg-[#b8bec7]/30", className)} {...props} />
));
SelectSeparator.displayName = "SelectSeparator";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator };
