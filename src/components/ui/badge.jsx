import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
    default: "bg-neumo-brand/10 text-neumo-brand border border-neumo-brand/20",
    secondary: "bg-[#E0E5EC] text-[#2D3748]/60 border border-[#b8bec7]/40 shadow-neumo-flat",
    destructive: "bg-red-500/10 text-red-600 border border-red-500/20",
    outline: "bg-transparent border border-[#b8bec7] text-[#2D3748]/60",
    success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
};

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
    <span
        ref={ref}
        className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors",
            badgeVariants[variant] || badgeVariants.default,
            className
        )}
        {...props}
    />
));
Badge.displayName = "Badge";

export { Badge, badgeVariants };
