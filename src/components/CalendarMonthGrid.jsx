import React, { useMemo } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { AnimatePresence } from 'framer-motion'
import { isTaiwanHoliday } from '../lib/holidays'
import DayCard from './DayCard'
import DayCardExpanded from './DayCardExpanded'
import { motion } from 'framer-motion'

function CalendarMonthGrid({
    monthDate,
    data,
    onUpdate,
    onDelete,
    isPrivacy,
    focusedDay,
    setFocusedDay
}) {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    // Flattened list of days for Grid
    const days = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd]);

    // Calculate Grid Rows
    const totalDays = days.length;
    const totalRows = Math.ceil(totalDays / 7);

    const getRecordForDay = (day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const record = data.find(r => {
            if (!r.date) return false
            const dStr = format(new Date(r.date), 'yyyy-MM-dd')
            return dStr === dayStr
        })

        if (record) {
            return {
                ...record,
                isHoliday: record.isHoliday !== undefined ? !!record.isHoliday : isTaiwanHoliday(day)
            }
        }

        if (isTaiwanHoliday(day)) {
            return { date: dayStr, isHoliday: true, _isAutoHoliday: true }
        }

        return null;
    }

    // Overlay Logic Calculation
    const getOverlayGeometry = (day) => {
        if (!day) return null;

        const dayIndex = days.findIndex(d => isSameDay(d, day));
        if (dayIndex === -1) return null;

        // Responsive Grid Config
        const isMobile = window.innerWidth < 768; // Tailwind md breakpoint
        const cols = 7;
        const row = Math.floor(dayIndex / cols);
        const col = dayIndex % cols;

        // Overlay Dimensions
        const overlayWidth = isMobile ? 3 : 2; // Spans 3 cols on mobile, 2 on desktop
        const overlayHeight = isMobile ? 4 : 3; // Spans 4 rows on mobile, 3 on desktop

        // Vertical Logic: Cover the clicked cell if possible
        let targetStartRow = Math.max(0, Math.min(row, totalRows - overlayHeight));

        // Horizontal Logic: 
        // Default: Expand Right [Col, ... , Col + width - 1]
        // Boundary Check: If too close to right edge, shift left
        let targetStartCol = col;
        if (col + overlayWidth > cols) {
            targetStartCol = cols - overlayWidth;
        }

        // Is clicked cell inside the block?
        const isRowInside = row >= targetStartRow && row < targetStartRow + overlayHeight;
        const isColInside = col >= targetStartCol && col < targetStartCol + overlayWidth;
        const isInside = isRowInside && isColInside;

        return {
            row, col,
            targetStartRow,
            targetStartCol,
            overlayWidth,
            overlayHeight,
            isInside
        };
    }

    const overlayGeo = useMemo(() => getOverlayGeometry(focusedDay), [focusedDay, days]);

    return (
        <div className="relative pb-4">
            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 md:gap-3 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-[7px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>

            {/* Main Grid */}
            <div
                className="grid grid-cols-7 gap-1 md:gap-3 lg:min-h-[600px] relative"
                style={{
                    gridAutoRows: 'minmax(80px, 1fr)'
                }}
            >
                {days.map((day) => {
                    return (
                        <div key={format(day, 'yyyy-MM-dd')}>
                            <DayCard
                                day={day}
                                isCurrentMonth={isSameMonth(day, monthStart)}
                                record={getRecordForDay(day)}
                                onClick={() => setFocusedDay(isSameDay(day, focusedDay) ? null : day)}
                                isPrivacy={isPrivacy}
                            />
                        </div>
                    )
                })}

                {/* Overlay Layer */}
                <AnimatePresence>
                    {focusedDay && overlayGeo && (
                        <CalendarOverlay
                            day={focusedDay}
                            record={getRecordForDay(focusedDay)}
                            geometry={overlayGeo}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onClose={() => setFocusedDay(null)}
                            isPrivacy={isPrivacy}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

function CalendarOverlay({ day, record, geometry, onUpdate, onDelete, onClose, isPrivacy }) {
    const { row, col, targetStartRow, targetStartCol, overlayWidth, overlayHeight, isInside } = geometry;

    const isMobile = window.innerWidth < 768;
    const blockStyle = {
        gridColumn: `${targetStartCol + 1} / span ${overlayWidth}`,
        gridRowStart: targetStartRow + 1,
        position: 'absolute',
        width: '100%',
        minHeight: isMobile ? '320px' : '280px',
        height: 'auto',
        zIndex: 50
    };

    const cellStyle = {
        gridColumn: `${col + 1} / span 1`,
        gridRow: `${row + 1} / span 1`,
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 51
    };

    let stickDir = null;
    if (row < targetStartRow) stickDir = 'top';
    else if (row >= targetStartRow + overlayHeight) stickDir = 'bottom';

    const attachCol = (col === targetStartCol) ? 'left' : 'right';

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-transparent"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={blockStyle}
                className="relative pointer-events-auto"
            >
                <div className="h-full w-full bg-[#E0E5EC] neumo-raised rounded-2xl md:rounded-3xl shadow-2xl relative overflow-visible">
                    <DayCardExpanded
                        day={day}
                        record={record}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onClose={onClose}
                        hideHeader={!isInside}
                        className="h-full w-full shadow-none bg-transparent"
                        style={{
                            borderTopLeftRadius: stickDir === 'top' && attachCol === 'left' ? 0 : undefined,
                            borderTopRightRadius: stickDir === 'top' && attachCol === 'right' ? 0 : undefined,
                            borderBottomLeftRadius: stickDir === 'bottom' && attachCol === 'left' ? 0 : undefined,
                            borderBottomRightRadius: stickDir === 'bottom' && attachCol === 'right' ? 0 : undefined,
                        }}
                    />
                </div>
            </motion.div>

            {!isInside && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={cellStyle}
                    className="relative pointer-events-none"
                >
                    <div
                        className="h-full w-full bg-[#E0E5EC] neumo-raised p-2 flex flex-col items-center justify-start relative shadow-none"
                        style={{
                            borderBottomLeftRadius: stickDir === 'top' ? 0 : undefined,
                            borderBottomRightRadius: stickDir === 'top' ? 0 : undefined,
                            borderTopLeftRadius: stickDir === 'bottom' ? 0 : undefined,
                            borderTopRightRadius: stickDir === 'bottom' ? 0 : undefined,
                            zIndex: 52
                        }}
                    >
                        <span className="text-xl md:text-2xl font-black text-neumo-brand">{format(day, 'dd')}</span>
                        <div
                            className="absolute bg-[#E0E5EC] z-50"
                            style={{
                                width: '100%',
                                height: '20px',
                                left: 0,
                                bottom: stickDir === 'top' ? '-10px' : undefined,
                                top: stickDir === 'bottom' ? '-10px' : undefined,
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </>
    )
}

export default CalendarMonthGrid
