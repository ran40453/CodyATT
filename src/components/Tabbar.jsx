import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

function Tabbar({ tabs, activeTab, onChange }) {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md z-50">
            <div className="bg-[#E0E5EC] neumo-raised rounded-3xl p-2 flex justify-between items-center">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    const Icon = tab.icon

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            className={cn(
                                "relative flex flex-col items-center justify-center flex-1 py-3 transition-all duration-300",
                                isActive ? "text-neumo-brand" : "text-gray-500"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 neumo-pressed rounded-2xl"
                                    transition={{ type: "spring", duration: 0.5 }}
                                />
                            )}
                            <div className="relative z-10 flex flex-col items-center space-y-1">
                                <Icon size={20} className={cn(isActive && "animate-pulse")} />
                                <span className="text-[10px] font-bold">{tab.label}</span>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default Tabbar
