import React, { useState, useRef, useEffect } from 'react'
import { format, isToday } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { cn } from '../lib/utils'

function DayCard({ day, record, onUpdate }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [otHours, setOtHours] = useState(record?.otHours || 0)
    const [country, setCountry] = useState(record?.country || '')
    const [isDragging, setIsDragging] = useState(false)
    const dragStartY = useRef(0)
    const startHours = useRef(0)

    // Initialize from record when it changes
    useEffect(() => {
        if (record) {
            setOtHours(record.otHours || 0)
            setCountry(record.country || '')
        }
    }, [record])

    const handleDragStart = (e) => {
        setIsDragging(true)
        dragStartY.current = e.clientY || (e.touches && e.touches[0].clientY)
        startHours.current = otHours

        const handleMove = (moveEvent) => {
            const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY)
            const diff = dragStartY.current - currentY
            // 10 pixels = 15 mins (0.25 hours)
            const hourDiff = Math.round(diff / 20) * 0.25
            const newHours = Math.max(0, Math.min(24, startHours.current + hourDiff))
            setOtHours(newHours)
        }

        const handleEnd = () => {
            setIsDragging(false)
            window.removeEventListener('mousemove', handleMove)
            window.removeEventListener('mouseup', handleEnd)
            window.removeEventListener('touchmove', handleMove)
            window.removeEventListener('touchend', handleEnd)

            // Save update
            onUpdate({
                date: day,
                otHours: otHours,
                country: country
            })
        }

        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', handleEnd)
        window.addEventListener('touchmove', handleMove)
        window.addEventListener('touchend', handleEnd)
    }

    const handleCountryChange = (e) => {
        const newCountry = e.target.value
        setCountry(newCountry)
        onUpdate({
            date: day,
            otHours: otHours,
            country: newCountry
        })
    }

    return (
        <motion.div
            layout
            className={cn(
                "neumo-card transition-all duration-300",
                isToday(day) && "border-2 border-neumo-brand/30",
                isExpanded ? "col-span-1 md:col-span-2 row-span-2" : "col-span-1"
            )}
        >
            <div
                className="flex justify-between items-start cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-500 uppercase">{format(day, 'EEE')}</span>
                    <span className={cn("text-2xl font-black", isToday(day) ? "text-neumo-brand" : "text-[#202731]")}>
                        {format(day, 'dd')}
                    </span>
                </div>

                <div className="flex flex-col items-end space-y-1">
                    {otHours > 0 && (
                        <div className="flex items-center gap-1 bg-neumo-brand/10 px-2 py-0.5 rounded-full">
                            <Clock size={12} className="text-neumo-brand" />
                            <span className="text-xs font-bold text-neumo-brand">{otHours}h</span>
                        </div>
                    )}
                    {country && (
                        <div className="flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full">
                            <MapPin size={12} className="text-green-600" />
                            <span className="text-xs font-bold text-green-600">{country}</span>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 space-y-6 overflow-hidden"
                    >
                        {/* OT Hours Draggable */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">加班時數 (拖曳調整)</label>
                            <div
                                className={cn(
                                    "relative h-20 neumo-pressed rounded-2xl flex items-center justify-center cursor-ns-resize select-none",
                                    isDragging && "bg-neumo-brand/5"
                                )}
                                onMouseDown={handleDragStart}
                                onTouchStart={handleDragStart}
                            >
                                <div className="text-3xl font-black text-neumo-brand">
                                    {otHours.toFixed(2)}
                                    <span className="text-sm ml-1">hrs</span>
                                </div>
                                <div className="absolute right-4 text-gray-300">
                                    <div className="flex flex-col items-center">
                                        <ChevronUp size={16} />
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Country Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">出差國家</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={country}
                                    onChange={handleCountryChange}
                                    placeholder="輸入國家名稱..."
                                    className="neumo-input pl-10 h-10 text-sm font-bold"
                                />
                                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="neumo-button py-2 px-6 flex items-center gap-2 text-sm font-black text-neumo-brand"
                            >
                                <Check size={16} />
                                完成
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export default DayCard
