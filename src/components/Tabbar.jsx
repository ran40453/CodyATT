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
                    "relative flex flex-col items-center justify-center flex-1 h-full px-1 transition-all duration-300",
                    isActive ? "text-neumo-brand" : "text-gray-400"
                )}
            >
                <AnimatePresence>
                    {isActive && (
                        <motion.div
                            layoutId="activeTabGlass"
                            className="absolute z-0 w-[64px] h-[64px] glass-refraction rounded-full pointer-events-none"
                            initial={false}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                    )}
                </AnimatePresence>
                <div className="relative z-10 flex flex-col items-center justify-center h-full">
                    <Icon size={isActive ? 20 : 22} className={cn("transition-all duration-300", isActive && "mb-0.5")} />
                    <AnimatePresence mode="wait">
                        {isActive && (
                            <motion.span
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap overflow-hidden"
                            >
                                {tab.label}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </button>
        )
    }

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-sm z-50">
            <div className="bg-[#E0E5EC]/80 backdrop-blur-xl neumo-raised rounded-full h-[60px] flex items-center px-3 gap-1">
                <div className="flex flex-1 items-center justify-around h-full">
                    {leftTabs.map(tab => <TabButton key={tab.id} tab={tab} />)}
                </div>

                <div className="relative flex flex-shrink-0 items-center justify-center w-[64px] h-[64px] z-50">
                    <button
                        onClick={onAddClick}
                        className="w-[60px] h-[60px] bg-neumo-brand rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(99,102,241,0.4)] active:scale-90 transition-all duration-300 relative z-50 group pointer-events-auto"
                    >
                        <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                    {/* Refractive background for the button too */}
                    <div className="absolute inset-0 w-[64px] h-[64px] glass-refraction rounded-full pointer-events-none z-10 scale-110 opacity-60" />
                </div>

                <div className="flex flex-1 items-center justify-around h-full">
                    {rightTabs.map(tab => <TabButton key={tab.id} tab={tab} />)}
                </div>
            </div>
        </div>
    )
}


export default Tabbar
