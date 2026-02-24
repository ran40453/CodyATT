import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function InteractiveAttendanceBar({ attendanceBoxes, today, className }) {
    const [activeIdx, setActiveIdx] = useState(null);
    const timeoutRef = useRef(null);

    const activateNode = (idx) => {
        if (idx !== null && idx >= 0 && idx < attendanceBoxes.length) {
            setActiveIdx(idx);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                setActiveIdx(null);
            }, 2000); // 2 seconds auto revert
        } else {
            setActiveIdx(null);
        }
    };

    const handlePointerMove = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const el = document.elementFromPoint(clientX, clientY);
        const node = el?.closest('[data-idx]');
        if (node) {
            activateNode(parseInt(node.dataset.idx, 10));
        }
    };

    return (
        <div
            className={cn("flex items-center justify-between relative select-none", className)}
            onPointerMove={handlePointerMove}
            style={{
                touchAction: 'none',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none'
            }}
        >
            {attendanceBoxes.map((box, idx) => {
                const isPastOrToday = box.day <= today;
                const isActive = activeIdx === idx;

                let hexBg = "#e5e7eb"; // bg-gray-200
                if (isPastOrToday) {
                    hexBg = box.type === 'attendance' ? "#a855f7" : "#e9d5ff"; // purple-500 : purple-200
                }

                return (
                    <div
                        key={idx}
                        data-idx={idx}
                        onPointerDown={() => activateNode(idx)}
                        onMouseEnter={() => activateNode(idx)}
                        className="flex-1 h-full relative"
                        style={{ minWidth: 0, touchAction: 'none' }}
                    >
                        <motion.div
                            initial={false}
                            animate={{
                                width: isActive ? 24 : "100%",
                                height: isActive ? 24 : "100%",
                                borderRadius: isActive ? 12 : 2,
                                x: "-50%",
                                y: "-50%",
                                backgroundColor: isActive ? "#a855f7" : hexBg,
                            }}
                            className={cn(
                                "absolute pointer-events-none",
                                isPastOrToday && box.type === 'attendance' ? "shadow-sm" : ""
                            )}
                            style={{
                                zIndex: isActive ? 50 : 1,
                                top: "50%",
                                left: "50%",
                            }}
                        >
                            <AnimatePresence>
                                {isActive && (
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0 }}
                                        className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white pointer-events-none drop-shadow-md"
                                    >
                                        {format(box.day, 'dd')}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )
            })}
        </div>
    )
}
