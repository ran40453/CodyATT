import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import SimpleMDE from 'react-simplemde-editor'
import 'easymde/dist/easymde.min.css'
import { FileText, Loader2, ChevronLeft, StickyNote, AlertCircle, Save, Folder, FolderPlus, FilePlus, ChevronRight, Edit2, X, Plus, Sun, Moon, Trash2, Copy, Heading1, Heading2, Heading3, Heading4, Heading5, Bold, Strikethrough, List, CheckSquare, Smile, Palette, SquarePen } from 'lucide-react'
import { fetchGistFiles, updateGistFile, loadSettings, saveSettings, syncSettingsToGist } from '../lib/storage'
import { cn } from '../lib/utils'
import HeaderActions from './HeaderActions'

function InfoPage() {
    const [files, setFiles] = useState([])
    const [folders, setFolders] = useState({}) // { "FolderName": ["file1.md", "file2.md"] }
    const [selectedFile, setSelectedFile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isMobileListVisible, setIsMobileListVisible] = useState(true)
    const [theme, setTheme] = useState('dark') // 'light' | 'dark'

    // Editing State
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Folder Management State
    const [openFolders, setOpenFolders] = useState({}) // { "FolderName": true/false }
    const [activeFolder, setActiveFolder] = useState(null) // currently selected folder for placing new files
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const [draggedFile, setDraggedFile] = useState(null)

    // Toolbar / Edit Metadata
    const [editFilename, setEditFilename] = useState('')
    const [isCopying, setIsCopying] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)

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

        // Load theme from settings (or local storage specific to info page if preferred, but settings is global sync)
        if (settings.infoPageTheme) {
            setTheme(settings.infoPageTheme);
        }

        // Default open all folders
        const defaultOpen = Object.keys(savedFolders).reduce((acc, key) => ({ ...acc, [key]: true }), {});
        setOpenFolders(prev => ({ ...defaultOpen, ...prev })); // Keep existing states if any, else default open

        setLoading(false)
    }

    useEffect(() => {
        load()
    }, [])

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        const settings = loadSettings();
        saveSettings({ ...settings, infoPageTheme: newTheme });
        // No auto-sync for theme change to avoid spamming revisons, or maybe debounce?
        // User requested persistence, let's sync it.
        syncSettingsToGist({ ...settings, infoPageTheme: newTheme });
    }

    const handleFileSelect = (file) => {
        setSelectedFile(file)
        setEditContent(file.content || '')
        setEditFilename(file.filename.replace('.md', '')) // prepare for rename
        setIsEditing(false)
        setIsMobileListVisible(false)
        setShowColorPicker(false)
        setShowEmojiPicker(false)
    }

    const handleBackToList = () => {
        setIsMobileListVisible(true)
        setSelectedFile(null)
        setIsEditing(false)
    }

    const handleSave = async () => {
        if (!selectedFile) return;
        setIsSaving(true);

        const newFilename = editFilename.trim() ? `${editFilename}.md` : selectedFile.filename;
        const isRenaming = newFilename !== selectedFile.filename;

        // SimpleMDE operates purely in Markdown, so editContent is already clean
        const result = await updateGistFile(newFilename, editContent, isRenaming ? selectedFile.filename : null);

        if (result.ok) {
            // Update local state
            const updatedFile = { ...selectedFile, filename: newFilename, content: editContent };
            let newFiles = prev => prev.map(f => f.filename === selectedFile.filename ? updatedFile : f);

            // If it's a completely new file just added to state (no Gist backup yet), it might not map correctly 
            // if we didn't push it yet. But our flow maps correctly because selectedFile has a placeholder.

            setFiles(prev => {
                const exists = prev.some(f => f.filename === selectedFile.filename);
                if (exists) return prev.map(f => f.filename === selectedFile.filename ? updatedFile : f);
                return [...prev, updatedFile];
            });

            // Re-map folder references if renamed
            if (isRenaming) {
                const newFolders = { ...folders };
                Object.keys(newFolders).forEach(k => {
                    const idx = newFolders[k].indexOf(selectedFile.filename);
                    if (idx !== -1) {
                        newFolders[k][idx] = newFilename;
                    }
                });
                setFolders(newFolders);
                saveSettings({ ...loadSettings(), infoPageFolders: newFolders });
                syncSettingsToGist({ ...loadSettings(), infoPageFolders: newFolders });
            }

            setSelectedFile(updatedFile);
            setIsEditing(false);
        } else {
            alert('Failed to save: ' + result.error);
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (!selectedFile) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedFile.filename}?`)) return;

        setIsDeleting(true);
        // Delete implies sending null for content in the GitHub API via updateGistFile
        const result = await updateGistFile(selectedFile.filename, null);

        if (result.ok) {
            // Remove from files array
            setFiles(prev => prev.filter(f => f.filename !== selectedFile.filename));

            // Remove from any folders
            const newFolders = { ...folders };
            Object.keys(newFolders).forEach(k => {
                newFolders[k] = newFolders[k].filter(f => f !== selectedFile.filename);
            });
            setFolders(newFolders);
            saveSettings({ ...loadSettings(), infoPageFolders: newFolders });
            syncSettingsToGist({ ...loadSettings(), infoPageFolders: newFolders });

            setSelectedFile(null);
            setIsMobileListVisible(true);
        } else {
            alert('Failed to delete: ' + result.error);
        }
        setIsDeleting(false);
    };

    const handleCopy = () => {
        if (!selectedFile) return;
        navigator.clipboard.writeText(selectedFile.content || editContent).then(() => {
            setIsCopying(true);
            setTimeout(() => setIsCopying(false), 2000);
        });
    };

    const handleCreateNewFile = () => {
        const dummyName = `Untitled_${Math.floor(Math.random() * 10000)}`;
        const newFile = { filename: `${dummyName}.md`, content: '' };

        // Optimistically add to local state
        setFiles(prev => [...prev, newFile]);
        setSelectedFile(newFile);
        setEditContent('');
        setEditFilename(dummyName);
        setIsEditing(true);
        setIsMobileListVisible(false);

        // If an active folder is selected, put it in there
        if (activeFolder) {
            const newFolders = { ...folders };
            if (!newFolders[activeFolder]) newFolders[activeFolder] = [];
            newFolders[activeFolder].push(`${dummyName}.md`);
            setFolders(newFolders);
        }
    };

    const toggleFolder = (folderName) => {
        setActiveFolder(folderName);
        setOpenFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
    }

    const createFolder = () => {
        if (!newFolderName.trim()) return;

        // Support nested / subfolders if activeFolder is set
        const finalFolderName = activeFolder ? `${activeFolder}/${newFolderName.trim()}` : newFolderName.trim();

        const newFolders = { ...folders, [finalFolderName]: [] };

        // ensure parent is open if it exists
        if (activeFolder) {
            setOpenFolders(prev => ({ ...prev, [activeFolder]: true, [finalFolderName]: true }));
        } else {
            setOpenFolders(prev => ({ ...prev, [finalFolderName]: true }));
        }

        setFolders(newFolders);
        saveSettings({ ...loadSettings(), infoPageFolders: newFolders });
        syncSettingsToGist({ ...loadSettings(), infoPageFolders: newFolders }); // Async backup
        setNewFolderName('');
        setIsFolderModalOpen(false);
    }

    // Drag and Drop Logic (Files and Folders)
    const handleDragStart = (e, name, type = 'file') => {
        e.dataTransfer.setData("application/json", JSON.stringify({ name, type }));
        setDraggedFile({ name, type });
    }

    const handleDrop = (e, targetFolderName) => {
        e.preventDefault();
        try {
            const dataStr = e.dataTransfer.getData("application/json");
            if (!dataStr) return;
            const { name, type } = JSON.parse(dataStr);

            if (type === 'file') {
                // Remove from old folder if exists
                const newFolders = { ...folders };
                Object.keys(newFolders).forEach(key => {
                    newFolders[key] = newFolders[key].filter(f => f !== name);
                });

                // Add to new folder
                if (targetFolderName !== 'uncategorized') {
                    if (!newFolders[targetFolderName]) newFolders[targetFolderName] = [];
                    newFolders[targetFolderName].push(name);
                }

                setFolders(newFolders);
                saveSettings({ ...loadSettings(), infoPageFolders: newFolders });
                syncSettingsToGist({ ...loadSettings(), infoPageFolders: newFolders });
            } else if (type === 'folder') {
                if (name === targetFolderName || targetFolderName.startsWith(name + '/')) return; // Prevent self-nesting

                const newFolders = { ...folders };
                const targetPrefix = targetFolderName === 'uncategorized' ? '' : targetFolderName + '/';
                const baseName = name.split('/').pop();
                const newPath = targetPrefix + baseName;

                const updatedFolders = {};
                Object.keys(newFolders).forEach(k => {
                    if (k === name || k.startsWith(name + '/')) {
                        const renamedKey = k.replace(name, newPath);
                        updatedFolders[renamedKey] = newFolders[k];
                    } else {
                        updatedFolders[k] = newFolders[k];
                    }
                });

                setFolders(updatedFolders);
                saveSettings({ ...loadSettings(), infoPageFolders: updatedFolders });
                syncSettingsToGist({ ...loadSettings(), infoPageFolders: updatedFolders });
            }
        } catch (err) {
            console.error("Drop error", err);
        }
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
                onDragStart={(e) => handleDragStart(e, file.filename, 'file')}
                onClick={() => handleFileSelect(file)}
                className={cn(
                    "w-full text-left p-2 pl-3 rounded-lg transition-all duration-200 group relative overflow-hidden mb-1 flex items-center gap-2",
                    selectedFile?.filename === file.filename
                        ? "bg-yellow-500/20 text-yellow-500 shadow-sm border border-yellow-500/30"
                        : (isDark ? "hover:bg-white/5 text-gray-400 hover:text-gray-200" : "hover:bg-black/5 text-gray-600 hover:text-gray-900")
                )}
            >
                <FileText size={14} className={cn("shrink-0 transition-colors", selectedFile?.filename === file.filename ? "text-yellow-500" : "text-gray-500")} />
                <div className="min-w-0">
                    <h3 className={cn("text-xs font-bold truncate transition-colors", selectedFile?.filename === file.filename ? (isDark ? "text-yellow-100" : "text-yellow-700") : (isDark ? "text-gray-400 group-hover:text-gray-200" : "text-gray-600 group-hover:text-gray-900"))}>
                        {file.filename.replace('.md', '')}
                    </h3>
                </div>
            </button>
        ));
    };

    const uncategorized = getUncategorizedFiles(files, folders);

    const isDark = theme === 'dark';

    return (
        <div className="space-y-4 relative w-full h-[calc(100vh-80px)] md:h-auto md:min-h-[85vh] flex flex-col">

            {/* Standard Neumorphic Header */}
            <header className="flex justify-between items-end px-1 mb-2">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-[#202731]">Info & Notes</h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">Documentation Library</p>
                </div>

                <HeaderActions onSettingsClick={() => { /* Handled by global App layout if needed */ }}>
                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className={cn(
                            "neumo-button p-2 transition-colors",
                            isDark ? "text-yellow-500" : "text-gray-400 hover:text-orange-500"
                        )}
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    {/* Settings/Sync Icon can also live here if needed, but App.jsx has a global one */}
                </HeaderActions>
            </header>

            {/* Main Content Area Container: Neumo card holding Sidebar + Content */}
            <div className={cn(
                "flex-1 flex overflow-hidden relative neumo-raised rounded-3xl z-20 transition-colors duration-300",
                isDark ? "bg-[#202731]" : "bg-[#E0E5EC]"
            )}>
                {/* Sidebar (List) */}
                <motion.div
                    className={cn(
                        "flex flex-col w-full md:w-1/3 min-w-[260px] max-w-sm border-r z-10 absolute md:relative h-full transition-all duration-300",
                        isMobileListVisible ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                        isDark ? "bg-[#1A202A] border-white/5" : "bg-[#D6DCE5] border-white/50"
                    )}
                >
                    {/* Sidebar Header / Actions */}
                    <div className={cn(
                        "p-3 border-b flex justify-between items-center transition-colors shadow-sm",
                        isDark ? "border-white/5 bg-[#171C24]" : "border-white/50 bg-[#D0D6DF]"
                    )}>
                        <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] font-black uppercase tracking-wider", isDark ? "text-gray-400" : "text-gray-500")}>
                                {files.length} ITEMS
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={handleCreateNewFile}
                                className={cn(
                                    "p-1.5 rounded-md transition-colors",
                                    isDark ? "hover:bg-gray-800 text-gray-400 hover:text-yellow-400" : "hover:bg-gray-200 text-gray-600 hover:text-blue-600"
                                )}
                                title="New Note"
                            >
                                <SquarePen size={16} />
                            </button>
                            <button
                                onClick={() => setIsFolderModalOpen(true)}
                                className={cn(
                                    "p-1.5 rounded-md transition-colors",
                                    isDark ? "hover:bg-gray-800 text-gray-400 hover:text-green-400" : "hover:bg-gray-200 text-gray-600 hover:text-green-600"
                                )}
                                title={`New Folder ${activeFolder ? `in ${activeFolder}` : ''}`}
                            >
                                <FolderPlus size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-4">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="animate-spin text-gray-500" />
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
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, folderName, 'folder')}
                                            onClick={() => toggleFolder(folderName)}
                                            className={cn(
                                                "flex items-center gap-1.5 w-full text-left px-2 py-1.5 rounded-md text-xs font-bold transition-colors cursor-grab active:cursor-grabbing",
                                                activeFolder === folderName ? (isDark ? "bg-white/10 text-white" : "bg-black/10 text-gray-900") : (isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-black/5")
                                            )}
                                        >
                                            {openFolders[folderName] ? <ChevronRight size={14} className="rotate-90 transition-transform" /> : <ChevronRight size={14} className="transition-transform" />}
                                            <Folder size={14} className={cn(
                                                activeFolder === folderName ? "text-yellow-500" : (isDark ? "text-blue-400" : "text-blue-500")
                                            )} />
                                            {/* indent subfolders visually based on name slashes */}
                                            <span style={{ paddingLeft: `${(folderName.split('/').length - 1) * 8}px` }}>
                                                {folderName.split('/').pop()}
                                            </span>
                                        </button>

                                        <AnimatePresence>
                                            {openFolders[folderName] && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className={cn("overflow-hidden ml-4 pl-2 border-l", isDark ? "border-white/10" : "border-gray-300")}
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
                                    <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
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
                    "flex-1 h-full overflow-hidden flex flex-col w-full absolute md:relative transition-all duration-300",
                    !isMobileListVisible ? "translate-x-0" : "translate-x-full md:translate-x-0",
                    isDark ? "bg-[#202731]" : "bg-[#E0E5EC]"
                )}>
                    {selectedFile ? (
                        <>
                            {/* Mobile Header for Content */}
                            <div className={cn(
                                "md:hidden p-3 border-b flex items-center gap-2 sticky top-0 z-10",
                                isDark ? "bg-[#1A202A] border-white/5 text-gray-200" : "bg-[#D6DCE5] border-white/50 text-gray-800"
                            )}>
                                <button onClick={handleBackToList} className="p-1 -ml-1 text-yellow-500 flex items-center gap-1">
                                    <ChevronLeft size={18} />
                                    <span className="text-xs font-bold">List</span>
                                </button>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editFilename}
                                        onChange={(e) => setEditFilename(e.target.value)}
                                        className={cn(
                                            "text-xs font-bold truncate flex-1 text-center bg-transparent border-none outline-none focus:ring-1 rounded px-1",
                                            isDark ? "focus:ring-yellow-500 text-yellow-100" : "focus:ring-yellow-500 text-yellow-700"
                                        )}
                                    />
                                ) : (
                                    <span className="text-xs font-bold truncate flex-1 text-center pr-2">{selectedFile.filename}</span>
                                )}
                                <div className="flex gap-2 items-center">
                                    <button onClick={handleCopy} className="text-gray-400 hover:text-blue-500" title="Copy Content">
                                        {isCopying ? <CheckSquare size={16} className="text-green-500" /> : <Copy size={16} />}
                                    </button>
                                    <button onClick={handleDelete} disabled={isDeleting} className="text-gray-400 hover:text-red-500" title="Delete Note">
                                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                    {isEditing ? (
                                        <button onClick={handleSave} disabled={isSaving} className="text-green-500" title="Save">
                                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
                                        </button>
                                    ) : (
                                        <button onClick={() => setIsEditing(true)} className="text-yellow-500" title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Desktop Toolbar (Floating / Top) */}
                            <div className={cn(
                                "hidden md:flex justify-between items-center p-3 border-b",
                                isDark ? "border-white/5 bg-[#171C24] text-gray-200" : "border-white/50 bg-[#D0D6DF] text-gray-800"
                            )}>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editFilename}
                                        onChange={(e) => setEditFilename(e.target.value)}
                                        className={cn(
                                            "text-sm font-bold bg-transparent border-b outline-none pb-0.5",
                                            isDark ? "border-gray-600 focus:border-yellow-500 text-yellow-100 placeholder-gray-600" : "border-gray-300 focus:border-yellow-500 text-yellow-700 placeholder-gray-400"
                                        )}
                                        placeholder="Note Title..."
                                    />
                                ) : (
                                    <span className={cn("text-sm font-bold", isDark ? "text-gray-300" : "text-gray-700")}>{selectedFile.filename}</span>
                                )}
                                <div className="flex gap-2 items-center">
                                    <button onClick={handleCopy} className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-black/5 transition-colors" title="Copy Content">
                                        {isCopying ? <CheckSquare size={16} className="text-green-500" /> : <Copy size={16} />}
                                    </button>
                                    <button onClick={handleDelete} disabled={isDeleting} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-black/5 transition-colors" title="Delete Note">
                                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                    <div className="w-px h-4 bg-gray-400/30 mx-1"></div>
                                    {isEditing ? (
                                        <>
                                            <button onClick={() => { setIsEditing(false); setEditContent(selectedFile.content || ''); }} className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-colors", isDark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100")}>Cancel</button>
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
                                            className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2", isDark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100")}
                                        >
                                            <Edit2 size={14} /> Edit
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col overflow-y-auto relative nice-scrollbar">
                                {isEditing ? (
                                    <div className={cn(
                                        "w-full h-full flex flex-col mde-wrapper",
                                        isDark
                                            ? "bg-[#202731] text-gray-300"
                                            : "bg-[#E0E5EC] text-gray-800"
                                    )}>
                                        <style dangerouslySetInnerHTML={{
                                            __html: `
                                            .mde-wrapper .editor-toolbar {
                                                border: none !important;
                                                border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)'} !important;
                                                background: ${isDark ? '#1f262f' : '#f1f5f9'} !important;
                                                opacity: 1 !important;
                                            }
                                            .mde-wrapper .editor-toolbar button {
                                                color: ${isDark ? '#9ca3af' : '#64748b'} !important;
                                            }
                                            .mde-wrapper .editor-toolbar button:hover, .mde-wrapper .editor-toolbar button.active {
                                                background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} !important;
                                                border-color: transparent !important;
                                            }
                                            .mde-wrapper .EasyMDEContainer .CodeMirror {
                                                border: none !important;
                                                background: transparent !important;
                                                color: inherit !important;
                                                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                                                padding: 1.5rem;
                                                min-height: 500px;
                                            }
                                        `}} />
                                        <SimpleMDE
                                            value={editContent}
                                            onChange={setEditContent}
                                            options={{
                                                spellChecker: false,
                                                status: false,
                                                autofocus: true,
                                            }}
                                            className="flex-1 flex flex-col h-full m-0 p-0"
                                        />
                                    </div>
                                ) : (
                                    <div className={cn(
                                        "p-6 md:p-8 prose prose-slate max-w-none prose-headings:font-black prose-a:text-yellow-500",
                                        isDark
                                            ? "prose-invert prose-p:text-gray-200 prose-headings:text-white prose-li:text-gray-200 prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700"
                                            : "prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 text-gray-800"
                                    )}>
                                        <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                                            {selectedFile.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center items-center text-gray-500">
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
                            className={cn(
                                "p-5 rounded-2xl shadow-2xl w-72 space-y-4 border neumo-raised",
                                isDark ? "bg-[#202731] border-white/10" : "bg-[#E0E5EC] border-white/50"
                            )}
                        >
                            <h3 className={cn("text-sm font-black uppercase tracking-wider", isDark ? "text-gray-300" : "text-gray-600")}>New Folder</h3>
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Folder Name"
                                className={cn(
                                    "w-full px-3 py-2 rounded-xl text-sm font-bold focus:outline-none neumo-pressed",
                                    isDark ? "bg-transparent text-gray-200 placeholder-gray-600" : "bg-transparent text-gray-800 placeholder-gray-400"
                                )}
                                autoFocus
                            />
                            <div className="flex justify-end gap-3 mt-2">
                                <button onClick={() => setIsFolderModalOpen(false)} className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-colors", isDark ? "text-gray-400 hover:bg-white/5" : "text-gray-500 hover:bg-black/5")}>Cancel</button>
                                <button onClick={createFolder} className="px-4 py-2 rounded-xl bg-yellow-400 text-yellow-900 text-xs font-black shadow-md hover:bg-yellow-500 transition-colors">Create</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default InfoPage
