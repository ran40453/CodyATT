import * as React from "react";
import { cn } from "@/lib/utils";

const Separator = React.forwardRef(({
    className,
    orientation = "horizontal",
    decorative = true,
    ...props
}, ref) => (
    <div
        ref={ref}
        role={decorative ? "none" : "separator"}
        aria-orientation={!decorative ? orientation : undefined}
        className={cn(
            "bg-[#b8bec7]/30 shrink-0",
            orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
            className
        )}
        {...props}
    />
));
Separator.displayName = "Separator";

export { Separator };
