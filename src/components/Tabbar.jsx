import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { Plus } from 'lucide-react'

function Tabbar({ tabs, activeTab, onChange, onAddClick }) {
    const leftTabs = tabs.slice(0, 2)
    const rightTabs = tabs.slice(2)

    const TabButton = ({ tab }) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon

        return (
            <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                    "relative flex flex-col items-center justify-center flex-1 h-[52px] px-1 transition-all duration-300",
                    isActive ? "text-neumo-brand" : "text-gray-400"
                )}
            >
                <AnimatePresence>
                    {isActive && (
                        <motion.div
                            layoutId="activeTabGlass"
                            className="absolute z-0 w-[78px] h-[78px] glass-refraction rounded-full pointer-events-none"
                            initial={false}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                    )}
                </AnimatePresence>
                <div className="relative z-10 flex flex-col items-center space-y-0.5">
                    <Icon size={18} className={cn(isActive && "animate-pulse")} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
                </div>
            </button>
        )
    }

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-sm z-50">
            <div className="bg-[#E0E5EC]/90 backdrop-blur-sm neumo-raised rounded-full h-[52px] flex items-center px-2">
                <div className="flex flex-1 items-center justify-around">
                    {leftTabs.map(tab => <TabButton key={tab.id} tab={tab} />)}
                </div>

                <div className="relative -top-2 flex flex-shrink-0 items-center justify-center px-2 w-[78px]">
                    <button
                        onClick={onAddClick}
                        className="w-[78px] h-[78px] bg-neumo-brand rounded-full flex items-center justify-center text-white shadow-[inset_0_-4px_8px_rgba(0,0,0,0.2),0_12px_24px_rgba(99,102,241,0.5)] active:scale-95 transition-transform relative z-20"
                    >
                        <Plus size={32} strokeWidth={3} />
                    </button>
                    {/* Visual echo of glass for central button area to match active style */}
                    <div className="absolute inset-0 w-[78px] h-[78px] glass-refraction rounded-full pointer-events-none z-10 opacity-30 scale-110" />
                </div>

                <div className="flex flex-1 items-center justify-around">
                    {rightTabs.map(tab => <TabButton key={tab.id} tab={tab} />)}
                </div>
            </div>
        </div>
    )
}


export default Tabbar
