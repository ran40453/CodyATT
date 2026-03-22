import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => (
    <input
        type={type}
        ref={ref}
        className={cn(
            "flex w-full rounded-xl px-4 py-2 text-sm font-bold text-[#2D3748] bg-neumo-bg shadow-neumo-pressed outline-none transition-all placeholder:text-[#2D3748]/30 focus:ring-2 focus:ring-neumo-brand/40 disabled:opacity-50 disabled:cursor-not-allowed",
            className
        )}
        {...props}
    />
));
Input.displayName = "Input";

export { Input };
