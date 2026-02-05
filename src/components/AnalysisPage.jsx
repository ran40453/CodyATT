import React, { useState, useEffect } from 'react'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement,
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import { format, subMonths, eachMonthOfInterval, startOfYear, endOfYear, subYears, isAfter, differenceInCalendarMonths, differenceInCalendarDays, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'
import { loadData, fetchRecordsFromGist, loadSettings, calculateDailySalary, fetchExchangeRate } from '../lib/storage'
import { TrendingUp, Clock, CreditCard, Calendar, Globe, ArrowUpRight } from 'lucide-react'
import { cn } from '../lib/utils'

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
)

function AnalysisPage() {
    const [data, setData] = useState([])
    const [settings, setSettings] = useState(null)
    const [liveRate, setLiveRate] = useState(32.5)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const init = async () => {
            const s = loadSettings()
            setSettings(s)

            const rate = await fetchExchangeRate()
            setLiveRate(rate)

            const local = loadData()
            setData(local)

            const remote = await fetchRecordsFromGist()
            if (remote) setData(remote)
            setIsLoading(false)
        }
        init()
    }, [])

    if (!settings || isLoading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="h-8 w-8 border-4 border-neumo-brand border-t-transparent rounded-full animate-spin opacity-20" />
        </div>
    )

    const now = new Date()
    const lastYearDate = subYears(now, 1)

    // Metrics calculation logic
    const calcStats = () => {
        if (!data.length) return null

        const lastYearRecords = data.filter(r => isAfter(new Date(r.date), lastYearDate))
        const thisMonthRecords = data.filter(r => isSameMonth(new Date(r.date), now))

        const getDailyTotal = (r) => calculateDailySalary(r, { ...settings, allowance: { ...settings.allowance, exchangeRate: liveRate } })

        const lastYearSalary = lastYearRecords.reduce((sum, r) => sum + getDailyTotal(r), 0)
        const lastYearOTHours = lastYearRecords.reduce((sum, r) => sum + (parseFloat(r.otHours) || 0), 0)

        // Accurate OT pay for last year
        const lastYearOTPay = lastYearRecords.reduce((sum, r) => {
            const total = getDailyTotal(r)
            const baseMultiplier = r.isHoliday ? 2 : 1
            const baseDay = (settings.salary.baseMonthly / 30) * baseMultiplier
            // Allowance
            let allowance = 0
            if (r.travelCountry) allowance = (settings.allowance.tripDaily || 50) * liveRate
            return sum + Math.max(0, total - baseDay - allowance)
        }, 0)

        const lastMonthOTPay = thisMonthRecords.reduce((sum, r) => {
            const total = getDailyTotal(r)
            const baseMultiplier = r.isHoliday ? 2 : 1
            const baseDay = (settings.salary.baseMonthly / 30) * baseMultiplier
            let allowance = 0
            if (r.travelCountry) allowance = (settings.allowance.tripDaily || 50) * liveRate
            return sum + Math.max(0, total - baseDay - allowance)
        }, 0)

        // Lifetime stats
        const totalSalary = data.reduce((sum, r) => sum + getDailyTotal(r), 0)
        const totalOT = data.reduce((sum, r) => sum + (parseFloat(r.otHours) || 0), 0)

        const firstDay = new Date(Math.min(...data.map(r => new Date(r.date))))
        const monthsSpan = Math.max(1, differenceInCalendarMonths(now, firstDay) + 1)
        const yearsSpan = Math.max(1, monthsSpan / 12)
        const daysWithRecords = data.length

        return {
            avgAnnualSalary: totalSalary / yearsSpan,
            avgAnnualOT: totalOT / yearsSpan,
            avgMonthlySalary: totalSalary / monthsSpan,
            avgDailySalary: totalSalary / daysWithRecords,
            lastYearSalary,
            lastYearOTHours,
            lastYearOTPay,
            lastMonthOTPay
        }
    }

    const stats = calcStats()

    const currentYear = now.getFullYear()
    const chartMonths = eachMonthOfInterval({
        start: startOfYear(new Date(currentYear, 0, 1)),
        end: endOfYear(new Date(currentYear, 11, 31))
    })

    const otByMonth = chartMonths.map(m => {
        const monthStr = format(m, 'yyyy-MM')
        return data
            .filter(r => format(new Date(r.date), 'yyyy-MM') === monthStr)
            .reduce((sum, r) => sum + (parseFloat(r.otHours) || 0), 0)
    })

    const barData = {
        labels: chartMonths.map(m => format(m, 'MMM')),
        datasets: [
            {
                label: 'Monthly OT Hours',
                data: otByMonth,
                backgroundColor: 'rgba(99, 102, 241, 0.4)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 1,
                borderRadius: 8,
            },
        ],
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#E0E5EC',
                titleColor: '#202731',
                bodyColor: '#202731',
                borderColor: '#c3c9d1',
                borderWidth: 1,
            }
        },
        scales: {
            y: { beginAtZero: true, grid: { display: false } },
            x: { grid: { display: false } },
        },
    }

    const countryStats = () => {
        const counts = {}
        data.forEach(r => {
            if (r.travelCountry) {
                counts[r.travelCountry] = (counts[r.travelCountry] || 0) + 1
            }
        })
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
    }

    const topCountries = countryStats()

    return (
        <div className="space-y-8 pb-12">
            <header className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">Analysis</h1>
                    <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">Financial & Work Insights</p>
                </div>
                <div className="neumo-pressed px-4 py-2 rounded-2xl flex items-center gap-2 text-[10px] font-black text-green-600">
                    <Globe size={14} className="animate-pulse" />
                    USD Rate: {liveRate.toFixed(2)}
                </div>
            </header>

            {/* Metrics Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="平均年薪"
                    value={`$${Math.round(stats?.avgAnnualSalary || 0).toLocaleString()}`}
                    sub={`${Math.round(stats?.avgAnnualOT || 0)}h avg OT`}
                    icon={TrendingUp}
                    color="text-neumo-brand"
                />
                <StatCard
                    label="平均月薪"
                    value={`$${Math.round(stats?.avgMonthlySalary || 0).toLocaleString()}`}
                    sub={`$${Math.round(stats?.avgDailySalary || 0)} / day`}
                    icon={Calendar}
                    color="text-blue-500"
                />
                <StatCard
                    label="最近一年年薪"
                    value={`$${Math.round(stats?.lastYearSalary || 0).toLocaleString()}`}
                    sub={`${Math.round(stats?.lastYearOTHours || 0)}h OT total`}
                    icon={CreditCard}
                    color="text-purple-500"
                />
                <StatCard
                    label="年加班薪資"
                    value={`$${Math.round(stats?.lastYearOTPay || 0).toLocaleString()}`}
                    sub={`+$${Math.round(stats?.lastMonthOTPay || 0)} last month`}
                    icon={Clock}
                    color="text-orange-500"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 neumo-card h-[400px] flex flex-col pt-6">
                    <h3 className="px-6 font-black italic flex items-center gap-2 mb-8">
                        OT Hours Trend ({currentYear})
                        <ArrowUpRight size={16} className="text-neumo-brand" />
                    </h3>
                    <div className="flex-1 px-4 mb-4">
                        <Bar data={barData} options={chartOptions} />
                    </div>
                </div>

                <div className="neumo-card flex flex-col h-[400px] pt-6 gap-6">
                    <h3 className="px-6 font-black italic flex items-center gap-2">
                        Top Destinations
                        <Globe size={16} className="text-green-500" />
                    </h3>
                    <div className="flex-1 px-6 space-y-4 overflow-y-auto custom-scrollbar">
                        {topCountries.length > 0 ? topCountries.map((c, i) => (
                            <div key={c.name} className="flex flex-col gap-2">
                                <div className="flex items-center justify-between text-xs font-black">
                                    <span>{c.name}</span>
                                    <span className="text-neumo-brand">{c.count} 天</span>
                                </div>
                                <div className="h-2 neumo-pressed rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(c.count / (topCountries[0]?.count || 1)) * 100}%` }}
                                        className="h-full bg-neumo-brand/60"
                                    />
                                </div>
                            </div>
                        )) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center gap-2">
                                <Globe size={48} strokeWidth={1} />
                                <p className="text-[10px] font-black uppercase">No Travel Data</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, sub, icon: Icon, color }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="neumo-card p-5 space-y-3"
        >
            <div className={cn("p-2 rounded-xl neumo-pressed inline-flex", color)}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                <h4 className="text-lg font-black leading-none mb-1">{value}</h4>
                <p className="text-[10px] font-bold text-gray-500 italic">{sub}</p>
            </div>
        </motion.div>
    )
}

export default AnalysisPage
