import React, { useMemo } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { isTaiwanHoliday } from '../lib/holidays'
import DayCard from './DayCard'
import DayCardExpanded from './DayCardExpanded'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

function CalendarMonthGrid({
    monthDate,
    dataMap,
    settings,
    onUpdate,
    onDelete,
    isPrivacy,
    modalTop,
    onDayClick
}) {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd]);

    const getRecordForDay = (day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const record = dataMap.get(dayStr)

        if (record) {
            return {
                ...record,
                isHoliday: record.isHoliday !== undefined ? !!record.isHoliday : isTaiwanHoliday(day)
            }
        }

        const isHoliday = isTaiwanHoliday(day);
        const today = new Date();
        const isPastOrToday = day <= today || isSameDay(day, today);
        const dayOfWeek = day.getDay();
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

        if (isPastOrToday && isWeekday && !isHoliday) {
            return {
                date: dayStr,
                isHoliday: false,
                isAutoFilled: true,
                startTime: '08:30',
                endTime: '17:30',
                isWorkDay: true
            }
        }
        if (isHoliday) return { date: dayStr, isHoliday: true, _isAutoHoliday: true };
        return null;
    }

    return (
        <div className="relative pb-4">
            <div className="grid grid-cols-7 gap-1 md:gap-3 lg:min-h-[600px] relative" style={{ gridAutoRows: 'minmax(80px, 1fr)' }}>
                {days.map((day) => {
                    return (
                        <div key={format(day, 'yyyy-MM-dd')}>
                            <DayCard
                                day={day}
                                isCurrentMonth={isSameMonth(day, monthStart)}
                                record={getRecordForDay(day)}
                                onClick={() => onDayClick(day)}
                                isPrivacy={isPrivacy}
                                settings={settings}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export function CalendarOverlay({ day, record, onUpdate, onDelete, onClose, isPrivacy, settings, modalTop }) {
    const isMobile = window.innerWidth < 768;
    const blockStyle = {
        position: 'fixed',
        top: modalTop || '140px', 
        left: '50%',
        margin: 0,
        width: isMobile ? '95%' : '800px',
        maxWidth: '95vw',
        height: 'auto',
        maxHeight: 'calc(100vh - 160px)',
        zIndex: 2000,
        pointerEvents: 'auto'
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, pointerEvents: 'none' }}
                transition={{ duration: 0 }}
                className="fixed inset-0 z-[1998] bg-black/5 backdrop-blur-[1px] pointer-events-auto"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10, x: "-50%" }}
                animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, scale: 0.95, y: 10, x: "-50%", pointerEvents: 'none' }}
                transition={{ type: "spring", stiffness: 400, damping: 22, mass: 1 }}
                style={blockStyle}
                className="z-[1999] pointer-events-auto"
            >
                <div className="h-full w-full bg-[#E0E5EC] neumo-raised rounded-3xl shadow-xl relative overflow-hidden flex flex-col">
                    <DayCardExpanded
                        day={day}
                        record={record}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onClose={onClose}
                        settings={settings}
                        className="h-full w-full shadow-none bg-transparent overflow-y-auto"
                    />
                </div>
            </motion.div>
        </>
    )
}

export default CalendarMonthGrid
