import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
    default: "bg-neumo-bg shadow-neumo-flat hover:shadow-neumo-raised active:shadow-neumo-pressed text-[#2D3748] transition-all duration-200",
    primary: "bg-neumo-brand text-white shadow-[0_8px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_12px_28px_rgba(99,102,241,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
    destructive: "bg-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.35)] hover:shadow-[0_8px_20px_rgba(239,68,68,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
    outline: "border border-[#b8bec7] bg-neumo-bg shadow-neumo-flat hover:shadow-neumo-raised text-[#2D3748] active:shadow-neumo-pressed transition-all duration-200",
    secondary: "bg-neumo-bg shadow-neumo-flat hover:shadow-neumo-raised active:shadow-neumo-pressed text-[#2D3748]/70 transition-all duration-200",
    ghost: "bg-transparent hover:bg-neumo-brand/5 hover:text-neumo-brand active:bg-neumo-brand/10 text-[#2D3748]/60 transition-all duration-200",
    link: "bg-transparent text-neumo-brand underline-offset-4 hover:underline p-0 h-auto transition-colors",
};

const buttonSizes = {
    default: "h-10 px-4 py-2 text-sm rounded-xl",
    sm: "h-8 px-3 text-xs rounded-lg",
    lg: "h-12 px-6 text-base rounded-2xl",
    icon: "h-9 w-9 rounded-xl flex items-center justify-center",
    "icon-sm": "h-7 w-7 rounded-lg flex items-center justify-center",
};

const Button = React.forwardRef(({
    className,
    variant = "default",
    size = "default",
    asChild = false,
    children,
    ...props
}, ref) => {
    return (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neumo-brand/50",
                buttonVariants[variant] || buttonVariants.default,
                buttonSizes[size] || buttonSizes.default,
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
});
Button.displayName = "Button";

export { Button, buttonVariants };
