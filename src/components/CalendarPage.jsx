import React, { useState, useEffect, useRef, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isSameDay, startOfWeek, endOfWeek, setMonth, setYear, isToday, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Grid3X3 } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { loadSettings, fetchExchangeRate } from '../lib/storage'
import { isTaiwanHoliday } from '../lib/holidays'
import CalendarMonthGrid, { CalendarOverlay } from './CalendarMonthGrid'
import InteractiveAttendanceBar from './InteractiveAttendanceBar'
import HeaderActions from './HeaderActions'

function CalendarPage({ data, onUpdate, onDelete, isPrivacy, setIsPrivacy, togglePrivacy, onSettingsClick }) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [focusedDay, setFocusedDay] = useState(null)
    const [isYearView, setIsYearView] = useState(false)
    const [settings, setSettings] = useState(null)
    const [liveRate, setLiveRate] = useState(null)
    const [modalTop, setModalTop] = useState('140px')
    const bannerRef = useRef(null)

    useEffect(() => {
        const init = async () => {
            const s = loadSettings();
            setSettings(s);
            try {
                const rate = await fetchExchangeRate().catch(() => 32.5);
                if (rate) setLiveRate(rate);
            } catch (err) {
                console.error('CalendarPage: Rate fetch error:', err);
            }
        };
        init();
    }, []);

    const parse = (d) => {
        if (!d) return new Date(0);
        if (d instanceof Date) return d;
        const parsed = parseISO(d);
        if (!isNaN(parsed.getTime())) return parsed;
        return new Date(d);
    }

    const dataMap = useMemo(() => {
        const map = new Map();
        data.forEach(r => {
            const d = parse(r.date);
            if (d instanceof Date && !isNaN(d)) {
                map.set(format(d, 'yyyy-MM-dd'), r);
            }
        });
        return map;
    }, [data]);

    const x = useMotionValue(0);
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        const updatePos = () => {
            if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
            if (bannerRef.current) {
                const rect = bannerRef.current.getBoundingClientRect();
                setModalTop(`${rect.bottom}px`);
            }
        };
        updatePos();
        window.addEventListener('resize', updatePos);
        return () => window.removeEventListener('resize', updatePos);
    }, []);

    useEffect(() => {
        if (containerWidth > 0) {
            x.set(-containerWidth);
        }
    }, [containerWidth, currentDate]);

    const handleDragEnd = (e, { offset, velocity }) => {
        const threshold = containerWidth * 0.25;
        const swipe = offset.x;
        let targetX = -containerWidth;
        let newDate = currentDate;

        if (swipe > threshold || velocity.x > 500) {
            targetX = 0;
            newDate = subMonths(currentDate, 1);
        } else if (swipe < -threshold || velocity.x < -500) {
            targetX = -containerWidth * 2;
            newDate = addMonths(currentDate, 1);
        }

        animate(x, targetX, {
            type: "spring",
            stiffness: 300,
            damping: 30,
            onComplete: () => {
                if (newDate !== currentDate) setCurrentDate(newDate);
            }
        });
    };

    const handleMonthChange = (e) => {
        setCurrentDate(setMonth(currentDate, parseInt(e.target.value)))
    }

    // handleSelectDate removed to decouple components

    const mask = (val) => isPrivacy ? '••••' : val;

    const currentMonthInterval = { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    const currentMonthDays = eachDayOfInterval(currentMonthInterval);

    const attendanceBoxes = currentMonthDays.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const record = dataMap.get(dayStr);
        let type = 'none';
        if (record) {
            type = record.isLeave ? 'leave' : 'attendance';
        } else {
            const isHoliday = isTaiwanHoliday(day);
            const isWeekday = day.getDay() >= 1 && day.getDay() <= 5;
            const isPastOrToday = day <= new Date() || isSameDay(day, new Date());
            if (!isHoliday && isWeekday && isPastOrToday) type = 'attendance';
        }
        return { day, type };
    });

    const attendedCount = attendanceBoxes.filter(b => b.type === 'attendance').length;
    const totalDaysCount = attendanceBoxes.length;
    const attendedPercent = totalDaysCount > 0 ? Math.round((attendedCount / totalDaysCount) * 100) : 0;

    const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);
    const months = Array.from({ length: 12 }, (_, i) => i);

    const prevMonth = subMonths(currentDate, 1);
    const nextMonth = addMonths(currentDate, 1);

    return (
        <div className="relative bg-[#E0E5EC] min-h-screen">
            <header className="flex justify-between items-end px-4 pt-4 mb-2">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-[#202731]">Calendar</h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">Monthly View</p>
                </div>

                <HeaderActions
                    isPrivacy={isPrivacy}
                    togglePrivacy={togglePrivacy || setIsPrivacy}
                    onSettingsClick={onSettingsClick}
                >
                    <button onClick={() => { setCurrentDate(new Date()); setIsYearView(false); }} className="neumo-button p-2 text-neumo-brand hover:bg-gray-100/50">
                        <Calendar size={18} />
                    </button>
                    <button onClick={() => setIsYearView(!isYearView)} className={`neumo-button p-2 hidden md:flex hover:bg-gray-100/50 ${isYearView ? 'text-neumo-brand' : 'text-gray-400'}`}>
                        <Grid3X3 size={18} />
                    </button>
                </HeaderActions>
            </header>

            {!isYearView && (
                <motion.div ref={bannerRef} className="mx-4 neumo-card p-1 bg-purple-500 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-purple-500 z-0" />
                    <div className="relative z-10 w-full flex flex-col justify-between p-2.5">
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-white/90 uppercase tracking-widest">本月出勤</span>
                                <span className="text-[10px] font-black text-white">{mask(format(currentDate, 'yyyy / MM'))}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-xl p-0.5 px-1.5 shadow-sm">
                                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:scale-110 text-white">
                                        <ChevronLeft size={16} strokeWidth={3} />
                                    </button>
                                    <select value={currentDate.getFullYear()} onChange={(e) => setCurrentDate(setYear(currentDate, parseInt(e.target.value)))} className="bg-transparent text-[11px] font-black text-white focus:outline-none appearance-none px-1">
                                        {years.map(y => <option key={y} value={y} className="text-gray-800">{y}</option>)}
                                    </select>
                                    <span className="text-white/40 text-[10px] font-bold">/</span>
                                    <select value={currentDate.getMonth()} onChange={handleMonthChange} className="bg-transparent text-[11px] font-black text-white focus:outline-none appearance-none px-1">
                                        {months.map(m => <option key={m} value={m} className="text-gray-800">{format(new Date(2024, m), 'MM')}</option>)}
                                    </select>
                                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:scale-110 text-white">
                                        <ChevronRight size={16} strokeWidth={3} />
                                    </button>
                                </div>
                                <span className="text-xl font-black text-white drop-shadow-md">
                                    {mask(String(attendedPercent))}<span className="text-xs align-top">%</span>
                                </span>
                            </div>
                        </div>
                        <div className="h-10 rounded-md bg-gray-100/90 p-1 flex items-center shadow-inner">
                            <InteractiveAttendanceBar attendanceBoxes={attendanceBoxes} today={new Date()} className="w-full h-1.5 gap-[2px]" />
                        </div>
                    </div>
                </motion.div>
            )}

            {isYearView ? (
                <YearView year={currentDate.getFullYear()} dataMap={dataMap} onSelectMonth={(m) => { setCurrentDate(setMonth(setYear(new Date(), currentDate.getFullYear()), m)); setIsYearView(false); }} />
            ) : (
                <div ref={containerRef} className="relative overflow-hidden w-full h-full">
                    <motion.div style={{ x, width: '300%', display: 'flex' }} drag="x" dragConstraints={{ left: -containerWidth * 2, right: 0 }} dragElastic={0.2} onDragEnd={handleDragEnd}>
                        <div style={{ width: containerWidth }} className="shrink-0 px-4">
                            <CalendarMonthGrid monthDate={prevMonth} dataMap={dataMap} settings={settings} onUpdate={onUpdate} onDelete={onUpdate} isPrivacy={isPrivacy} onDayClick={setFocusedDay} modalTop={modalTop} />
                        </div>
                        <div style={{ width: containerWidth }} className="shrink-0 px-4">
                            <CalendarMonthGrid monthDate={currentDate} dataMap={dataMap} settings={settings} onUpdate={onUpdate} onDelete={onUpdate} isPrivacy={isPrivacy} onDayClick={setFocusedDay} modalTop={modalTop} />
                        </div>
                        <div style={{ width: containerWidth }} className="shrink-0 px-4">
                            <CalendarMonthGrid monthDate={nextMonth} dataMap={dataMap} settings={settings} onUpdate={onUpdate} onDelete={onUpdate} isPrivacy={isPrivacy} onDayClick={setFocusedDay} modalTop={modalTop} />
                        </div>
                    </motion.div>
                </div>
            )}

            <AnimatePresence>
                {focusedDay && (
                    <CalendarOverlay
                        day={focusedDay}
                        record={dataMap.get(format(focusedDay, 'yyyy-MM-dd'))}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onClose={() => setFocusedDay(null)}
                        settings={settings}
                        modalTop={modalTop}
                        isPrivacy={isPrivacy}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

function YearView({ year, dataMap, onSelectMonth }) {
    const yearMonths = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
    const getRecord = (date) => dataMap.get(format(date, 'yyyy-MM-dd'));
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {yearMonths.map((m, mi) => (
                <div key={mi} className="neumo-card p-3 cursor-pointer" onClick={() => onSelectMonth(mi)}>
                    <div className="text-center font-black text-gray-500 uppercase text-[10px] mb-2">{format(m, 'MMM')}</div>
                    <div className="grid grid-cols-7 gap-1">
                        {eachDayOfInterval({ start: startOfWeek(startOfMonth(m)), end: endOfWeek(endOfMonth(m)) }).map((d, di) => {
                            const record = isSameMonth(d, m) ? getRecord(d) : null;
                            let bg = 'bg-transparent';
                            if (record) bg = record.isLeave ? 'bg-rose-400' : 'bg-green-400';
                            return <div key={di} className={`w-2 h-2 rounded-full ${bg}`} />
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}

export default CalendarPage
