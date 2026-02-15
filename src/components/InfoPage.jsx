import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, Loader2, ChevronLeft, StickyNote, AlertCircle } from 'lucide-react'
import { fetchGistFiles } from '../lib/storage'
import { cn } from '../lib/utils'

function InfoPage() {
    const [files, setFiles] = useState([])
    const [selectedFile, setSelectedFile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isMobileListVisible, setIsMobileListVisible] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const allFiles = await fetchGistFiles()
            // Filter out system files
            const noteFiles = allFiles.filter(f =>
                !['records.json', 'settings.json', 'ot_records.json', 'ot_settings.json'].includes(f.filename)
            )
            setFiles(noteFiles)
            setLoading(false)
        }
        load()
    }, [])

    const handleFileSelect = (file) => {
        setSelectedFile(file)
        setIsMobileListVisible(false)
    }

    const handleBackToList = () => {
        setIsMobileListVisible(true)
        setSelectedFile(null)
    }

    return (
        <div className="h-[calc(100vh-140px)] flex relative overflow-hidden rounded-2xl neumo-pressed bg-gray-50/50 border border-white/20">
            {/* Sidebar (List) */}
            <motion.div
                className={cn(
                    "flex flex-col w-full md:w-1/3 min-w-[250px] bg-[#F5F5F7] border-r border-gray-200 z-10 absolute md:relative h-full transition-transform duration-300",
                    isMobileListVisible ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="p-4 border-b border-gray-200 bg-[#F5F5F7]/90 backdrop-blur-sm sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                        <StickyNote size={20} className="text-yellow-500" />
                        Notes
                    </h2>
                    <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-wider">
                        {files.length} Notes from Gist
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="animate-spin text-gray-400" />
                        </div>
                    ) : files.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-40 text-gray-400">
                            <AlertCircle size={24} className="mb-2" />
                            <span className="text-xs">No notes found</span>
                        </div>
                    ) : (
                        files.map((file, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleFileSelect(file)}
                                className={cn(
                                    "w-full text-left p-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                    selectedFile?.filename === file.filename
                                        ? "bg-[#FFE8A3] text-gray-800 shadow-sm"
                                        : "hover:bg-gray-200/50 text-gray-600"
                                )}
                            >
                                <h3 className={cn("text-xs font-bold truncate mb-0.5", selectedFile?.filename === file.filename ? "text-gray-900" : "text-gray-700")}>
                                    {file.filename.replace('.md', '')}
                                </h3>
                                <p className="text-[10px] text-gray-400 truncate opacity-80 group-hover:opacity-100">
                                    {file.content.slice(0, 50).replace(/[#*`]/g, '')}...
                                </p>
                            </button>
                        ))
                    )}
                </div>
            </motion.div>

            {/* Content Area */}
            <div className={cn(
                "flex-1 bg-white h-full overflow-hidden flex flex-col w-full absolute md:relative transition-transform duration-300",
                !isMobileListVisible ? "translate-x-0" : "translate-x-full md:translate-x-0"
            )}>
                {selectedFile ? (
                    <>
                        {/* Mobile Header for Content */}
                        <div className="md:hidden p-3 border-b border-gray-100 flex items-center gap-2 bg-white sticky top-0 z-10">
                            <button onClick={handleBackToList} className="p-1 -ml-1 text-neumo-brand flex items-center gap-1">
                                <ChevronLeft size={18} />
                                <span className="text-xs font-bold">Back</span>
                            </button>
                            <span className="text-xs font-black truncate flex-1 text-center pr-8">{selectedFile.filename}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8 prose prose-sm max-w-none prose-headings:font-black prose-a:text-blue-500">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {selectedFile.content}
                            </ReactMarkdown>
                        </div>
                        <div className="p-2 text-center border-t border-gray-50 bg-gray-50/30">
                            <span className="text-[9px] text-gray-300 font-mono">
                                Read-only from Gist
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-gray-300">
                        <StickyNote size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest opacity-50">Select a note to view</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default InfoPage
