import React, { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subDays } from 'date-fns'
import { TrendingUp, Globe, Wallet, Clock, Coffee, Moon, Gift, Eye, EyeOff, Briefcase, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { loadSettings, fetchExchangeRate, standardizeCountry, calculateDailySalary, calculateCompLeaveUnits, calculateOTHours } from '../lib/storage'
import { cn } from '../lib/utils'

// Register ChartJS components for Bar chart
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function Dashboard({ data, isPrivacy, setIsPrivacy }) {
    const [settings, setSettings] = useState(null)
    const [liveRate, setLiveRate] = useState(null)
    const today = new Date()

    useEffect(() => {
        const init = async () => {
            const s = loadSettings();
            setSettings(s);
            try {
                const rate = await fetchExchangeRate().catch(() => 32.5);
                if (rate) setLiveRate(rate);
            } catch (err) {
                console.error('Dashboard: Rate fetch error:', err);
            }
        };
        init();
    }, [])

    if (!settings) return null

    const mask = (val) => isPrivacy ? '••••' : val;

    // Filter for Current Month Only
    const currentMonthInterval = { start: startOfMonth(today), end: endOfMonth(today) }
    const rollingYearInterval = { start: subDays(today, 365), end: today }

    const parse = (d) => {
        if (!d) return new Date(0);
        if (d instanceof Date) return d;
        const parsed = parseISO(d);
        if (!isNaN(parsed.getTime())) return parsed;
        return new Date(d);
    }

    const currentMonthRecords = data.filter(r => {
        const d = parse(r.date);
        return d instanceof Date && !isNaN(d) && isWithinInterval(d, currentMonthInterval);
    })

    const rollingYearRecords = data.filter(r => {
        const d = parse(r.date);
        return d instanceof Date && !isNaN(d) && isWithinInterval(d, rollingYearInterval);
    })

    // Calculate Monthly Metrics
    const calcMetrics = (records) => {
        const totalOT = records.reduce((sum, r) => {
            let hours = parseFloat(r.otHours) || 0;
            if (hours === 0 && r.endTime) {
                hours = calculateOTHours(r.endTime, settings?.rules?.standardEndTime || "17:30");
            }
            return sum + (isNaN(hours) ? 0 : hours);
        }, 0)

        const totalComp = records.reduce((sum, r) => sum + calculateCompLeaveUnits(r), 0)
        const totalLeave = records.filter(r => r.isLeave).length // In days

        // Financials
        const baseMonthly = settings?.salary?.baseMonthly !== undefined ? Number(settings.salary.baseMonthly) : 50000;

        let otPay = 0;
        let travelAllowance = 0;
        let bonus = 0;
        let leaveDeduction = 0;

        records.forEach(r => {
            const metrics = calculateDailySalary(r, { ...settings, liveRate });
            otPay += metrics?.otPay || 0;
            travelAllowance += metrics?.travelAllowance || 0;
            bonus += (parseFloat(r.bonus) || 0);
            leaveDeduction += metrics?.leaveDeduction || 0;
        });

        const estimatedTotal = (baseMonthly + otPay + travelAllowance + bonus) - leaveDeduction;

        return {
            baseMonthly,
            otPay,
            travelAllowance,
            bonus,
            estimatedTotal,
            totalOT,
            totalComp,
            totalLeave
        }
    }

    const monthMetrics = calcMetrics(currentMonthRecords);
    const yearMetrics = calcMetrics(rollingYearRecords);

    // Bar Chart Data (Horizontal Stacked)
    const barData = {
        labels: ['Stats'],
        datasets: [
            {
                label: '底薪',
                data: [monthMetrics.baseMonthly],
                backgroundColor: 'rgba(56, 189, 248, 0.8)', // Sky 400
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 1,
                barThickness: 40,
            },
            {
                label: '加班',
                data: [monthMetrics.otPay],
                backgroundColor: 'rgba(255, 69, 0, 0.8)', // Orange Red
                borderColor: 'rgba(255, 69, 0, 1)',
                borderWidth: 1,
                barThickness: 40,
            },
            {
                label: '津貼',
                data: [monthMetrics.travelAllowance],
                backgroundColor: 'rgba(16, 185, 129, 0.8)', // Emerald 500
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1,
                barThickness: 40,
            },
            {
                label: '獎金',
                data: [monthMetrics.bonus],
                backgroundColor: 'rgba(245, 158, 11, 0.8)', // Amber 500
                borderColor: 'rgba(245, 158, 11, 1)',
                borderWidth: 1,
                barThickness: 40,
            },
        ],
    };

    const barOptions = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        return `${context.dataset.label}: ${mask('$' + Math.round(context.raw).toLocaleString())}`;
                    }
                }
            },
        },
        scales: {
            x: { stacked: true, display: false },
            y: { stacked: true, display: false }
        },
        layout: { padding: 0 }
    };

    // Plugins to draw text inside the chart
    const textPlugin = {
        id: 'textPlugin',
        afterDatasetsDraw(chart) {
            const { ctx, data } = chart;
            ctx.save();
            ctx.font = 'bold 10px sans-serif';
            ctx.fillStyle = '#1f2937'; // gray-800
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw labels below the bars
            // Actually, user asked to show amount inside the leftmost bar.
            // But usually bars are small.
            // "Show amount inside the leftmost bar"

            const meta0 = chart.getDatasetMeta(0);
            if (meta0.data.length > 0) {
                const bar0 = meta0.data[0];
                const value = data.datasets[0].data[0];
                if (value > 0) {
                    // Check if width is enough
                    const width = bar0.width;
                    if (width > 40) {
                        ctx.fillStyle = '#ffffff'; // White text on colored bar
                        ctx.fillText(mask('$' + Math.round(value).toLocaleString()), bar0.x - (width / 2), bar0.y);
                    }
                }
            }

            ctx.restore();
        }
    }

    return (
        <div className="space-y-8 pb-32">
            <header className="flex justify-between items-start">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                        Dashboard <span className="text-sm font-bold bg-neumo-brand/10 text-neumo-brand px-2 py-1 rounded-lg">{format(today, 'MMMM')}</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold tracking-widest uppercase italic">Real-time Monthly Overview</p>
                </div>
                <button
                    onClick={() => setIsPrivacy(!isPrivacy)}
                    className="neumo-button p-3 text-gray-400 hover:text-neumo-brand transition-colors"
                >
                    {isPrivacy ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Work Stats */}
                <div className="space-y-6">
                    {/* OT Stats */}
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="neumo-card p-6 flex flex-col items-center justify-center space-y-4 relative overflow-hidden"
                    >
                        <div className="absolute top-2 left-3 flex items-center gap-2">
                            <div className="p-2 rounded-xl neumo-pressed text-blue-500">
                                <Clock size={20} />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">加班統計</span>
                        </div>

                        <div className="flex flex-col items-center mt-4">
                            <span className="text-5xl font-black text-[#202731] tracking-tighter">
                                {yearMetrics.totalOT.toFixed(1)}
                            </span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                Year Total (Hours)
                            </span>
                        </div>
                        <div className="w-full h-px bg-gray-200/50 my-2" />
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                            <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs">This Month</span>
                            <span className="text-xl text-blue-600 font-black">{monthMetrics.totalOT.toFixed(1)}</span>
                            <span className="text-[10px] uppercase">Hours</span>
                        </div>
                    </motion.div>

                    {/* Comp Stats */}
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="neumo-card p-6 flex flex-col items-center justify-center space-y-4 relative overflow-hidden"
                    >
                        <div className="absolute top-2 left-3 flex items-center gap-2">
                            <div className="p-2 rounded-xl neumo-pressed text-indigo-500">
                                <Coffee size={20} />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">補休統計</span>
                        </div>

                        <div className="flex flex-col items-center mt-4">
                            <span className="text-5xl font-black text-[#202731] tracking-tighter">
                                {yearMetrics.totalComp}
                            </span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                Year Total (Units)
                            </span>
                        </div>
                        <div className="w-full h-px bg-gray-200/50 my-2" />
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                            <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-xs">This Month</span>
                            <span className="text-xl text-indigo-600 font-black">{monthMetrics.totalComp}</span>
                            <span className="text-[10px] uppercase">Units</span>
                        </div>
                    </motion.div>
                </div>

                {/* Right Column: Financials */}
                <div className="space-y-6">
                    {/* Combined Salary Distribution Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="neumo-card p-6 flex flex-col justify-between h-full group"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-2 text-gray-400">
                                <div className="p-2 rounded-xl neumo-pressed text-purple-500">
                                    <TrendingUp size={20} />
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-widest">本月薪資分布</h2>
                            </div>
                            <div className="p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Wallet size={60} />
                            </div>
                        </div>

                        {/* Big Number */}
                        <div className="flex flex-col mb-8">
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl lg:text-6xl font-black text-[#202731] tracking-tighter">
                                    {mask('$' + Math.round(monthMetrics.estimatedTotal).toLocaleString())}
                                </span>
                                <span className="text-sm font-bold text-gray-400">TWD</span>
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Estimated Total</span>
                        </div>

                        {/* Chart Section */}
                        <div className="space-y-4">
                            <div className="h-[60px] relative w-full">
                                <Bar data={barData} options={barOptions} plugins={[textPlugin]} />
                            </div>

                            {/* Detailed Legend */}
                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                                <LegendItem color="bg-sky-400" label="底薪" value={mask('$' + Math.round(monthMetrics.baseMonthly).toLocaleString())} />
                                <LegendItem color="bg-orange-500" label="加班" value={mask('$' + Math.round(monthMetrics.otPay).toLocaleString())} />
                                <LegendItem color="bg-emerald-500" label="津貼" value={mask('$' + Math.round(monthMetrics.travelAllowance).toLocaleString())} />
                                <LegendItem color="bg-amber-500" label="獎金" value={mask('$' + Math.round(monthMetrics.bonus).toLocaleString())} />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

function LegendItem({ color, label, value }) {
    return (
        <div className="min-w-[80px] p-2 rounded-xl neumo-pressed flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full", color.replace('bg-', 'bg-').replace('text-', 'bg-'))} />
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-xs font-black text-gray-600 pl-3.5">{value}</span>
        </div>
    )
}

export default Dashboard
