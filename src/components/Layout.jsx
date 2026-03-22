import React from 'react';
import { Menu, Settings, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { TooltipProvider } from './ui/tooltip';

const Layout = ({ children, title = "CodyATT", subtitle = "ATTENDANCE DASHBOARD", onSettingsClick, activeTab, onTabChange, onAddClick, tabs }) => {
    return (
        <TooltipProvider>
        <div className="min-h-screen bg-neumo-bg text-[#2D3748] font-sans selection:bg-neumo-brand/30 flex flex-col md:flex-row">

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-neumo-bg border-r border-white/20 shadow-neumo-floating h-screen sticky top-0 p-6 z-50">
                <div className="mb-10">
                    <h1 className="text-2xl font-black tracking-tighter text-[#2D3748] cursor-pointer hover:text-neumo-brand transition-colors">{title}</h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neumo-brand">{subtitle}</p>
                </div>

                <nav className="flex-1 space-y-4 relative">
                    {tabs && tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all relative z-10 ${isActive ? 'text-neumo-brand' : 'text-gray-400 hover:text-[#2D3748]'}`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeSidebarTab"
                                        className="absolute inset-0 bg-neumo-brand/10 shadow-inner rounded-xl -z-10"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <Icon size={20} />
                                <span className="font-bold uppercase tracking-wider text-xs">{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Sidebar Footer / Add Button */}
                <div className="pt-6 border-t border-white/10">
                    <Button
                        variant="primary"
                        onClick={onAddClick}
                        className="w-full py-3 rounded-xl font-black uppercase tracking-widest gap-2"
                    >
                        <Plus size={20} strokeWidth={3} />
                        <span>Add Record</span>
                    </Button>
                </div>
            </aside>

            <div className="flex-1 min-h-[100dvh] bg-neumo-bg relative flex flex-col">
                {/* Header - Mobile Only */}
                <header className="w-full flex justify-between items-center py-4 px-4 md:hidden">
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black tracking-tighter text-[#2D3748]">{title}</h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neumo-brand">{subtitle}</p>
                    </div>
                </header>

                {/* Main Content */}
                <main className="w-full px-1 md:px-6 pb-32 flex-1 flex flex-col max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
        </TooltipProvider>
    );
};

export default Layout;
