import React, { useState, useRef, useEffect, useMemo } from 'react'
import { format, getDay, isAfter } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, Check, Palmtree, Moon, DollarSign, Coffee, Trash2, MessageSquare, Calendar as CalendarIcon, FileText } from 'lucide-react'
import { cn } from '../lib/utils'
import { calculateOTHours, calculateDuration, calculateDailySalary, calculateCompLeaveUnits, standardizeCountry } from '../lib/storage'
import { isTaiwanHoliday, getHolidayName } from '../lib/holidays'
import { playTick } from '../lib/audio'

function DayCardExpanded({ day, record, onUpdate, onDelete, onClose, style, className, hideHeader = false, settings }) {
    const isWeekend = getDay(day) === 0 || getDay(day) === 6;
    const defaultTime = isWeekend ? '08:00' : '17:30';

    const [endTime, setEndTime] = useState(record?.endTime || defaultTime)
    const [travelCountry, setTravelCountry] = useState(record?.travelCountry || '')
    const [isHoliday, setIsHoliday] = useState(record?.isHoliday || false)
    const [isWorkDay, setIsWorkDay] = useState(record?.isWorkDay || false)
    const [isLeave, setIsLeave] = useState(record?.isLeave || false)
    const [otType, setOtType] = useState(record?.otType || 'pay')
    
    // Leave States
    const [leaveDuration, setLeaveDuration] = useState(record?.leaveDuration || 8);
    const [isFullDay, setIsFullDay] = useState(record?.leaveDuration === 8 || (record?.isLeave && !record?.leaveDuration) || false);
    const [leaveStartTime, setLeaveStartTime] = useState(record?.leaveStartTime || settings?.rules?.standardStartTime || "08:30");
    const [leaveEndTime, setLeaveEndTime] = useState(record?.leaveEndTime || record?.endTime || defaultTime);
    const [leaveType, setLeaveType] = useState(record?.leaveType || '特休');
    const [isLeaveTypePickerOpen, setIsLeaveTypePickerOpen] = useState(false);

    // Remarks
    const [remarks, setRemarks] = useState(record?.remarks || '');
    const [bonus, setBonus] = useState(record?.bonus || 0); 
    const [activeTab, setActiveTab] = useState('schedule'); 

    // Auto-calculate duration (Partial Day)
    useEffect(() => {
        if (isLeave && !isFullDay && settings) {
            const dur = calculateDuration(leaveStartTime, leaveEndTime, settings.rules?.lunchBreak || 1.5);
            if (dur !== leaveDuration) setLeaveDuration(dur);
        } else if (isLeave && isFullDay) {
            if (leaveDuration !== 8) setLeaveDuration(8);
        }
    }, [leaveStartTime, leaveEndTime, isFullDay, isLeave, settings]);

    const [isSaved, setIsSaved] = useState(false)

    const handleSave = (e) => {
        if (e) e.stopPropagation();

        if (isAfter(day, new Date())) {
            const confirmed = window.confirm("此日期尚未發生。確定要儲存嗎？");
            if (!confirmed) return;
        }

        syncUpdate();
        setIsSaved(true);
        setTimeout(() => {
            setIsSaved(false);
            if (onClose) onClose();
        }, 800);
    }

    useEffect(() => {
        if (record) {
            let rawTime = record.endTime || '17:30';
            if (rawTime.includes('T')) {
                try { rawTime = format(new Date(rawTime), 'HH:mm'); }
                catch (e) { rawTime = '17:30'; }
            }
            setEndTime(rawTime)
            const country = standardizeCountry(record.travelCountry);
            setTravelCountry(country)
            setIsHoliday(record.isHoliday || false)
            setIsWorkDay(record.isWorkDay || false)
            setIsLeave(record.isLeave || false)
            setOtType(record.otType || 'pay')
            setRemarks(record.remarks || '')
            setBonus(record.bonus || 0) 
        }
    }, [record?.date, record?.endTime, record?.travelCountry, record?.isHoliday, record?.isWorkDay, record?.isLeave, record?.otType, record?.remarks, record?.bonus])

    const handleDragStart = (e, type = 'endTime') => {
        if (e.cancelable) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
        const startY = e.clientY || (e.touches && e.touches[0].clientY)

        let initialTime = endTime;
        if (type === 'leaveStart') initialTime = leaveStartTime;
        if (type === 'leaveEnd') initialTime = leaveEndTime;

        const [h, m] = initialTime.split(':').map(Number)
        const startMins = h * 60 + m

        const handleMove = (moveEvent) => {
            if (moveEvent.stopPropagation) moveEvent.stopPropagation();
            const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY)
            const diff = startY - currentY
            // Sensitivity Divider: 50 (Higher = Less Sensitive)
            const minuteDiff = Math.round(diff / 50) * 15
            const totalMins = Math.max(0, Math.min(23 * 60 + 45, startMins + minuteDiff))
            const nh = Math.floor(totalMins / 60)
            const nm = totalMins % 60
            const nextTime = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`

            if (type === 'endTime') {
                if (nextTime !== endTime) {
                    const [prevH] = endTime.split(':');
                    const [currH] = nextTime.split(':');
                    if (prevH !== currH) playTick();
                    setEndTime(nextTime)
                }
            } else if (type === 'leaveStart') {
                if (nextTime !== leaveStartTime) {
                    const [prevH] = leaveStartTime.split(':');
                    const [currH] = nextTime.split(':');
                    if (prevH !== currH) playTick();
                    setLeaveStartTime(nextTime)
                }
            } else if (type === 'leaveEnd') {
                if (nextTime !== leaveEndTime) {
                    const [prevH] = leaveEndTime.split(':');
                    const [currH] = nextTime.split(':');
                    if (prevH !== currH) playTick();
                    setLeaveEndTime(nextTime)
                }
            }
        }

        const handleEnd = () => {
            window.removeEventListener('mousemove', handleMove)
            window.removeEventListener('mouseup', handleEnd)
            window.removeEventListener('touchmove', handleMove)
            window.removeEventListener('touchend', handleEnd)
        }

        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', handleEnd)
        window.addEventListener('touchmove', handleMove, { passive: false })
        window.addEventListener('touchend', handleEnd)
    }

    const handleDelete = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const confirmed = window.confirm('確定要清除此日所有資料嗎？');
        if (!confirmed) return;

        if (onDelete) {
            onDelete(day);
        } else {
            onUpdate({
                date: day,
                endTime: '17:30',
                otHours: 0,
                travelCountry: '',
                isHoliday: isTaiwanHoliday(day),
                isWorkDay: false,
                isLeave: false,
                otType: 'pay',
                leaveType: '特休',
                leaveDuration: 0,
                leaveStartTime: null,
                leaveEndTime: null,
                remarks: '',
                bonus: 0
            });
        }
        if (onClose) setTimeout(() => onClose(), 50);
    }

    const syncUpdate = (overrides = {}) => {
        const finalEndTime = overrides.endTime || endTime;
        let finalTravel = overrides.travelCountry !== undefined ? overrides.travelCountry : travelCountry;
        if (finalTravel === '越南' || finalTravel === 'VIETNAM') finalTravel = 'VN';

        const finalHoliday = overrides.isHoliday !== undefined ? overrides.isHoliday : isHoliday;
        const finalWorkDay = overrides.isWorkDay !== undefined ? overrides.isWorkDay : isWorkDay;
        const finalLeave = overrides.isLeave !== undefined ? overrides.isLeave : isLeave;
        const finalType = overrides.otType !== undefined ? overrides.otType : otType;

        const finalLeaveType = overrides.leaveType !== undefined ? overrides.leaveType : leaveType;
        const finalRemarks = overrides.remarks !== undefined ? overrides.remarks : remarks;
        const finalBonus = overrides.bonus !== undefined ? overrides.bonus : bonus;

        let otHours = 0;
        const d = getDay(day);
        const isRestDay = (d === 0 || d === 6 || finalHoliday) && !finalWorkDay;

        if (!finalLeave) {
            if (finalWorkDay) {
                const stdEnd = settings?.rules?.standardEndTime || "17:30";
                otHours = calculateOTHours(finalEndTime, stdEnd);
            } else if (isRestDay) {
                const start = settings?.rules?.standardStartTime || "08:00";
                const breakTime = settings?.rules?.lunchBreak || 1.5;
                otHours = calculateDuration(start, finalEndTime, breakTime);
            } else {
                const stdEnd = settings?.rules?.standardEndTime || "17:30";
                otHours = calculateOTHours(finalEndTime, stdEnd);
            }
        }

        onUpdate({
            date: day,
            endTime: finalEndTime,
            otHours: otHours,
            travelCountry: finalTravel,
            isHoliday: finalHoliday,
            isWorkDay: finalWorkDay,
            isLeave: finalLeave,
            otType: finalType,
            leaveType: finalLeaveType,
            leaveDuration: finalLeave ? (isFullDay ? 8 : leaveDuration) : 0,
            leaveStartTime: finalLeave && !isFullDay ? leaveStartTime : null,
            leaveEndTime: finalLeave && !isFullDay ? leaveEndTime : null,
            remarks: finalRemarks,
            bonus: finalBonus
        })
    }

    const toggleOtType = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const next = otType === 'pay' ? 'leave' : otType === 'leave' ? 'internal' : 'pay';
        setOtType(next);
        syncUpdate({ otType: next });
    };

    let otHours = 0;
    const d = getDay(day);
    const effectiveIsHoliday = isHoliday || isTaiwanHoliday(day);
    const isRestDay = (d === 0 || d === 6 || effectiveIsHoliday) && !isWorkDay;

    if (!isLeave) {
        if (isWorkDay) {
            const stdEnd = settings?.rules?.standardEndTime || "17:30";
            otHours = calculateOTHours(endTime, stdEnd);
        } else if (isRestDay) {
            const start = settings?.rules?.standardStartTime || "08:00";
            const breakTime = settings?.rules?.lunchBreak || 1.5;
            otHours = calculateDuration(start, endTime, breakTime);
        } else {
            const stdEnd = settings?.rules?.standardEndTime || "17:30";
            otHours = calculateOTHours(endTime, stdEnd);
        }
    }

    const compUnits = calculateCompLeaveUnits ? calculateCompLeaveUnits({ otType, otHours }) : 0;
    const tempRecord = {
        date: day,
        endTime: endTime,
        travelCountry: travelCountry,
        isHoliday: isHoliday,
        isWorkDay: isWorkDay,
        isLeave: isLeave,
        otType: otType,
        leaveType: leaveType,
        leaveDuration: isFullDay ? 8 : leaveDuration,
        leaveStartTime: leaveStartTime,
        leaveEndTime: leaveEndTime,
        bonus: bonus,
        otHours: otHours 
    };

    const salaryMetrics = useMemo(() => {
        if (!settings) return null;
        return calculateDailySalary(tempRecord, settings);
    }, [tempRecord, settings]);

    const dailySalary = useMemo(() => {
        let base = settings?.salary?.baseMonthly !== undefined ? Number(settings.salary.baseMonthly) : 50000;
        return base / (settings?.rules?.daysPerMonth || 30);
    }, [settings]);

    const iconVariants = useMemo(() => ({
        initial: { y: 0, opacity: 1, filter: 'blur(0px)' },
        hover: { y: -30, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.2 } }
    }), []);

    const textVariants = useMemo(() => ({
        initial: { y: 30, opacity: 0, filter: 'blur(4px)' },
        hover: { y: 0, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.2, delay: 0.05 } }
    }), []);

    return (
        <div style={style} className={cn("p-6 flex flex-col gap-4 relative z-50 bg-[#E0E5EC] h-full w-full", className)} onClick={e => e.stopPropagation()}>
            {!hideHeader && (
                <div className="flex justify-between items-start px-4">
                    <div className="flex flex-col">
                        <h3 className={cn("text-xl font-black", isHoliday ? "text-rose-500" : "text-neumo-brand")}>
                            {format(day, 'MMM dd')}
                        </h3>
                        {(isHoliday || isTaiwanHoliday(day)) && (
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{getHolidayName(day) || '國定假日'}</span>
                        )}
                    </div>
                    <button
                        onClick={handleDelete}
                        className="neumo-button p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            )}

            <div className="flex p-1 bg-gray-200/50 rounded-xl mb-2">
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5",
                        activeTab === 'schedule' ? "bg-[#E0E5EC] text-neumo-brand shadow-sm" : "text-gray-400 hover:text-gray-500"
                    )}
                >
                    <CalendarIcon size={12} /> Schedule
                </button>
                <button
                    onClick={() => setActiveTab('remarks')}
                    className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5",
                        activeTab === 'remarks' ? "bg-[#E0E5EC] text-indigo-500 shadow-sm" : "text-gray-400 hover:text-gray-500"
                    )}
                >
                    <FileText size={12} /> Remarks
                    {remarks && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-1" />}
                </button>
            </div>

            {activeTab === 'schedule' ? (
                <div className="flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-4 gap-2 px-4">
                        <ModeButton
                            onClick={() => {
                                setIsWorkDay(!isWorkDay);
                                if (!isWorkDay) setIsHoliday(false);
                            }}
                            active={isWorkDay}
                            activeClass="neumo-pressed text-blue-600"
                            inactiveClass="neumo-raised text-gray-400"
                            label="平日"
                            icon={<Check size={16} />}
                            iconVariants={iconVariants}
                            textVariants={textVariants}
                        />
                        <ModeButton
                            onClick={() => {
                                setIsHoliday(!isHoliday);
                                if (!isHoliday) setIsWorkDay(false);
                            }}
                            active={isHoliday}
                            activeClass="neumo-pressed text-orange-500"
                            inactiveClass="neumo-raised text-gray-400"
                            label="假日"
                            icon={<Palmtree size={16} />}
                            iconVariants={iconVariants}
                            textVariants={textVariants}
                        />
                        <ModeButton
                            onClick={() => setIsLeave(!isLeave)}
                            active={isLeave}
                            activeClass="neumo-pressed text-indigo-500"
                            inactiveClass="neumo-raised text-gray-400"
                            label="請假"
                            icon={<Moon size={16} />}
                            iconVariants={iconVariants}
                            textVariants={textVariants}
                        />
                        <ModeButton
                            onClick={() => { const seq = ['', 'VN', 'IN', 'CN']; setTravelCountry(seq[(seq.indexOf(travelCountry) + 1) % seq.length]); }}
                            active={!!travelCountry}
                            activeClass="neumo-pressed text-green-600"
                            inactiveClass="neumo-raised text-gray-400"
                            label={travelCountry || '出差'}
                            icon={<MapPin size={16} />}
                            iconVariants={iconVariants}
                            textVariants={textVariants}
                        />
                    </div>

                    {isLeave ? (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">假別</label>
                                <button
                                    onClick={() => setIsLeaveTypePickerOpen(!isLeaveTypePickerOpen)}
                                    className="w-full h-12 neumo-raised rounded-2xl flex items-center justify-between px-4 text-xs font-black text-gray-600 transition-all hover:scale-[0.99] active:scale-95"
                                >
                                    <span>{leaveType}</span>
                                    <div className={cn("transition-transform duration-200", isLeaveTypePickerOpen ? "rotate-180" : "rotate-0")}>
                                        <Check size={14} className="text-neumo-brand" />
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {isLeaveTypePickerOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            className="absolute left-0 right-0 bottom-full mb-2 z-[60] bg-[#E0E5EC]/95 backdrop-blur-md neumo-card p-2 grid grid-cols-3 gap-2 shadow-2xl"
                                        >
                                            {Object.keys(settings?.leaveRules || {}).filter(type => type !== '補休').map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => {
                                                        setLeaveType(type);
                                                        syncUpdate({ leaveType: type });
                                                        setIsLeaveTypePickerOpen(false);
                                                    }}
                                                    className={cn(
                                                        "py-3 px-1 text-[10px] font-black rounded-xl transition-all border border-transparent text-center truncate",
                                                        leaveType === type
                                                            ? "bg-rose-50 text-rose-600 border-rose-200 shadow-sm"
                                                            : "neumo-raised text-gray-400 hover:text-gray-600"
                                                    )}
                                                    title={type}
                                                >
                                                    {type === '陪產檢及陪產假' ? '陪產假' : type}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="flex items-center justify-between neumo-pressed p-3 rounded-2xl">
                                <span className="text-xs font-black text-gray-500">全天</span>
                                <button
                                    onClick={() => setIsFullDay(!isFullDay)}
                                    className={cn(
                                        "w-10 h-6 rounded-full relative transition-colors duration-300",
                                        isFullDay ? "bg-rose-500" : "bg-gray-200"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300",
                                        isFullDay ? "translate-x-4" : "translate-x-0"
                                    )} />
                                </button>
                            </div>

                            {!isFullDay && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">請假時間</label>
                                        <span className="text-[10px] font-black text-rose-500">{leaveDuration}H</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="neumo-pressed flex-1 h-12 flex flex-col items-center justify-center cursor-ns-resize rounded-xl touch-action-none"
                                            onMouseDown={(e) => handleDragStart(e, 'leaveStart')}
                                            onTouchStart={(e) => handleDragStart(e, 'leaveStart')}
                                            style={{ touchAction: 'none' }}
                                        >
                                            <span className="text-[10px] font-black text-gray-400 leading-none mb-1">開始</span>
                                            <span className="text-sm font-black text-gray-600">{leaveStartTime}</span>
                                        </div>
                                        <span className="text-gray-300 font-bold">-</span>
                                        <div
                                            className="neumo-pressed flex-1 h-12 flex flex-col items-center justify-center cursor-ns-resize rounded-xl touch-action-none"
                                            onMouseDown={(e) => handleDragStart(e, 'leaveEnd')}
                                            onTouchStart={(e) => handleDragStart(e, 'leaveEnd')}
                                            style={{ touchAction: 'none' }}
                                        >
                                            <span className="text-[10px] font-black text-gray-400 leading-none mb-1">結束</span>
                                            <span className="text-sm font-black text-gray-600">{leaveEndTime}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between px-2 pt-2 border-t border-gray-200/50">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">扣薪預估</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-rose-500 tabular-nums">
                                        -${Math.round(salaryMetrics?.leaveDeduction || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">TWD</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div
                                className="h-24 neumo-pressed rounded-3xl flex flex-col items-center justify-center relative cursor-ns-resize overflow-hidden shrink-0 touch-action-none"
                                style={{ touchAction: 'none' }}
                                onMouseDown={handleDragStart}
                                onTouchStart={handleDragStart}
                            >
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-[#202731]">{endTime}</span>
                                    <Clock size={14} className="text-gray-300" />
                                </div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">拖曳調整下班</p>
                            </div>

                            {otHours >= 0.5 ? (
                                <div className="flex items-center gap-4 bg-gray-100/50 p-3 rounded-2xl shadow-inner animate-in fade-in duration-300 w-full">
                                    <div className="flex-1 flex items-center gap-3 border-r border-gray-200/50 pr-3">
                                        <div className="shrink-0">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">加班 / 類型</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-neumo-brand leading-none">{otHours.toFixed(1)}</span>
                                                <span className="text-[8px] font-bold text-gray-400 uppercase">H</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleOtType}
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0",
                                                otType === 'pay' ? "bg-green-500 text-white shadow-lg" :
                                                    otType === 'leave' ? "bg-indigo-500 text-white shadow-lg" :
                                                        "bg-purple-600 text-white shadow-lg"
                                            )}
                                        >
                                            {otType === 'pay' ? <DollarSign size={14} /> : <Coffee size={14} />}
                                        </button>
                                    </div>

                                    <div className="flex-1">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 text-right md:text-left">
                                            預估 {otType === 'pay' ? '薪資' : otType === 'leave' ? '公司補休' : '部門補休'}
                                        </p>
                                        <div className="flex items-baseline gap-1 justify-end md:justify-start">
                                            <span className="text-2xl font-black tabular-nums leading-none text-green-600">
                                                {`\$${Math.round(salaryMetrics?.total || 0).toLocaleString()}`}
                                            </span>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">
                                                TWD
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="neumo-pressed p-4 rounded-2xl flex justify-center items-center gap-2 opacity-40 grayscale h-[60px] shrink-0">
                                    <Clock size={14} className="text-gray-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">時數不足 0.5H 不計入加班</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between px-2 pt-2 border-t border-gray-200/50">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">額外獎金</label>
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                    <span className="text-yellow-600 font-bold text-xs">$</span>
                                    <input
                                        type="number"
                                        value={bonus}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                            setBonus(val);
                                            syncUpdate({ bonus: val === '' ? 0 : val });
                                        }}
                                        placeholder="0"
                                        className="w-16 bg-transparent text-right text-sm font-black text-yellow-700 focus:outline-none placeholder:text-yellow-300"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col gap-2 min-h-[300px] animate-in fade-in slide-in-from-right-4 duration-200">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mt-2">備註事項 (Remarks)</label>
                    <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full flex-1 neumo-pressed rounded-2xl p-4 text-sm font-bold text-gray-700 focus:outline-none resize-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-300 leading-relaxed"
                        placeholder="在此輸入當日備註..."
                    />
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={isSaved}
                className={cn(
                    "w-full neumo-button h-12 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 mt-auto",
                    isSaved ? "text-green-600 neumo-pressed scale-[0.98]" : "text-neumo-brand"
                )}
            >
                {isSaved ? (
                    <>
                        <Check size={18} strokeWidth={4} className="animate-bounce" />
                        已儲存
                    </>
                ) : (
                    <>
                        <Check size={18} strokeWidth={3} />
                        確認變更
                    </>
                )}
            </button>
        </div>
    )
}

function ModeButton({ onClick, active, activeClass, inactiveClass, label, icon, iconVariants, textVariants }) {
    return (
        <motion.button
            onClick={onClick}
            whileHover="hover"
            initial="initial"
            className={cn("py-2 rounded-2xl flex flex-col items-center justify-center gap-1 text-[8px] font-bold uppercase transition-all overflow-hidden relative", active ? activeClass : inactiveClass)}
        >
            <motion.div variants={iconVariants} className="flex flex-col items-center justify-center">
                {icon}
            </motion.div>
            <motion.span variants={textVariants} className="absolute inset-0 flex items-center justify-center text-[10px] font-black pointer-events-none">
                {label}
            </motion.span>
        </motion.button>
    );
}

export default DayCardExpanded
