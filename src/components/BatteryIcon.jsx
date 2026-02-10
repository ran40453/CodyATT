import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

function BatteryIcon({
    value,
    total,
    unit = '',
    label,
    subLabel,
    color = 'bg-green-500',
    className
}) {
    const percentage = Math.min(100, Math.max(0, (value / (total || 1)) * 100));
    const isLow = percentage < 20;
    const displayColor = isLow ? 'bg-rose-500' : color;

    // determine level blocks (like 5 blocks?)
    // Or just a smooth fill? User said "Battery remaining value icon"
    // Let's do a smooth fill.

    return (
        <div className={cn("flex flex-col items-center justify-center p-2 group", className)}>
            {/* Battery Body */}
            <div className="relative">
                <div className="w-20 h-10 border-[3px] border-gray-400/80 rounded-xl p-1 relative flex items-center bg-gray-100/50 backdrop-blur-sm shadow-inner group-hover:scale-105 transition-transform duration-300">
                    {/* Terminal (Nipple) */}
                    <div className="absolute -right-[7px] top-1/2 -translate-y-1/2 w-2 h-4 bg-gray-400/80 rounded-r-md" />

                    {/* Fill */}
                    <div className="w-full h-full relative overflow-hidden rounded-lg">
                        <motion.div
                            className={cn("h-full rounded-md shadow-[0_0_10px_rgba(0,0,0,0.1)]", displayColor)}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            whileHover={{ scale: 1.05, filter: "brightness(1.1)" }}
                            transition={{ type: "spring", stiffness: 120, damping: 15 }}
                        />
                        {/* Liquid Bubble Effect Overlay (Optional styling) */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none rounded-md" />
                    </div>

                    {/* Value Text Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <span className={cn(
                            "text-sm font-black shadow-sm tracking-tight",
                            percentage > 55 ? "text-white drop-shadow-md" : "text-gray-600"
                        )}>
                            {value}<span className="text-[10px] ml-0.5 opacity-80">{unit}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Labels */}
            {label && (
                <div className="mt-3 text-center">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none group-hover:text-gray-500 transition-colors">{label}</div>
                    {subLabel && <div className="text-[9px] font-bold text-gray-300 mt-0.5">{subLabel}</div>}
                </div>
            )}
        </div>
    );
}

export default BatteryIcon;
