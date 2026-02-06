import React, { useState, useEffect } from 'react'
import { format, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth, subDays, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, subMonths } from 'date-fns'
import { TrendingUp, Clock, Calendar, Globe, ArrowUpRight, Coffee, Trophy, BarChart3, Gift, X, Edit2, Trash2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    BarController,
    LineController,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import { Bar, Line, Chart } from 'react-chartjs-2'
import { cn } from '../lib/utils'
import { loadData, fetchRecordsFromGist, loadSettings, calculateDailySalary, fetchExchangeRate, calculateCompLeaveUnits, calculateOTHours, standardizeCountry, saveData, syncRecordsToGist } from '../lib/storage'

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    BarController,
    LineController,
    Title,
    Tooltip,
    Legend,
    Filler
)

function AnalysisPage({ data, onUpdate, isPrivacy }) {
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [liveRate, setLiveRate] = useState(32.5);
    const [isSalaryDetailOpen, setIsSalaryDetailOpen] = useState(false);

    const mask = (val) => isPrivacy ? '••••' : val;

    useEffect(() => {
        const init = async () => {
            const s = loadSettings();
            setSettings(s);
            try {
                const rate = await fetchExchangeRate().catch(() => 32.5);
                if (rate) setLiveRate(rate);
            } catch (err) {
                console.error('Analysis: Fetch error:', err);
            }
            setIsLoading(false);
        };
        init();
    }, []);

    if (!settings || isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="h-10 w-10 border-[6px] border-neumo-brand border-t-transparent rounded-full animate-spin opacity-40" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Loading Insights...</p>
        </div>
    )

    const now = new Date()
    const rollingYearInterval = { start: subDays(now, 365), end: now }
    const currentMonthInterval = { start: startOfMonth(now), end: endOfMonth(now) }

    // Safety parse
    const parse = (d) => {
        if (!d) return new Date(0);
        if (d instanceof Date) return d;
        if (typeof d === 'string' && d.includes('T')) {
            const p = parseISO(d);
            if (!isNaN(p.getTime())) return p;
        }
        const p = new Date(d);
        if (!isNaN(p.getTime())) return p;
        return new Date(0);
    }
    const rollingYearRecords = data.filter(r => {
        const d = parse(r.date);
        return d instanceof Date && !isNaN(d) && isWithinInterval(d, rollingYearInterval);
    })
    const currentMonthRecords = data.filter(r => {
        const d = parse(r.date);
        return d instanceof Date && !isNaN(d) && isWithinInterval(d, currentMonthInterval);
    })

    const calcStats = () => {
        try {
            const getMetrics = (records) => {
                const extraTotal = records.reduce((sum, r) => {
                    const results = calculateDailySalary(r, { ...settings, liveRate });
                    const val = results?.extra || 0;
                    return sum + (isNaN(val) ? 0 : val);
                }, 0)
                const totalOT = records.reduce((sum, r) => {
                    let hours = parseFloat(r.otHours)
                    if ((!hours || hours === 0) && r.endTime && settings?.rules?.standardEndTime) {
                        hours = calculateOTHours(r.endTime, settings.rules.standardEndTime)
                    }
                    return sum + (isNaN(hours) ? 0 : hours)
                }, 0)
                const totalComp = records.reduce((sum, r) => sum + calculateCompLeaveUnits(r), 0)
                const totalBonus = records.reduce((sum, r) => sum + (parseFloat(r.bonus) || 0), 0)

                // Calculate components for detail modal
                const totalOTPay = records.reduce((sum, r) => {
                    const results = calculateDailySalary(r, { ...settings, liveRate });
                    return sum + (results?.otPay || 0);
                }, 0);
                const totalTravel = records.reduce((sum, r) => {
                    const results = calculateDailySalary(r, { ...settings, liveRate });
                    return sum + (results?.travelAllowance || 0);
                }, 0);

                return { extraTotal, totalOT, totalComp, totalBonus, totalOTPay, totalTravel }
            }

            const yearMetrics = getMetrics(rollingYearRecords)
            const monthMetrics = getMetrics(currentMonthRecords)

            // Calculate Base Salary Sum for Rolling Year
            let totalBaseInYear = 0;
            const monthsInYear = eachMonthOfInterval({ start: subDays(now, 365), end: now });
            monthsInYear.forEach(m => {
                let base = parseFloat(settings.salary?.baseMonthly) || 50000;
                if (settings.salaryHistory && Array.isArray(settings.salaryHistory)) {
                    const sortedHistory = [...settings.salaryHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
                    const monthEnd = endOfMonth(m);
                    const applicable = sortedHistory.find(h => new Date(h.date) <= monthEnd);
                    if (applicable) base = parseFloat(applicable.amount) || base;
                }
                totalBaseInYear += base;
            });

            const rollingAnnualSalary = totalBaseInYear + yearMetrics.extraTotal
            const rollingMonthlySalary = rollingAnnualSalary / 12

            // Month Salary Verification: Base + this month's extra
            const baseMonthly = parseFloat(settings.salary?.baseMonthly) || 50000;
            const monthTotalIncome = baseMonthly + monthMetrics.extraTotal;

            console.log('Analysis: Data Verification Audit', {
                baseMonthly,
                monthExtra: monthMetrics.extraTotal,
                monthTotal: monthTotalIncome,
                yearExtra: yearMetrics.extraTotal,
                yearTotal: rollingAnnualSalary
            });

            return {
                rollingAnnualSalary,
                rollingMonthlySalary,
                totalCompInYear: yearMetrics.totalComp,
                totalCompInMonth: monthMetrics.totalComp,
                totalBonusInYear: yearMetrics.totalBonus,
                totalBonusInMonth: monthMetrics.totalBonus,

                // Detailed Breakdown for Annual Salary Modal
                breakdown: {
                    base: totalBaseInYear,
                    ot: yearMetrics.totalOTPay,
                    travel: yearMetrics.totalTravel,
                    bonus: yearMetrics.totalBonus
                }
            }
        } catch (error) {
            console.error("AnalysisPage: calcStats Crashed", error);
            return {
                rollingAnnualSalary: 0,
                rollingMonthlySalary: 0,
                totalCompInYear: 0,
                totalCompInMonth: 0,
                totalBonusInYear: 0,
                totalBonusInMonth: 0,
                breakdown: { base: 0, ot: 0, travel: 0, bonus: 0 }
            };
        }
    }

    const stats = calcStats()
    const chartMonths = eachMonthOfInterval({
        start: startOfMonth(subMonths(now, 11)),
        end: endOfMonth(now)
    })

    const getMonthlyStat = (month, fn) => {
        const filtered = data.filter(r => {
            const d = parse(r.date);
            const match = d instanceof Date && !isNaN(d) && isSameMonth(d, month);
            return match;
        })
        const result = filtered.reduce((sum, r) => {
            const val = fn(r);
            return sum + (isNaN(val) ? 0 : val);
        }, 0)
        return result;
    }

    const otByMonth = chartMonths.map(m => getMonthlyStat(m, r => {
        let hours = parseFloat(r.otHours) || 0;
        if (hours === 0 && r.endTime) {
            hours = calculateOTHours(r.endTime, settings?.rules?.standardEndTime || "17:30");
        }
        return hours;
    }))

    const compByMonth = chartMonths.map(m => getMonthlyStat(m, r => {
        if (r.otType === 'leave') {
            let h = parseFloat(r.otHours) || 0;
            if (h === 0 && r.endTime) {
                h = calculateOTHours(r.endTime, settings?.rules?.standardEndTime || "17:30");
            }
            return Math.floor(h);
        }
        return 0;
    }))

    const bonusByMonth = chartMonths.map(m => getMonthlyStat(m, r => parseFloat(r.bonus) || 0))
    const otPayByMonth = chartMonths.map(m => getMonthlyStat(m, r => calculateDailySalary(r, { ...settings, liveRate }).otPay))
    const travelByMonth = chartMonths.map(m => getMonthlyStat(m, r => calculateDailySalary(r, { ...settings, liveRate }).travelAllowance))
    const baseByMonth = chartMonths.map(m => {
        let base = settings.salary?.baseMonthly || 50000;
        if (settings.salaryHistory && Array.isArray(settings.salaryHistory)) {
            const sortedHistory = [...settings.salaryHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
            const monthEnd = endOfMonth(m);
            const applicable = sortedHistory.find(h => new Date(h.date) <= monthEnd);
            if (applicable) base = parseFloat(applicable.amount) || base;
        }
        return base;
    })
    const totalIncomeByMonth = chartMonths.map((m, idx) => {
        return (bonusByMonth[idx] || 0) + (otPayByMonth[idx] || 0) + (travelByMonth[idx] || 0) + (baseByMonth[idx] || 0);
    })

    const incomeData = {
        labels: chartMonths.map(m => format(m, 'MMM')),
        datasets: [
            {
                label: '當月總收入',
                data: totalIncomeByMonth,
                borderColor: 'rgb(253, 224, 71)', // Yellow
                backgroundColor: 'rgba(253, 224, 71, 0.4)', // Semi-transparent fill
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: 'rgb(253, 224, 71)',
                borderWidth: 3,
            },
            {
                label: '底薪',
                data: baseByMonth,
                borderColor: 'rgb(56, 189, 248)', // Sky 400
                backgroundColor: 'rgba(56, 189, 248, 0.0)', // Transparent
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: 'rgb(56, 189, 248)',
            },
            {
                label: '出差費',
                data: travelByMonth,
                borderColor: 'rgb(16, 185, 129)', // Emerald 500
                backgroundColor: 'rgba(16, 185, 129, 0.0)', // Transparent
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: 'rgb(16, 185, 129)',
            },
            {
                label: '獎金',
                data: bonusByMonth,
                borderColor: 'rgb(245, 158, 11)', // Amber 500
                backgroundColor: 'rgba(245, 158, 11, 0.0)', // Transparent
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: 'rgb(245, 158, 11)',
            },
            {
                label: '加班費',
                data: otPayByMonth,
                borderColor: 'rgb(255, 69, 0)', // Orange Red
                backgroundColor: 'rgba(255, 69, 0, 0.0)', // Transparent
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: 'rgb(255, 69, 0)',
            }
        ]
    }

    const mergedData = {
        labels: chartMonths.map(m => format(m, 'MMM')),
        datasets: [
            {
                type: 'bar',
                label: '加班時數 (H)',
                data: otByMonth,
                backgroundColor: 'rgba(99, 102, 241, 0.4)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 1,
                borderRadius: 4,
                yAxisID: 'y',
            },
            {
                type: 'line',
                label: '補休單位',
                data: compByMonth,
                borderColor: 'rgb(79, 70, 229)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                yAxisID: 'y1',
            }
        ]
    }

    const currentMonthDays = eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) })
    const attendanceBoxes = currentMonthDays.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const record = data.find(r => {
            const d = parse(r.date);
            return d instanceof Date && !isNaN(d) && format(d, 'yyyy-MM-dd') === dayStr;
        })

        let type = 'none';
        if (record) {
            type = record.isLeave ? 'leave' : 'attendance';
        }
        return { day, type };
    })
    const attendanceBoxesLength = currentMonthDays.length || 1;
    const attendanceCount = attendanceBoxes.filter(b => b.type === 'attendance').length;
    const attendancePercent = Math.round((attendanceCount / attendanceBoxesLength) * 100) || 0;

    const incomeOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                usePointStyle: true,
                labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 9, weight: 'bold' } }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        return `${context.dataset.label}: ${mask('$' + Math.round(context.raw).toLocaleString())} `;
                    }
                }
            }
        },
        scales: {
            y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 9 } } },
            x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        },
    }

    const mergedOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: { boxWidth: 10, font: { size: 9, weight: 'bold' } }
            }
        },
        scales: {
            y: { position: 'left', grid: { display: false }, ticks: { font: { size: 9 } }, title: { display: true, text: '加班時數', font: { size: 8, weight: 'bold' } } },
            y1: { position: 'right', grid: { display: false }, ticks: { font: { size: 9 } }, title: { display: true, text: '補休單位', font: { size: 8, weight: 'bold' } } },
            x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        },
    }

    const countryStats = () => {
        const counts = {}
        data.forEach(r => {
            const country = standardizeCountry(r.travelCountry);
            if (country) {
                counts[country] = (counts[country] || 0) + 1
            }
        })
        return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    }

    return (
        <div className="space-y-8 pb-32">
            <header className="flex justify-between items-end">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight">Analysis</h1>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Efficiency Dashboard (Rolling 365D)</p>
                </div>

                <div className="neumo-pressed px-4 py-2 rounded-2xl flex items-center gap-2 text-[10px] font-black text-green-600">
                    <Globe size={14} className="animate-pulse" />
                    USD Rate: {liveRate.toFixed(2)}
                </div>
            </header>

            {/* 1. History Overview */}
            <div className="space-y-6">
                <h2 className="text-xl font-black italic flex items-center gap-2 px-2">
                    <Trophy className="text-amber-500" /> 歷史戰績總覽
                </h2>
                <div className="grid grid-cols-1 gap-4">
                    <HistoryCard label="出差總戰績" items={countryStats().slice(0, 3)} />
                </div>
            </div>

            {/* 2. Attendance Grid */}
            <div className="neumo-card flex flex-col p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-6">
                        <div className="relative w-14 h-14 flex items-center justify-center">
                            <svg className="w-14 h-14 transform -rotate-90">
                                <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-gray-100" />
                                <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={151} strokeDashoffset={151 - (151 * attendancePercent) / 100} className="text-neumo-brand transition-all duration-1000" />
                            </svg>
                            <span className="absolute text-[11px] font-black">{attendancePercent}%</span>
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="font-black italic flex items-center gap-2 text-sm text-[#202731] uppercase tracking-widest">
                                本月出勤紀錄 (Contribution Grid) <BarChart3 size={14} className="text-neumo-brand" />
                            </h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                {attendanceCount} / {currentMonthDays.length} Days Active
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-sm" /> 出勤</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-500 rounded-sm" /> 休假</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-100 rounded-sm" /> 無資料</span>
                    </div>
                </div>

                <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-6 px-1 custom-scrollbar justify-start">
                    {attendanceBoxes.map((box, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: idx * 0.01 }}
                                className={cn(
                                    "w-7 h-7 md:w-9 md:h-9 rounded-lg shadow-sm transition-all duration-300",
                                    box.type === 'attendance' ? "bg-green-500 shadow-green-200" :
                                        box.type === 'leave' ? "bg-rose-500 shadow-rose-200" :
                                            "bg-gray-100"
                                )}
                                title={`${format(box.day, 'yyyy-MM-dd')}: ${box.type} `}
                            />
                            <span className="text-[7px] font-black text-gray-400">{format(box.day, 'd')}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Charts */}
            <div className="space-y-6">
                {/* Monthly Income Structure */}
                <div className="neumo-card h-[400px] flex flex-col p-6">
                    <h3 className="font-black italic flex items-center gap-2 mb-6 text-sm text-[#202731] uppercase tracking-widest">
                        每月收入結構 (Monthly Income) <TrendingUp size={14} className="text-amber-500" />
                    </h3>
                    <div className="flex-1">
                        <Line data={incomeData} options={incomeOptions} />
                    </div>
                </div>

                {/* Overtime & Comp Leave */}
                <div className="neumo-card h-[350px] flex flex-col p-6">
                    <h3 className="font-black italic flex items-center gap-2 mb-6 text-sm text-gray-400 uppercase tracking-widest">
                        加班與補休趨勢 <ArrowUpRight size={14} />
                    </h3>
                    <div className="flex-1">
                        <Chart type="bar" data={mergedData} options={mergedOptions} />
                    </div>
                </div>
            </div>

            {/* 4. Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div onClick={() => setIsSalaryDetailOpen(true)} className="cursor-pointer">
                    <StatCard label="當年年薪 (Rolling 365)" value={mask(`$${Math.round(stats?.rollingAnnualSalary || 0).toLocaleString()} `)} sub="Estimated Cumulative" icon={TrendingUp} color="text-neumo-brand" />
                </div>
                <StatCard label="月平均薪資 (Rolling 365)" value={mask(`$${Math.round(stats?.rollingMonthlySalary || 0).toLocaleString()} `)} sub="Monthly Projection" icon={Calendar} color="text-blue-500" />
                <div onClick={() => setIsBonusDetailOpen(true)} className="cursor-pointer">
                    <StatCard
                        label="累計獎金"
                        value={mask(`$${Math.round(stats?.totalBonusInYear || 0).toLocaleString()} `)}
                        sub={`本月增: ${mask('$' + Math.round(stats?.totalBonusInMonth || 0).toLocaleString())} `}
                        icon={Gift}
                        color="text-amber-500"
                    />
                </div>
            </div>

            <BonusDetailModal
                isOpen={isBonusDetailOpen}
                onClose={() => setIsBonusDetailOpen(false)}
                data={data}
                onUpdate={(newData) => {
                    onUpdate(newData);
                    saveData(newData);
                    syncRecordsToGist(newData);
                }}
                isPrivacy={isPrivacy}
            />

            <SalaryDetailModal
                isOpen={isSalaryDetailOpen}
                onClose={() => setIsSalaryDetailOpen(false)}
                data={stats?.breakdown || {}}
                total={stats?.rollingAnnualSalary}
                mask={mask}
            />
        </div>
    )
}

function StatCard({ label, value, sub, unit, icon: Icon, color }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="neumo-card p-5 space-y-3">
            <div className={cn("p-2 rounded-xl neumo-pressed inline-flex", color)}><Icon size={18} /></div>
            <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                <h4 className="text-lg font-black leading-none mb-1">{value}<span className="text-xs ml-0.5">{unit || ''}</span></h4>
                <p className="text-[10px] font-bold text-gray-500 italic">{sub}</p>
            </div>
        </motion.div>
    )
}

function HistoryCard({ label, items }) {
    return (
        <div className="neumo-card p-6">
            <h3 className="font-black italic text-sm text-gray-400 uppercase tracking-widest mb-6">{label}</h3>
            <div className="space-y-4">
                {items.map(c => (
                    <div key={c.name} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-gray-500">{c.name}</span>
                            <span className="text-neumo-brand">{c.count} 天</span>
                        </div>
                        <div className="h-1.5 neumo-pressed rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(c.count / (items[0]?.count || 1)) * 100}% ` }} className="h-full bg-neumo-brand" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function SalaryDetailModal({ isOpen, onClose, data, total, mask }) {
    if (!isOpen) return null;

    const items = [
        { label: '底薪收入 (Base)', value: data.base, color: 'text-blue-500' },
        { label: '加班費 (Overtime)', value: data.ot, color: 'text-orange-500' },
        { label: '出差費 (Travel)', value: data.travel, color: 'text-green-500' },
        { label: '獎金 (Bonus)', value: data.bonus, color: 'text-amber-500' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
                className="absolute inset-0 bg-gray-500/20 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative w-full max-w-sm neumo-card p-6 flex flex-col gap-6"
            >
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black italic uppercase text-[#202731] flex items-center gap-2">
                        <TrendingUp size={20} strokeWidth={3} className="text-neumo-brand" />
                        年薪明細
                    </h3>
                    <button onClick={onClose} className="neumo-button p-2 text-gray-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm font-bold border-b border-gray-100 pb-2 last:border-0">
                            <span className="text-gray-500">{item.label}</span>
                            <span className={cn("font-black text-base", item.color)}>
                                {mask('$' + Math.round(item.value || 0).toLocaleString())}
                            </span>
                        </div>
                    ))}

                    <div className="pt-4 border-t-2 border-gray-100 flex justify-between items-end">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Estimated</span>
                        <span className="text-2xl font-black text-neumo-brand">
                            {mask('$' + Math.round(total || 0).toLocaleString())}
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

function BonusDetailModal({ isOpen, onClose, data, onUpdate, isPrivacy }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ amount: 0, category: '', name: '' });

    const mask = (val) => isPrivacy ? '••••' : val;

    if (!isOpen) return null;

    const bonusRecords = data
        .flatMap(r => {
            const dateStr = format(new Date(r.date), 'yyyy-MM-dd');
            if (Array.isArray(r.bonusEntries) && r.bonusEntries.length > 0) {
                return r.bonusEntries.map(be => ({ ...be, parentDate: dateStr }));
            }
            if (parseFloat(r.bonus) > 0) {
                return [{
                    id: `legacy - ${dateStr} `,
                    date: r.date,
                    amount: r.bonus,
                    category: r.bonusCategory || '獎金',
                    name: r.bonusName || '',
                    parentDate: dateStr
                }];
            }
            return [];
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const startEdit = (b) => {
        setEditingId(b.id);
        setEditForm({ amount: b.amount, category: b.category, name: b.name });
    };

    const handleSave = (parentDate, id) => {
        const newData = data.map(r => {
            const rDate = format(new Date(r.date), 'yyyy-MM-dd');
            if (rDate === parentDate) {
                const updatedEntries = r.bonusEntries.map(be =>
                    be.id === id ? { ...be, ...editForm, amount: parseFloat(editForm.amount) || 0 } : be
                );
                const newTotalBonus = updatedEntries.reduce((sum, be) => sum + be.amount, 0);
                return { ...r, bonusEntries: updatedEntries, bonus: newTotalBonus };
            }
            return r;
        });
        onUpdate(newData);
        setEditingId(null);
    };

    const handleDelete = (parentDate, id) => {
        if (!window.confirm('確定要刪除此筆獎金紀錄嗎？')) return;
        const newData = data.map(r => {
            const rDate = format(new Date(r.date), 'yyyy-MM-dd');
            if (rDate === parentDate) {
                const updatedEntries = r.bonusEntries.filter(be => be.id !== id);
                const newTotalBonus = updatedEntries.reduce((sum, be) => sum + be.amount, 0);
                return { ...r, bonusEntries: updatedEntries, bonus: newTotalBonus };
            }
            return r;
        });
        onUpdate(newData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
                className="absolute inset-0 bg-gray-500/20 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative w-full max-w-lg neumo-card p-6 max-h-[80vh] flex flex-col"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black italic uppercase text-amber-500 flex items-center gap-2">
                        <Gift size={20} strokeWidth={3} />
                        獎金明細
                    </h3>
                    <button onClick={onClose} className="neumo-button p-2 text-gray-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {bonusRecords.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 font-bold italic">尚無獎金紀錄</div>
                    ) : (
                        bonusRecords.map((b, idx) => (
                            <div key={idx} className="neumo-pressed p-4 rounded-2xl">
                                {editingId === b.id ? (
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                className="neumo-input h-10 px-3 text-xs font-black flex-1"
                                                value={editForm.category}
                                                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                                placeholder="類別"
                                            />
                                            <input
                                                type="number"
                                                className="neumo-input h-10 px-3 text-xs font-black w-24"
                                                value={editForm.amount}
                                                onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                                placeholder="金額"
                                            />
                                        </div>
                                        <input
                                            className="neumo-input h-10 px-3 text-xs font-bold w-full"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            placeholder="備註"
                                        />
                                        <div className="flex justify-end gap-2 pt-1">
                                            <button onClick={() => setEditingId(null)} className="neumo-button p-2 text-gray-400">
                                                <X size={16} />
                                            </button>
                                            <button onClick={() => handleSave(b.parentDate, b.id)} className="neumo-button p-2 text-green-500">
                                                <Check size={16} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-gray-400 bg-white/50 px-2 py-0.5 rounded shadow-sm">
                                                    {format(new Date(b.date), 'yyyy/MM/dd')}
                                                </span>
                                                <span className="text-[10px] font-black text-amber-600 border border-amber-200 px-2 py-0.5 rounded uppercase tracking-wider">
                                                    {b.category}
                                                </span>
                                            </div>
                                            <p className="text-xs font-black text-gray-600">{b.name || '無備註'}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-sm font-black text-gray-800">{mask('$' + Math.round(b.amount).toLocaleString())}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => startEdit(b)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(b.parentDate, b.id)} className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
}

export default AnalysisPage
