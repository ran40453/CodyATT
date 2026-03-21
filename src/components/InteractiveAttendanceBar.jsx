import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function InteractiveAttendanceBar({ attendanceBoxes, today, className, onSelectDate }) {
    const [activeIdx, setActiveIdx] = useState(null);
    const timeoutRef = useRef(null);

    const activateNode = (idx) => {
        if (idx !== null && idx >= 0 && idx < attendanceBoxes.length) {
            setActiveIdx(idx);
            
            // Trigger highlight in parent
            if (onSelectDate) {
                onSelectDate(attendanceBoxes[idx].day);
            }

            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                setActiveIdx(null);
            }, 2000); // 2 seconds auto revert
        } else {
            setActiveIdx(null);
        }
    };

    // Pure CSS/Motion hover effects below

    return (
        <div
            className={cn("flex items-center justify-between relative select-none h-1.5 gap-[1px] overflow-visible", className)}
            style={{
                touchAction: 'none',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none'
            }}
        >
            {attendanceBoxes.map((box, idx) => {
                // Robust date-only comparison
                const boxDay = new Date(box.day);
                boxDay.setHours(0, 0, 0, 0);
                const compareToday = new Date(today);
                compareToday.setHours(0, 0, 0, 0);

                const isPast = boxDay < compareToday;
                const isToday = boxDay.getTime() === compareToday.getTime();
                const isPastOrToday = isPast || isToday;

                let hexBg = "#f3f4f6"; // default future/none (gray-100)
                if (isPastOrToday) {
                    if (box.type === 'attendance') {
                        hexBg = "#a855f7"; // purple-500
                    } else if (box.type === 'leave') {
                        hexBg = "#f472b6"; // pink-400 (distinct for leave)
                    } else {
                        hexBg = "#e5e7eb"; // gray-200 (past weekend/holiday)
                    }
                }

                return (
                    <div
                        key={idx}
                        className="flex-1 h-8 -my-3.5 relative cursor-pointer overflow-visible flex items-center group/segment"
                        style={{ minWidth: 0, touchAction: 'none' }}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onMouseLeave={() => setActiveIdx(null)}
                        onClick={() => onSelectDate && onSelectDate(box.day)}
                    >
                        {/* The Morphing Shape - State Based */}
                        <div
                            className={cn(
                                "absolute left-0 w-full h-[40%] top-1/2 -translate-y-1/2 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                                activeIdx === idx 
                                    ? "w-[28px] h-[28px] left-1/2 -ml-[14px] z-50 bg-[#a855f7] border border-white shadow-xl scale-125" 
                                    : "z-10 bg-gray-200",
                                isPastOrToday && box.type === 'attendance' ? "bg-purple-500" : 
                                isPastOrToday && box.type === 'leave' ? "bg-pink-400" : 
                                isPastOrToday ? "bg-gray-300" : "bg-gray-100"
                            )}
                            style={{ 
                                borderRadius: activeIdx === idx ? '50%' : '9999px',
                                backgroundColor: activeIdx === idx ? '#a855f7' : undefined 
                            }}
                        >
                            <AnimatePresence>
                                {activeIdx === idx && (
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 0.8 }}
                                        exit={{ opacity: 0, scale: 0 }}
                                        className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white pointer-events-none select-none"
                                    >
                                        {format(boxDay, 'dd')}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
