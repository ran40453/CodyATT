import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn(
            "text-[9px] font-black text-[#2D3748]/50 uppercase tracking-widest block mb-1 cursor-pointer",
            className
        )}
        {...props}
    />
));
Label.displayName = "Label";

export { Label };
