import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, Loader2, ChevronLeft, StickyNote, AlertCircle, Save, Folder, FolderPlus, FilePlus, ChevronRight, Edit2, X, Plus } from 'lucide-react'
import { fetchGistFiles, updateGistFile, loadSettings, saveSettings, syncSettingsToGist } from '../lib/storage'
import { cn } from '../lib/utils'
import HeaderActions from './HeaderActions'

function InfoPage() {
    const [files, setFiles] = useState([])
    const [folders, setFolders] = useState({}) // { "FolderName": ["file1.md", "file2.md"] }
    const [selectedFile, setSelectedFile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isMobileListVisible, setIsMobileListVisible] = useState(true)

    // Editing State
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Folder Management State
    const [openFolders, setOpenFolders] = useState({}) // { "FolderName": true/false }
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const [draggedFile, setDraggedFile] = useState(null)

    // Uncategorized files are those not in any folder's list
    const getUncategorizedFiles = (allFiles, currentFolders) => {
        const categorized = new Set(Object.values(currentFolders).flat());
        return allFiles.filter(f => !categorized.has(f.filename));
    }

    const load = async () => {
        setLoading(true)
        const allFiles = await fetchGistFiles()
        // Filter out system files
        const noteFiles = allFiles.filter(f =>
            !['records.json', 'settings.json', 'ot_records.json', 'ot_settings.json'].includes(f.filename)
        )
        setFiles(noteFiles)

        // Load folders from settings
        const settings = loadSettings();
        const savedFolders = settings.infoPageFolders || {};
        setFolders(savedFolders);
        // Default open all folders
        const defaultOpen = Object.keys(savedFolders).reduce((acc, key) => ({ ...acc, [key]: true }), {});
        setOpenFolders(prev => ({ ...defaultOpen, ...prev })); // Keep existing states if any, else default open

        setLoading(false)
    }

    useEffect(() => {
        load()
    }, [])

    const handleFileSelect = (file) => {
        setSelectedFile(file)
        setEditContent(file.content)
        setIsEditing(false)
        setIsMobileListVisible(false)
    }

    const handleBackToList = () => {
        setIsMobileListVisible(true)
        setSelectedFile(null)
        setIsEditing(false)
    }

    const handleSave = async () => {
        if (!selectedFile) return;
        setIsSaving(true);
        const result = await updateGistFile(selectedFile.filename, editContent);
        if (result.ok) {
            // Update local state
            const updatedFile = { ...selectedFile, content: editContent };
            setFiles(prev => prev.map(f => f.filename === selectedFile.filename ? updatedFile : f));
            setSelectedFile(updatedFile);
            setIsEditing(false);
        } else {
            alert('Failed to save: ' + result.error);
        }
        setIsSaving(false);
    };

    const toggleFolder = (folderName) => {
        setOpenFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
    }

    const createFolder = () => {
        if (!newFolderName.trim()) return;
        const newFolders = { ...folders, [newFolderName.trim()]: [] };
        setFolders(newFolders);
        saveSettings({ ...loadSettings(), infoPageFolders: newFolders });
        syncSettingsToGist({ ...loadSettings(), infoPageFolders: newFolders }); // Async backup
        setNewFolderName('');
        setIsFolderModalOpen(false);
    }

    // Drag and Drop Logic (Simple implementation)
    const handleDragStart = (e, filename) => {
        e.dataTransfer.setData("text/plain", filename);
        setDraggedFile(filename);
    }

    const handleDrop = (e, folderName) => {
        e.preventDefault();
        const filename = e.dataTransfer.getData("text/plain");
        if (!filename) return;

        // Remove from old folder if exists
        const newFolders = { ...folders };
        Object.keys(newFolders).forEach(key => {
            newFolders[key] = newFolders[key].filter(f => f !== filename);
        });

        // Add to new folder (if not 'uncategorized')
        if (folderName !== 'uncategorized') {
            if (!newFolders[folderName]) newFolders[folderName] = [];
            newFolders[folderName].push(filename);
        }

        setFolders(newFolders);
        saveSettings({ ...loadSettings(), infoPageFolders: newFolders });
        syncSettingsToGist({ ...loadSettings(), infoPageFolders: newFolders });
        setDraggedFile(null);
    }

    const handleDragOver = (e) => {
        e.preventDefault();
    }

    const renderFileList = (fileList) => {
        if (!fileList || fileList.length === 0) return <div className="p-2 text-[10px] text-gray-400 italic">Empty</div>;
        return fileList.map(file => (
            <button
                key={file.filename}
                draggable
                onDragStart={(e) => handleDragStart(e, file.filename)}
                onClick={() => handleFileSelect(file)}
                className={cn(
                    "w-full text-left p-2 pl-3 rounded-lg transition-all duration-200 group relative overflow-hidden mb-1 flex items-center gap-2",
                    selectedFile?.filename === file.filename
                        ? "bg-[#FFE8A3] text-gray-900 shadow-sm"
                        : "hover:bg-gray-200/50 text-gray-600"
                )}
            >
                <FileText size={14} className={cn("shrink-0", selectedFile?.filename === file.filename ? "text-yellow-600" : "text-gray-400")} />
                <div className="min-w-0">
                    <h3 className={cn("text-xs font-bold truncate", selectedFile?.filename === file.filename ? "text-gray-900" : "text-gray-700")}>
                        {file.filename.replace('.md', '')}
                    </h3>
                </div>
            </button>
        ));
    };

    const uncategorized = getUncategorizedFiles(files, folders);

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col relative overflow-hidden rounded-2xl neumo-pressed bg-gray-900 border border-white/10 shadow-inner">

            {/* Dark Header */}
            <header className="flex justify-between items-center px-4 py-3 bg-gray-900 border-b border-gray-800 z-20">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gray-800 rounded-lg">
                        <StickyNote size={18} className="text-yellow-500" />
                    </div>
                    <h1 className="text-sm font-bold text-white tracking-wide">Info & Notes</h1>
                </div>
                <HeaderActions onSettingsClick={() => { /* Handled by parent or explicit logic? 
                    Actually App.jsx handles generic Settings click. 
                    If we want a specific settings for InfoPage, we might need a modal or dropdown here.
                    For now, reuse the global settings button logic from HeaderActions but we need to pass props if we want it to work.
                    Wait, HeaderActions usually takes props from App.jsx. 
                    Since this is inside the page, we don't have direct access unless passed.
                    Let's just use a simple Settings button here if needed, or rely on the Global Header if we were using it.
                    BUT, user requested "Please compare to other pages having top header bar".
                    Analysis/Dashboard have the big header title AND the HeaderActions.
                    Let's replicate that structure.
                 */}} >
                    {/* No children for now */}
                </HeaderActions>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar (List) */}
                <motion.div
                    className={cn(
                        "flex flex-col w-full md:w-1/3 min-w-[260px] max-w-sm bg-[#F5F5F7] border-r border-gray-800 z-10 absolute md:relative h-full transition-transform duration-300",
                        isMobileListVisible ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                    )}
                >
                    {/* Sidebar Header / Actions */}
                    <div className="p-3 border-b border-gray-200 bg-[#F5F5F7] flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            {files.length} ITEMS
                        </span>
                        <button
                            onClick={() => setIsFolderModalOpen(true)}
                            className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors" title="New Folder"
                        >
                            <FolderPlus size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-4">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <>
                                {/* Folders */}
                                {Object.keys(folders).map(folderName => (
                                    <div
                                        key={folderName}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, folderName)}
                                        className="space-y-1"
                                    >
                                        <button
                                            onClick={() => toggleFolder(folderName)}
                                            className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                                        >
                                            {openFolders[folderName] ? <ChevronRight size={12} className="rotate-90 transition-transform" /> : <ChevronRight size={12} className="transition-transform" />}
                                            <Folder size={14} className="text-blue-400" />
                                            {folderName}
                                        </button>

                                        <AnimatePresence>
                                            {openFolders[folderName] && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden ml-4 pl-2 border-l border-gray-200"
                                                >
                                                    {renderFileList(files.filter(f => folders[folderName].includes(f.filename)))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}

                                {/* Uncategorized */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, 'uncategorized')}
                                    className="pt-2"
                                >
                                    <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                        Uncategorized
                                    </div>
                                    {renderFileList(uncategorized)}
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Content Area */}
                <div className={cn(
                    "flex-1 bg-[#1e1e1e] h-full overflow-hidden flex flex-col w-full absolute md:relative transition-transform duration-300",
                    !isMobileListVisible ? "translate-x-0" : "translate-x-full md:translate-x-0"
                )}>
                    {selectedFile ? (
                        <>
                            {/* Mobile Header for Content */}
                            <div className="md:hidden p-3 border-b border-gray-700 flex items-center gap-2 bg-[#1e1e1e] text-white">
                                <button onClick={handleBackToList} className="p-1 -ml-1 text-yellow-500 flex items-center gap-1">
                                    <ChevronLeft size={18} />
                                    <span className="text-xs font-bold">List</span>
                                </button>
                                <span className="text-xs font-bold truncate flex-1 text-center pr-8">{selectedFile.filename}</span>
                                {isEditing ? (
                                    <button onClick={handleSave} disabled={isSaving} className="text-green-500">
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
                                    </button>
                                ) : (
                                    <button onClick={() => setIsEditing(true)} className="text-yellow-500">
                                        <Edit2 size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Desktop Toolbar (Floating / Top) */}
                            <div className="hidden md:flex justify-between items-center p-3 border-b border-gray-800 bg-[#1e1e1e] text-white">
                                <span className="text-sm font-bold text-gray-300">{selectedFile.filename}</span>
                                <div className="flex gap-2">
                                    {isEditing ? (
                                        <>
                                            <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 rounded-md text-xs font-bold text-gray-400 hover:bg-gray-800 transition-colors">Cancel</button>
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="px-3 py-1.5 rounded-md bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 text-xs font-bold flex items-center gap-2 transition-colors"
                                            >
                                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                Save
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-3 py-1.5 rounded-md text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                                        >
                                            <Edit2 size={14} /> Edit
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto relative">
                                {isEditing ? (
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full h-full p-6 bg-[#1e1e1e] text-gray-300 resize-none focus:outline-none font-mono text-sm leading-relaxed"
                                        spellCheck={false}
                                    />
                                ) : (
                                    <div className="p-6 md:p-8 prose prose-invert prose-sm max-w-none prose-headings:font-black prose-a:text-yellow-500 prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {selectedFile.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center items-center text-gray-600">
                            <StickyNote size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest opacity-50">Select a note to view</p>
                        </div>
                    )}
                </div>
            </div>

            {/* New Folder Modal */}
            <AnimatePresence>
                {isFolderModalOpen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white p-4 rounded-xl shadow-xl w-64 space-y-4"
                        >
                            <h3 className="text-sm font-black text-gray-800">New Folder</h3>
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Folder Name"
                                className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsFolderModalOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                                <button onClick={createFolder} className="px-3 py-1.5 rounded-lg bg-yellow-400 text-yellow-900 text-xs font-bold hover:bg-yellow-500">Create</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default InfoPage
