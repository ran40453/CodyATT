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
            className={cn("flex items-center justify-between relative select-none h-1.5 overflow-visible", className)}
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
                        className="flex-1 h-full relative group cursor-pointer overflow-visible"
                        style={{ minWidth: 0, touchAction: 'none' }}
                    >
                        <motion.div
                            initial={false}
                            animate={{
                                backgroundColor: hexBg,
                            }}
                            whileHover={{
                                scale: 1.2,
                                backgroundColor: "#a855f7",
                                zIndex: 50
                            }}
                            className={cn(
                                "absolute w-full h-full pointer-events-none",
                                isPastOrToday && box.type === 'attendance' ? "shadow-sm" : ""
                            )}
                            style={{
                                top: 0,
                                left: 0,
                                borderRadius: 2
                            }}
                        />
                        
                        {/* Hover indicator point */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            whileHover={{ opacity: 1, scale: 1 }}
                            className="absolute z-50 pointer-events-none flex items-center justify-center"
                            style={{
                                top: '50%',
                                left: '50%',
                                x: '-50%',
                                y: '-50%',
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: '#a855f7',
                                border: '2px solid white',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            <span className="text-[8px] font-black text-white pointer-events-none">
                                {format(box.day, 'dd')}
                            </span>
                        </motion.div>
                    </div>
                )
            })}
        </div>
    )
}
