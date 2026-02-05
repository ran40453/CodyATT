import React, { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock } from 'lucide-react'
import { cn } from '../lib/utils'
import { loadData, addOrUpdateRecord } from '../lib/storage'
import DayCard from './DayCard'

function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [records, setRecords] = useState([])
    const [showAddForm, setShowAddForm] = useState(false)

    useEffect(() => {
        setRecords(loadData())
    }, [])

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    const getRecordForDay = (day) => {
        return records.find(r => isSameDay(new Date(r.date), day))
    }

    const handleUpdateRecord = (updatedRecord) => {
        const newData = addOrUpdateRecord(updatedRecord)
        setRecords(newData)
    }

    return (
        <div className="space-y-6">
            {/* Month Header */}
            <div className="flex justify-between items-center bg-[#E0E5EC] neumo-raised rounded-3xl p-4">
                <button
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="neumo-button p-2"
                >
                    <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl font-extrabold uppercase tracking-widest text-[#202731]">
                    {format(currentDate, 'yyyy / MM')}
                </h2>
                <button
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="neumo-button p-2"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Quick Add Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="neumo-card p-6"
            >
                <h3 className="text-sm font-black italic mb-4 flex items-center gap-2">
                    <Plus size={16} className="text-neumo-brand" /> 快速新增紀錄
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">日期</label>
                        <input
                            type="date"
                            className="neumo-input h-10 text-sm font-bold"
                            defaultValue={format(new Date(), 'yyyy-MM-dd')}
                            id="quick-date"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">出差國家 (選填)</label>
                        <input
                            type="text"
                            placeholder="e.g. 日本"
                            className="neumo-input h-10 text-sm font-bold"
                            id="quick-country"
                        />
                    </div>
                    <button
                        onClick={() => {
                            const date = document.getElementById('quick-date').value
                            const country = document.getElementById('quick-country').value
                            handleUpdateRecord({ date: new Date(date), otHours: 0, country })
                            document.getElementById('quick-country').value = ''
                        }}
                        className="neumo-button h-10 flex items-center justify-center gap-2 text-sm font-black text-neumo-brand"
                    >
                        <Plus size={16} /> 新增
                    </button>
                </div>
            </motion.div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {/* Weekday Labels (Desktop) */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="hidden md:block text-center text-xs font-bold text-gray-500 uppercase pb-2">
                        {day}
                    </div>
                ))}

                {days.map((day) => (
                    <DayCard
                        key={day.toString()}
                        day={day}
                        record={getRecordForDay(day)}
                        onUpdate={handleUpdateRecord}
                    />
                ))}
            </div>

            {/* Quick Add Floating Button/Form would go here if needed, but we'll use DayCard expand */}
        </div>
    )
}

export default CalendarPage
