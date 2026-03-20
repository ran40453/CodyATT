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
                    <motion.div
                        key={idx}
                        whileHover="hovered"
                        className="flex-1 h-full relative cursor-pointer overflow-visible"
                        style={{ minWidth: 0, touchAction: 'none' }}
                    >
                        <motion.div
                            variants={{
                                initial: {
                                    borderRadius: 2,
                                    height: '100%',
                                    width: '100%',
                                    scale: 1,
                                    y: 0,
                                    zIndex: 10,
                                    backgroundColor: hexBg,
                                },
                                hovered: {
                                    borderRadius: '50%',
                                    // Use a trick to ensure height matches width for a perfect circle
                                    aspectRatio: '1 / 1',
                                    height: 'auto',
                                    scale: 2.2, // Slightly larger for clarity
                                    zIndex: 50,
                                    y: '-50%',
                                    top: '50%',
                                    backgroundColor: "#a855f7",
                                    boxShadow: '0 8px 16px rgba(168, 85, 247, 0.4)',
                                    border: '1.5px solid white'
                                }
                            }}
                            initial="initial"
                            animate="initial" // Force initial state to clear any stuck animations
                            className="absolute top-0 left-0 w-full flex items-center justify-center pointer-events-none"
                        >
                            <motion.span 
                                variants={{
                                    initial: { opacity: 0, scale: 0 },
                                    hovered: { opacity: 1, scale: 0.7 }
                                }}
                                className="text-[10px] font-black text-white pointer-events-none select-none"
                            >
                                {format(boxDay, 'dd')}
                            </motion.span>
                        </motion.div>
                    </motion.div>
                )
            })}
        </div>
    )
}
