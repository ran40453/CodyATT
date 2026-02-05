import React, { useState, useRef, useEffect } from 'react'
import { format, isToday, getDay } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, ChevronDown, ChevronUp, Check, Flag, UserX, Palmtree, Moon } from 'lucide-react'
import { cn } from '../lib/utils'
import { loadSettings, calculateOTHours, calculateDailySalary } from '../lib/storage'

function DayCard({ day, record, onUpdate }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [endTime, setEndTime] = useState(record?.endTime || '18:00')
    const [country, setCountry] = useState(record?.country || '')
    const [isHoliday, setIsHoliday] = useState(record?.isHoliday || false)
    const [isLeave, setIsLeave] = useState(record?.isLeave || false)
    const [isDragging, setIsDragging] = useState(false)
    const [settings, setSettings] = useState(null)

    const dragStartY = useRef(0)
    const startMinutes = useRef(0)

    const isSunday = getDay(day) === 0;

    useEffect(() => {
        setSettings(loadSettings());
    }, []);

    // Initialize from record when it changes
    useEffect(() => {
        if (record) {
            setEndTime(record.endTime || '18:00')
            setCountry(record.country || '')
            setIsHoliday(record.isHoliday || false)
            setIsLeave(record.isLeave || false)
        }
    }, [record])

    const handleDragStart = (e) => {
        setIsDragging(true)
        dragStartY.current = e.clientY || (e.touches && e.touches[0].clientY)

        const [h, m] = endTime.split(':').map(Number)
        startMinutes.current = h * 60 + m

        const handleMove = (moveEvent) => {
            const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY)
            const diff = dragStartY.current - currentY
            // 5 pixels = 15 mins
            const minuteDiff = Math.round(diff / 5) * 15
            const totalMins = Math.max(0, Math.min(23 * 60 + 45, startMinutes.current + minuteDiff))

            const nh = Math.floor(totalMins / 60)
            const nm = totalMins % 60
            const newTime = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
            setEndTime(newTime)
        }

        const handleEnd = () => {
            setIsDragging(false)
            window.removeEventListener('mousemove', handleMove)
            window.removeEventListener('mouseup', handleEnd)
            window.removeEventListener('touchmove', handleMove)
            window.removeEventListener('touchend', handleEnd)

            const otHours = calculateOTHours(endTime, settings?.rules?.standardEndTime);
            onUpdate({
                date: day,
                endTime: endTime,
                otHours: otHours,
                country: country,
                isHoliday: isHoliday,
                isLeave: isLeave
            })
        }

        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', handleEnd)
        window.addEventListener('touchmove', handleMove)
        window.addEventListener('touchend', handleEnd)
    }

    const otHours = settings ? calculateOTHours(endTime, settings.rules.standardEndTime) : 0;
    const dailySalary = settings ? calculateDailySalary({ ...record, endTime, otHours, isHoliday, isLeave }, settings) : 0;

    const toggleStatus = (type) => {
        let update = {};
        if (type === 'holiday') {
            const val = !isHoliday;
            setIsHoliday(val);
            update = { isHoliday: val };
        } else if (type === 'leave') {
            const val = !isLeave;
            setIsLeave(val);
            update = { isLeave: val };
        }

        onUpdate({
            date: day,
            endTime,
            otHours,
            country,
            isHoliday,
            isLeave,
            ...update
        });
    };

    const getCountryCode = (name) => {
        const mapping = {
            '印度': 'IN',
            'India': 'IN',
            '越南': 'VN',
            'Vietnam': 'VN',
            '大陸': 'CN',
            '中國': 'CN',
            'China': 'CN'
        };
        return mapping[name] || name;
    };

    return (
        <motion.div
            layout
            className={cn(
                "neumo-card transition-all duration-500 overflow-hidden flex flex-col p-4",
                isToday(day) && "ring-2 ring-neumo-brand/30 ring-inset",
                isHoliday && "bg-orange-50/50",
                isLeave && "opacity-60",
                isSunday && "bg-gray-300",
                "flex-1 min-w-[85px]",
                isExpanded && "flex-[3] min-w-[180px]"
            )}
            style={{
                color: isSunday ? '#202731' : '#202731'
            }}
        >
            <div
                className="flex justify-between items-start cursor-pointer w-full"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn("text-[10px] font-black uppercase tracking-tighter", isSunday ? "text-gray-700" : "text-gray-400")}>
                            {format(day, 'EEE')}
                        </span>
                        {isHoliday && <Palmtree size={12} className="text-orange-500" />}
                        {isLeave && <Moon size={12} className="text-indigo-400" />}
                    </div>
                    <span className={cn("text-2xl font-black leading-none", isToday(day) ? "text-neumo-brand" : "")}>
                        {format(day, 'dd')}
                    </span>

                    {/* Collapsed Info */}
                    {!isExpanded && (
                        <div className="mt-2 space-y-1">
                            <span className="text-[11px] font-black text-gray-700 block">
                                ${Math.round(dailySalary).toLocaleString()}
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {otHours > 0 && (
                                    <span className="text-[8px] font-black bg-neumo-brand/10 text-neumo-brand px-1 rounded-sm">
                                        {otHours.toFixed(1)}h
                                    </span>
                                )}
                                {country && (
                                    <span className="text-[8px] font-black bg-green-500/10 text-green-600 px-1 rounded-sm">
                                        {getCountryCode(country)}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-gray-300">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-gray-100 space-y-6 overflow-hidden"
                    >
                        {/* Status Toggles */}
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleStatus('holiday'); }}
                                className={cn(
                                    "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1",
                                    isHoliday ? "neumo-pressed text-orange-500 bg-orange-50/50" : "neumo-raised text-gray-400"
                                )}
                            >
                                <Palmtree size={16} />
                                國定假日
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleStatus('leave'); }}
                                className={cn(
                                    "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1",
                                    isLeave ? "neumo-pressed text-indigo-500 bg-indigo-50/50" : "neumo-raised text-gray-400"
                                )}
                            >
                                <Moon size={16} />
                                請假
                            </button>
                        </div>

                        {!isLeave && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">下班時間</label>
                                    <span className="text-2xl font-black text-neumo-brand tabular-nums">{endTime}</span>
                                </div>
                                <div
                                    className="h-20 neumo-pressed rounded-2xl flex items-center justify-center relative cursor-ns-resize overflow-hidden touch-none"
                                    onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e); }}
                                    onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e); }}
                                >
                                    <div className="flex flex-col items-center opacity-30 select-none pointer-events-none">
                                        <ChevronUp size={16} />
                                        <div className="text-[10px] font-bold uppercase tracking-widest">滑動調整</div>
                                        <ChevronDown size={16} />
                                    </div>
                                    {isDragging && (
                                        <motion.div
                                            layoutId="dragging-overlay"
                                            className="absolute inset-0 bg-neumo-brand/5 pointer-events-none"
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-left block">出差地區</label>
                            <div className="relative">
                                <select
                                    value={country}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setCountry(val);
                                        onUpdate({ date: day, endTime, otHours, country: val, isHoliday, isLeave });
                                    }}
                                    className="neumo-input w-full h-11 px-4 text-xs font-bold bg-transparent appearance-none cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="">無出差 (None)</option>
                                    <option value="印度">印度 (IN)</option>
                                    <option value="越南">越南 (VN)</option>
                                    <option value="大陸">大陸 (CN)</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="p-3 neumo-raised rounded-2xl">
                                <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">加班時數</p>
                                <p className="text-base font-black text-[#202731]">{otHours.toFixed(1)}h</p>
                            </div>
                            <div className="p-3 neumo-raised rounded-2xl">
                                <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">今日薪資</p>
                                <p className="text-base font-black text-green-600">${Math.round(dailySalary).toLocaleString()}</p>
                            </div>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                            className="neumo-button w-full py-4 flex items-center justify-center gap-2 text-sm font-black text-neumo-brand"
                        >
                            <Check size={18} />
                            確認完成
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default DayCard;
