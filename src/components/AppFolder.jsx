import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Calendar, Home } from 'lucide-react';
import QuickCopyTool from './toolbox/QuickCopyTool';

const apps = [
    {
        id: 'codysch',
        name: 'CodySCH',
        url: 'https://codysch.vercel.app',
        color: 'bg-gray-800',
        icon: Calendar
    },
    {
        id: 'lifamily',
        name: 'LiFamily',
        url: 'https://lifamily.vercel.app',
        color: 'bg-green-500',
        icon: Home
    },
    {
        id: 'quickcopy',
        name: 'Copy',
        type: 'tool',
        color: 'bg-orange-500',
        icon: Briefcase
    }
];

const AppFolder = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isQuickCopyOpen, setIsQuickCopyOpen] = useState(false);

    const handleAppClick = (app, e) => {
        console.log(`[AppFolder] Clicked ${app.name} (${app.id}) -> ${app.url}`);
        if (app.type === 'tool' && app.id === 'quickcopy') {
            e.preventDefault();
            console.log('[AppFolder] Opening QuickCopy tool');
            setIsQuickCopyOpen(true);
            setIsOpen(false);
        }
    };

    return (
        <>
            <QuickCopyTool isOpen={isQuickCopyOpen} onClose={() => setIsQuickCopyOpen(false)} />

            {/* Folder Icon (Closed State) - Horizontal Scrollable Row */}
            <div
                onClick={() => setIsOpen(true)}
                className="w-full h-full bg-gray-100/50 rounded-2xl p-3 flex gap-4 overflow-x-auto cursor-pointer shadow-sm border border-gray-200 custom-scrollbar items-center"
            >
                {apps.map(app => {
                    const Icon = app.icon;
                    return (
                        <div key={app.id} className={`${app.color} w-16 h-16 shrink-0 aspect-square rounded-2xl flex items-center justify-center text-white shadow-md hover:scale-105 transition-transform`}>
                            <Icon size={28} className="drop-shadow-md" />
                        </div>
                    );
                })}
            </div>

            <p className="text-[10px] text-center mt-1 font-medium text-gray-500">Tools & Apps</p>

            {/* Expanded Folder Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => setIsOpen(false)}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] shadow-2xl w-[80vw] max-w-sm border border-white/40 relative"
                        >
                            <h3 className="text-center text-lg font-black text-gray-700 mb-6">Tools & Apps</h3>

                            <div className="grid grid-cols-3 gap-6">
                                {apps.map(app => {
                                    const Icon = app.icon;
                                    return (
                                        <a
                                            key={app.id}
                                            href={app.url}
                                            onClick={(e) => handleAppClick(app, e)}
                                            className="flex flex-col items-center gap-2 group cursor-pointer"
                                        >
                                            <div className={`${app.color} w-16 h-16 shrink-0 aspect-square rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                                <Icon size={28} className="text-white drop-shadow-md" />
                                            </div>
                                            <span className="text-xs font-bold text-gray-600 text-center leading-tight">{app.name}</span>
                                        </a>
                                    );
                                })}
                            </div>

                            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AppFolder;
