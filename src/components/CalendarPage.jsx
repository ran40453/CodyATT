import React, { useState, useEffect, useRef } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isSameDay, startOfWeek, endOfWeek, setMonth, setYear, getDay, eachMonthOfInterval, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Grid3X3 } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { loadData, addOrUpdateRecord, fetchRecordsFromGist } from '../lib/storage'
import { isTaiwanHoliday } from '../lib/holidays'
import CalendarMonthGrid from './CalendarMonthGrid'

import HeaderActions from './HeaderActions'

function CalendarPage({ data, onUpdate, isPrivacy, setIsPrivacy, togglePrivacy, onSettingsClick }) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [focusedDay, setFocusedDay] = useState(null)
    const [isYearView, setIsYearView] = useState(false)

    // ... (Swipe logic remains the same, assuming it's correctly hooks)
    // Actually, I need to make sure I don't break the existing component structure. 
    // The previous view_file showed the hooks. I will just replace the top part and the header.

    // Swipe Logic
    const x = useMotionValue(0);
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth);
        }
        const handleResize = () => {
            if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Snap to center (-100%) initially and after reset
    useEffect(() => {
        if (containerWidth > 0) {
            x.set(-containerWidth);
        }
    }, [containerWidth, currentDate]); // Reset on currentDate change

    const handleDragEnd = (e, { offset, velocity }) => {
        const threshold = containerWidth * 0.25;
        const swipe = offset.x;

        let targetX = -containerWidth; // Back to center
        let newDate = currentDate;

        if (swipe > threshold || velocity.x > 500) {
            // Swipe Right -> Prev Month
            targetX = 0;
            newDate = subMonths(currentDate, 1);
        } else if (swipe < -threshold || velocity.x < -500) {
            // Swipe Left -> Next Month
            targetX = -containerWidth * 2;
            newDate = addMonths(currentDate, 1);
        }

        animate(x, targetX, {
            type: "spring",
            stiffness: 300,
            damping: 30,
            onComplete: () => {
                if (newDate !== currentDate) {
                    setCurrentDate(newDate);
                    setFocusedDay(null); // Close overlay on swipe
                    // x will be reset by useEffect logic or we can force it here
                    // actually useEffect [currentDate] will reset it.
                    // But to avoid flicker, we should rely on React render cycle.
                    // When currentDate changes, the component re-renders. 
                    // The useEffect [currentDate] sets x to -width. 
                    // Since it's 'motion value' it might not trigger react render but framer handles it.
                }
            }
        });
    };

    // Prevent default touch actions (scrolling) when dragging horizontally?
    // Actually we want vertical scrolling.
    // framer-motion drag="x" handles this usually.

    const handleUpdateRecord = (updatedRecord) => {
        onUpdate(updatedRecord)
    }

    // Selectors Data
    const today = new Date()
    const currentYear = today.getFullYear()
    const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
    const months = Array.from({ length: 12 }, (_, i) => i)

    const handleMonthChange = (e) => {
        setCurrentDate(setMonth(currentDate, parseInt(e.target.value)))
    }

    // Helper to get record (passed to YearView)
    const getRecordForDay = (day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        return data.find(r => r.date && format(new Date(r.date), 'yyyy-MM-dd') === dayStr)
    }

    return (
        <div className="space-y-4 relative">
            {/* Month Header */}
            <header className="flex justify-between items-end px-1 mb-2">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-[#202731]">Calendar</h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">Monthly View</p>
                </div>

                <HeaderActions
                    isPrivacy={isPrivacy}
                    togglePrivacy={togglePrivacy || setIsPrivacy}
                    onSettingsClick={onSettingsClick}
                >
                    {/* Header Controls for Calendar */}
                    <button
                        onClick={() => { setCurrentDate(new Date()); setIsYearView(false); }}
                        className="neumo-button p-2 text-neumo-brand hover:bg-gray-100/50"
                        title="跳至本月"
                    >
                        <Calendar size={18} />
                    </button>
                    <button
                        onClick={() => setIsYearView(!isYearView)}
                        className={`neumo-button p-2 hidden md:flex hover:bg-gray-100/50 ${isYearView ? 'text-neumo-brand' : 'text-gray-400'}`}
                        title="年曆模式"
                    >
                        <Grid3X3 size={18} />
                    </button>
                </HeaderActions>
            </header>

            <div className="flex justify-between items-center bg-[#E0E5EC] neumo-raised rounded-3xl p-4 z-20 relative">
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="neumo-button p-2">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select value={currentDate.getFullYear()} onChange={(e) => setCurrentDate(setYear(currentDate, parseInt(e.target.value)))}
                            className="appearance-none bg-transparent font-extrabold uppercase tracking-widest text-[#202731] py-1 px-4 neumo-pressed rounded-xl focus:outline-none cursor-pointer text-sm">
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <span className="text-gray-300 font-black">/</span>
                    <div className="relative">
                        <select value={currentDate.getMonth()} onChange={handleMonthChange}
                            className="appearance-none bg-transparent font-extrabold uppercase tracking-widest text-[#202731] py-1 px-4 neumo-pressed rounded-xl focus:outline-none cursor-pointer text-sm">
                            {months.map(m => <option key={m} value={m}>{format(new Date(2024, m), 'MM')}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="neumo-button p-2">
                    <ChevronRight size={20} />
                </button>
            </div>

            {isYearView ? (
                <YearView
                    year={currentDate.getFullYear()}
                    data={data}
                    onSelectMonth={(m) => { setCurrentDate(setMonth(setYear(new Date(), currentDate.getFullYear()), m)); setIsYearView(false); }}
                />
            ) : (
                <div ref={containerRef} className="relative overflow-hidden w-full">
                    {/* Swipe Container */}
                    <motion.div
                        style={{ x, width: '300%', display: 'flex' }}
                        drag="x"
                        dragConstraints={{ left: -containerWidth * 2, right: 0 }} // Constraints roughly
                        dragElastic={0.2} // Magnetic feel
                        onDragEnd={handleDragEnd}
                        className="touch-pan-y" // Allow vertical scroll, handle horizontal in JS
                    >
                        {/* Prev Month */}
                        <div className="w-1/3 flex-shrink-0 px-1">
                            {containerWidth > 0 && (
                                <CalendarMonthGrid
                                    monthDate={subMonths(currentDate, 1)}
                                    data={data}
                                    onUpdate={handleUpdateRecord}
                                    isPrivacy={isPrivacy}
                                    focusedDay={null} // Don't focus off-screen
                                    setFocusedDay={() => { }}
                                />
                            )}
                        </div>

                        {/* Current Month */}
                        <div className="w-1/3 flex-shrink-0 px-1">
                            <CalendarMonthGrid
                                monthDate={currentDate}
                                data={data}
                                onUpdate={handleUpdateRecord}
                                isPrivacy={isPrivacy}
                                focusedDay={focusedDay}
                                setFocusedDay={setFocusedDay}
                            />
                        </div>

                        {/* Next Month */}
                        <div className="w-1/3 flex-shrink-0 px-1">
                            {containerWidth > 0 && (
                                <CalendarMonthGrid
                                    monthDate={addMonths(currentDate, 1)}
                                    data={data}
                                    onUpdate={handleUpdateRecord}
                                    isPrivacy={isPrivacy}
                                    focusedDay={null}
                                    setFocusedDay={() => { }}
                                />
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

function YearView({ year, data, onSelectMonth }) {
    const yearMonths = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

    const getRecordForDate = (date) => {
        const dayStr = format(date, 'yyyy-MM-dd');
        return data.find(r => {
            if (!r.date) return false;
            try { return format(new Date(r.date), 'yyyy-MM-dd') === dayStr; } catch { return false; }
        });
    };

    return (
        <div className="grid grid-cols-4 gap-4 mt-4">
            {yearMonths.map((monthDate, mi) => {
                const mStart = startOfMonth(monthDate);
                const mEnd = endOfMonth(monthDate);
                const wStart = startOfWeek(mStart);
                const wEnd = endOfWeek(mEnd);
                const mDays = eachDayOfInterval({ start: wStart, end: wEnd });

                return (
                    <div
                        key={mi}
                        className="neumo-card p-3 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => onSelectMonth(mi)}
                    >
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center mb-2">
                            {format(monthDate, 'MMM')}
                        </div>
                        <div className="grid grid-cols-7 gap-[2px]">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                <div key={i} className="text-[6px] font-bold text-gray-300 text-center">{d}</div>
                            ))}
                            {mDays.map((day, di) => {
                                const inMonth = isSameMonth(day, mStart);
                                const record = inMonth ? getRecordForDate(day) : null;
                                const todayMatch = isToday(day);
                                let bg = 'bg-transparent';
                                if (record && record.isLeave) bg = 'bg-rose-400';
                                else if (record) bg = 'bg-green-400';
                                else if (isTaiwanHoliday(day) && inMonth) bg = 'bg-orange-200';

                                return (
                                    <div key={di} className={`text-[7px] text-center rounded-sm leading-4 ${inMonth ? 'text-gray-600' : 'text-gray-200'} ${bg} ${todayMatch && inMonth ? 'ring-1 ring-blue-500 font-black' : ''}`}>
                                        {format(day, 'd')}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default CalendarPage
