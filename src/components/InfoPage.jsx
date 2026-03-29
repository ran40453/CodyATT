import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { marked } from 'marked'
import { FileText, Loader2, ChevronLeft, StickyNote, AlertCircle, Save, Folder, FolderPlus, FilePlus, ChevronRight, Edit2, X, Plus, Sun, Moon, Trash2, Copy, SquarePen, RefreshCw, MoreVertical, CheckSquare } from 'lucide-react'
import SunEditor from 'suneditor-react'
import 'suneditor/dist/css/suneditor.min.css'
import { fetchGistFiles, updateGistFile, loadSettings, saveSettings, syncSettingsToGist } from '../lib/storage'
import { cn } from '../lib/utils'
import HeaderActions from './HeaderActions'

function InfoPage() {
    const [files, setFiles] = useState([])
    const [folders, setFolders] = useState({}) // { "FolderName": ["file1.md", "file2.md"] }
    const [selectedFile, setSelectedFile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isMobileListVisible, setIsMobileListVisible] = useState(true)
    const [theme, setTheme] = useState(() => {
        const settings = loadSettings();
        return settings.infoPageTheme || 'light';
    }) // Initialized from settings to prevent FOUC

    // Editing State
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const editorRef = useRef(null)

    // Folder Management State
    const [openFolders, setOpenFolders] = useState({}) // { "FolderName": true/false }
    const [activeFolder, setActiveFolder] = useState(null) // currently selected folder for placing new files
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
    const [draggedFile, setDraggedFile] = useState(null)
    const [dragOverFolder, setDragOverFolder] = useState(null)
    const [movingItem, setMovingItem] = useState(null) // { name, type, anchorEl } for "Move To" menu

    // Toolbar / Edit Metadata
    const [editFilename, setEditFilename] = useState('')
    const [isCopying, setIsCopying] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const [saveError, setSaveError] = useState(null)

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

        // Default open all folders if first load
        const defaultOpen = Object.keys(savedFolders).reduce((acc, key) => ({ ...acc, [key]: true }), {});
        setOpenFolders(prev => ({ ...defaultOpen, ...prev }));

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
        syncSettingsToGist({ ...settings, infoPageTheme: newTheme });
    }

    const handleFileSelect = (file) => {
        setSelectedFile(file)
        // Bug #12 修復：判斷內容是否已為 HTML（曾儲存過），避免 marked.parse 雙重處理
        const rawContent = file.content || '';
        const isAlreadyHtml = /^\s*<[a-zA-Z!]/.test(rawContent);
        const displayHtml = isAlreadyHtml ? rawContent : marked.parse(rawContent);
        setEditContent(displayHtml)
        setEditFilename(file.filename.replace('.md', ''))
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

        const newFilename = editFilename.trim() ? `${editFilename}.md` : selectedFile.filename;
        const isRenaming = newFilename !== selectedFile.filename;

        let finalContent = editContent;
        if (typeof finalContent === 'string') {
            finalContent = finalContent.replace(/[\u200B-\u200D\uFEFF]/g, '');
        }

        const result = await updateGistFile(newFilename, finalContent, isRenaming ? selectedFile.filename : null);

        if (result.ok) {
            const updatedFile = { ...selectedFile, filename: newFilename, content: finalContent };
            setFiles(prev => {
                const exists = prev.some(f => f.filename === selectedFile.filename);
                if (exists) return prev.map(f => f.filename === selectedFile.filename ? updatedFile : f);
                return [...prev, updatedFile];
            });

            if (isRenaming) {
                setFolders(prev => {
                    const newFolders = { ...prev };
                    Object.keys(newFolders).forEach(k => {
                        const idx = newFolders[k].indexOf(selectedFile.filename);
                        if (idx !== -1) {
                            newFolders[k][idx] = newFilename;
                        }
                    });
                    saveSettings({ ...loadSettings(), infoPageFolders: newFolders });
                    syncSettingsToGist({ ...loadSettings(), infoPageFolders: newFolders });
                    return newFolders;
                });
            }

            setSelectedFile(updatedFile);
            setIsEditing(false);
            setSaveError(null);
        } else {
            setSaveError('Failed to save: ' + result.error);
            setTimeout(() => setSaveError(null), 4000);
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (!selectedFile) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedFile.filename}?`)) return;

        setIsDeleting(true);
        const result = await updateGistFile(selectedFile.filename, null);

        if (result.ok) {
            setFiles(prev => prev.filter(f => f.filename !== selectedFile.filename));
            setFolders(prev => {
                const newFolders = { ...prev };
                Object.keys(newFolders).forEach(k => {
                    newFolders[k] = newFolders[k].filter(f => f !== selectedFile.filename);
                });
                saveSettings({ ...loadSettings(), infoPageFolders: newFolders });
                syncSettingsToGist({ ...loadSettings(), infoPageFolders: newFolders });
                return newFolders;
            });

            setSelectedFile(null);
            setIsMobileListVisible(true);
        } else {
            alert('Failed to delete: ' + result.error);
        }
        setIsDeleting(false);
    };

    const handleCopy = () => {
        if (!selectedFile) return;
        // Bug #13 修復：優先複製當前編輯中的內容（editContent），而非已儲存的舊版本
        const contentToCopy = editContent || selectedFile.content || '';
        navigator.clipboard.writeText(contentToCopy).then(() => {
            setIsCopying(true);
            setTimeout(() => setIsCopying(false), 2000);
        });
    };

    const handleCreateNewFile = async () => {
        const dummyName = `Untitled_${Math.floor(Math.random() * 10000)}`;
        const filename = `${dummyName}.md`;
        const newFile = { filename, content: '' };

        // Bug #16 修復：立即寫入 Gist，避免切換 tab 後檔案遺失
        await updateGistFile(filename, '# New Note\n');

        setFiles(prev => [...prev, newFile]);
        setSelectedFile(newFile);
        setEditContent('');
        setEditFilename(dummyName);
        setIsEditing(true);
        setIsMobileListVisible(false);

        if (activeFolder) {
            setFolders(prev => {
                const newFolders = { ...prev };
                if (!newFolders[activeFolder]) newFolders[activeFolder] = [];
                newFolders[activeFolder].push(filename);
                saveSettings({ ...loadSettings(), infoPageFolders: newFolders });
                syncSettingsToGist({ ...loadSettings(), infoPageFolders: newFolders });
                return newFolders;
            });
        }
    };

    const toggleFolder = (folderName) => {
        setActiveFolder(folderName);
        setOpenFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
    }

    const createFolder = () => {
        if (!newFolderName.trim()) return;
        const finalFolderName = activeFolder ? `${activeFolder}/${newFolderName.trim()}` : newFolderName.trim();
        const newFolders = { ...folders, [finalFolderName]: [] };

        if (activeFolder) {
            setOpenFolders(prev => ({ ...prev, [activeFolder]: true, [finalFolderName]: true }));
        } else {
            setOpenFolders(prev => ({ ...prev, [finalFolderName]: true }));
        }

        setFolders(newFolders);
        saveSettings({ ...loadSettings(), infoPageFolders: newFolders });
        syncSettingsToGist({ ...loadSettings(), infoPageFolders: newFolders });
        setNewFolderName('');
        setIsFolderModalOpen(false);
    }

    const deleteFolder = (folderNameToDelete) => {
        if (!window.confirm(`Are you sure you want to delete the folder "${folderNameToDelete}"?\nFiles inside will be moved to Uncategorized.`)) return;

        const newFolders = { ...folders };
        const foldersToRemove = [folderNameToDelete];
        Object.keys(newFolders).forEach(k => {
            if (k.startsWith(folderNameToDelete + '/')) {
                foldersToRemove.push(k);
            }
        });

        foldersToRemove.forEach(f => {
            delete newFolders[f];
        });

        setFolders(newFolders);
        saveSettings({ ...loadSettings(), infoPageFolders: newFolders });
        syncSettingsToGist({ ...loadSettings(), infoPageFolders: newFolders });

        if (activeFolder && foldersToRemove.includes(activeFolder)) {
            setActiveFolder(null);
        }
    }

    // Drag and Drop Logic
    const handleDragStart = (e, name, type = 'file') => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData("application/json", JSON.stringify({ name, type }));
        e.dataTransfer.setData("text/plain", `${name}::${type}`);
        setDraggedFile({ name, type });
    }

    const handleDragEnd = () => {
        setDraggedFile(null);
        setDragOverFolder(null);
    }

    const performMove = (name, type, targetFolderName) => {
        if (!name || (type !== 'folder' && type !== 'file')) return;

        if (type === 'file') {
            setFolders(prev => {
                const newFolders = { ...prev };
                Object.keys(newFolders).forEach(key => {
                    newFolders[key] = newFolders[key].filter(f => f !== name);
                });

                if (targetFolderName !== 'uncategorized') {
                    if (!newFolders[targetFolderName]) newFolders[targetFolderName] = [];
                    if (!newFolders[targetFolderName].includes(name)) {
                        newFolders[targetFolderName].push(name);
                    }
                }

                const s = loadSettings();
                const updatedSettings = { ...s, infoPageFolders: newFolders };
                saveSettings(updatedSettings);
                syncSettingsToGist(updatedSettings);

                // Auto-open target folder
                if (targetFolderName !== 'uncategorized') {
                    setOpenFolders(prev => ({ ...prev, [targetFolderName]: true }));
                }

                return newFolders;
            });
        } else if (type === 'folder') {
            if (name === targetFolderName || targetFolderName.startsWith(name + '/')) return;

            setFolders(currentFolders => {
                const baseName = name.split('/').pop();
                let newPath;
                if (targetFolderName === 'uncategorized') {
                    newPath = baseName;
                } else {
                    newPath = `${targetFolderName}/${baseName}`;
                }

                if (currentFolders[newPath] !== undefined && newPath !== name) {
                    // Avoid overwriting existing folder with same name
                    if (!window.confirm(`A folder named "${newPath}" already exists. Merge contents?`)) return currentFolders;
                }

                const nextFolders = {};
                // Handle the folder itself and its descendants
                Object.keys(currentFolders).forEach(oldKey => {
                    if (oldKey === name) {
                        nextFolders[newPath] = currentFolders[oldKey];
                    } else if (oldKey.startsWith(name + '/')) {
                        const relativePath = oldKey.substring(name.length);
                        nextFolders[newPath + relativePath] = currentFolders[oldKey];
                    } else {
                        nextFolders[oldKey] = currentFolders[oldKey];
                    }
                });

                // Ensure the target parent exists in the tree
                if (targetFolderName !== 'uncategorized' && !nextFolders[targetFolderName]) {
                    nextFolders[targetFolderName] = [];
                }

                // If it's a new path entirely (not just remapping)
                if (!nextFolders[newPath]) nextFolders[newPath] = [];

                // Pass the updated object directly to avoid race conditions with loadSettings()
                const s = loadSettings();
                const updatedSettings = { ...s, infoPageFolders: nextFolders };
                saveSettings(updatedSettings);
                syncSettingsToGist(updatedSettings);

                // Auto-open target folder
                if (targetFolderName !== 'uncategorized') {
                    setOpenFolders(prev => ({ ...prev, [targetFolderName]: true, [newPath]: true }));
                }

                return nextFolders;
            });
        }
    }

    const handleDrop = (e, targetFolderName) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolder(null);

        try {
            let name, type;
            if (draggedFile) {
                name = draggedFile.name;
                type = draggedFile.type;
            } else {
                const dataStr = e.dataTransfer.getData("application/json");
                const fallbackStr = e.dataTransfer.getData("text/plain");
                if (dataStr) {
                    const parsed = JSON.parse(dataStr);
                    name = parsed.name;
                    type = parsed.type;
                } else if (fallbackStr && fallbackStr.includes('::')) {
                    const parts = fallbackStr.split('::');
                    name = parts[0];
                    type = parts[1];
                }
            }

            if (name) performMove(name, type, targetFolderName);
        } catch (err) {
            console.error("Drop error", err);
        }
        setDraggedFile(null);
        setDragOverFolder(null);
    }

    const handleDragOver = (e, folderName) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (draggedFile && draggedFile.name !== folderName) {
            setDragOverFolder(folderName);
        }
    }

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolder(null);
    }

    const renderFileList = (fileList, folderPath = 'uncategorized') => {
        if (!fileList || fileList.length === 0) return <div className="p-2 text-[10px] text-gray-400 italic">Empty</div>;
        return fileList.map(file => (
            <div
                key={file.filename}
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => handleDragStart(e, file.filename, 'file')}
                onDragEnd={handleDragEnd}
                onClick={() => handleFileSelect(file)}
                onKeyDown={(e) => e.key === 'Enter' && handleFileSelect(file)}
                className={cn(
                    "w-full text-left p-2.5 pl-3 rounded-xl transition-all duration-200 group mb-1 flex items-center gap-2 cursor-pointer select-none",
                    selectedFile?.filename === file.filename
                        ? "bg-white/25 border border-white/40 shadow-sm"
                        : "border border-transparent hover:bg-white/10 hover:border-white/20"
                )}
            >
                <FileText size={14} className={cn("shrink-0 transition-colors", selectedFile?.filename === file.filename ? "text-white" : "text-white/60")} />
                <div className="min-w-0 flex-1">
                    <h3 className={cn("text-xs font-bold truncate transition-colors", selectedFile?.filename === file.filename ? "text-white" : "text-white/75 group-hover:text-white")}>
                        {file.filename.replace('.md', '')}
                    </h3>
                </div>

                {/* Manual Move Icons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMovingItem({ name: file.filename, type: 'file', anchorEl: { top: rect.top, left: rect.left } });
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/20 text-white/50 hover:text-white"
                        title="Move..."
                    >
                        <MoreVertical size={12} />
                    </button>
                </div>
            </div>
        ));
    };

    const uncategorized = getUncategorizedFiles(files, folders);
    const isDark = theme === 'dark';

    return (
        <div className="space-y-4 relative w-full h-[calc(100vh-80px)] md:h-auto md:min-h-[85vh] flex flex-col">

            <header className="flex justify-between items-end px-1 mb-2">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-[#202731]">Info & Notes</h1>
                </div>

                <HeaderActions onSettingsClick={() => { }}>
                    <button
                        onClick={toggleTheme}
                        className={cn("neumo-button p-2 transition-colors", isDark ? "text-yellow-500" : "text-gray-400 hover:text-orange-500")}
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </HeaderActions>
            </header>

            <div className={cn(
                "flex-1 flex relative neumo-raised rounded-3xl z-20 transition-colors duration-300 overflow-hidden",
                isDark ? "bg-[#202731]" : "bg-[#E0E5EC]"
            )}>
                <motion.div
                    className={cn(
                        "flex flex-col w-full md:w-1/3 min-w-[260px] max-w-sm border-r z-10 absolute md:relative h-full transition-all duration-300",
                        isMobileListVisible ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                        isDark ? "bg-purple-900 border-white/5" : "bg-purple-600 border-purple-700/30"
                    )}
                >
                    {/* Top action bar */}
                    <div className="p-2.5 flex items-center justify-between shrink-0 border-b border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white/60">
                            {files.length} items
                        </span>
                        <div className="flex gap-0.5">
                            <button onClick={load} className="p-1.5 rounded-lg transition-all hover:bg-white/15 text-white/70 hover:text-white" title="Refresh">
                                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                            </button>
                            <button onClick={handleCreateNewFile} className="p-1.5 rounded-lg transition-all hover:bg-white/15 text-white/70 hover:text-white" title="New Note">
                                <SquarePen size={14} />
                            </button>
                            <button onClick={() => setIsFolderModalOpen(true)} className="p-1.5 rounded-lg transition-all hover:bg-white/15 text-white/70 hover:text-white" title={`New Folder${activeFolder ? ` in ${activeFolder}` : ''}`}>
                                <FolderPlus size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1 nice-scrollbar">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="animate-spin text-gray-500" />
                            </div>
                        ) : (
                            <>
                                {(() => {
                                    const buildTree = () => {
                                        const tree = {};
                                        Object.keys(folders).forEach(path => {
                                            const parts = path.split('/');
                                            let current = tree;
                                            parts.forEach((part, i) => {
                                                const currentPath = parts.slice(0, i + 1).join('/');
                                                if (!current[part]) {
                                                    current[part] = { _path: currentPath, children: {} };
                                                }
                                                // CRITICAL: move to children of the current part
                                                current = current[part].children;
                                            });
                                        });
                                        console.log('INFO_PAGE_TREE:', tree);
                                        return tree;
                                    };
                                    const tree = buildTree();

                                    const renderFolder = (node, name, depth = 0) => {
                                        const path = node._path;
                                        const hasSubfolders = Object.keys(node.children).length > 0;
                                        const folderFiles = folders[path] || [];

                                        return (
                                            <div key={path} className="space-y-1">
                                                <div
                                                    onDragEnter={(e) => handleDragOver(e, path)}
                                                    onDragOver={(e) => handleDragOver(e, path)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => { e.stopPropagation(); handleDrop(e, path); }}
                                                    className={cn(
                                                        "group relative rounded-md transition-all duration-200 border-2",
                                                        dragOverFolder === path ? "border-dashed border-yellow-500 bg-yellow-500/10" : "border-transparent"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "flex items-center gap-1 group/folder rounded-xl transition-all",
                                                        activeFolder === path ? "bg-white/20" : "hover:bg-white/10"
                                                    )}>
                                                        <button
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, path, 'folder')}
                                                            onDragEnd={handleDragEnd}
                                                            onClick={() => toggleFolder(path)}
                                                            className={cn(
                                                                "flex items-center gap-1.5 flex-1 text-left px-2 py-2 text-xs font-bold transition-colors cursor-grab active:cursor-grabbing rounded-xl",
                                                                activeFolder === path ? "text-white" : "text-white/75 hover:text-white",
                                                                draggedFile?.name === path ? "opacity-30" : "opacity-100"
                                                            )}
                                                        >
                                                            {openFolders[path] ? <ChevronRight size={14} className="rotate-90 transition-transform" /> : <ChevronRight size={14} className="transition-transform" />}
                                                            <Folder size={14} className="text-white/70" />
                                                            <span className="truncate">{name}</span>
                                                        </button>

                                                        <div className="flex items-center opacity-0 group-hover/folder:opacity-100 transition-all px-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setMovingItem({ name: path, type: 'folder', anchorEl: { top: rect.top, left: rect.left } });
                                                                }}
                                                                className="p-1.5 rounded-lg hover:bg-white/20 text-white/50 hover:text-white"
                                                                title="Move folder..."
                                                            >
                                                                <MoreVertical size={12} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); deleteFolder(path); }}
                                                                className="p-1.5 rounded-lg hover:bg-red-500/30 text-white/50 hover:text-red-300"
                                                                title="Delete folder"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {openFolders[path] && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden ml-3 pl-2 border-l border-white/20"
                                                        >
                                                            {/* Render Subfolders */}
                                                            {Object.entries(node.children).sort().map(([subName, subNode]) => renderFolder(subNode, subName, depth + 1))}

                                                            {/* Render Files */}
                                                            {renderFileList(files.filter(f => folderFiles.includes(f.filename)), path)}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    };

                                    return Object.entries(tree).sort().map(([name, node]) => renderFolder(node, name));
                                })()}

                                <div
                                    onDragEnter={(e) => handleDragOver(e, 'uncategorized')}
                                    onDragOver={(e) => handleDragOver(e, 'uncategorized')}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, 'uncategorized')}
                                    className={cn(
                                        "pt-2 rounded-md transition-all duration-200 border-2 mt-4",
                                        dragOverFolder === 'uncategorized' ? "border-dashed border-gray-400 bg-gray-500/10" : "border-transparent"
                                    )}
                                >
                                    <div className="px-2 py-1 text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Uncategorized</div>
                                    {renderFileList(uncategorized)}
                                </div>
                            </>
                        )}
                    </div>

                </motion.div>

                <div className={cn(
                    "flex-1 h-full flex flex-col w-full absolute md:relative transition-all duration-300",
                    !isMobileListVisible ? "translate-x-0" : "translate-x-full md:translate-x-0",
                    isDark ? "bg-[#202731]" : "bg-[#E0E5EC]"
                )}>
                    {selectedFile ? (
                        <>
                            <div className={cn("md:hidden p-3 border-b flex items-center gap-2 sticky top-0 z-10", isDark ? "bg-[#1A202A] border-white/5 text-gray-200" : "bg-[#D0D6DF] border-white/50 text-gray-800")}>
                                <button onClick={handleBackToList} className="p-1 -ml-1 text-yellow-500 flex items-center gap-1">
                                    <ChevronLeft size={18} />
                                    <span className="text-xs font-bold">List</span>
                                </button>
                                {isEditing ? (
                                    <input type="text" value={editFilename} onChange={(e) => setEditFilename(e.target.value)} className={cn("text-xs font-bold truncate flex-1 text-center bg-transparent border-none outline-none focus:ring-1 rounded px-1", isDark ? "focus:ring-yellow-500 text-yellow-100" : "focus:ring-yellow-500 text-yellow-700")} />
                                ) : (
                                    <span className="text-xs font-bold truncate flex-1 text-center pr-2">{selectedFile.filename}</span>
                                )}
                                <div className="flex gap-2 items-center">
                                    <button onClick={handleCopy} className="text-gray-400 hover:text-blue-500">
                                        {isCopying ? <CheckSquare size={16} className="text-green-500" /> : <Copy size={16} />}
                                    </button>
                                    <button onClick={handleDelete} disabled={isDeleting} className="text-gray-400 hover:text-red-500">
                                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                    {isEditing ? (
                                        <button onClick={handleSave} disabled={isSaving} className="text-green-500">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}</button>
                                    ) : (
                                        <button onClick={() => setIsEditing(true)} border-none className="text-yellow-500"><Edit2 size={16} /></button>
                                    )}
                                </div>
                            </div>

                            {saveError && (
                                <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-500 text-xs font-bold">
                                    {saveError}
                                </div>
                            )}
                            <div className={cn("hidden md:flex justify-between items-center p-3 border-b", isDark ? "border-white/5 bg-[#1A202A] text-gray-200" : "border-white/50 bg-[#D0D6DF] text-gray-800")}>
                                {isEditing ? (
                                    <input type="text" value={editFilename} onChange={(e) => setEditFilename(e.target.value)} className={cn("text-sm font-bold bg-transparent border-b outline-none pb-0.5", isDark ? "border-gray-600 focus:border-yellow-500 text-yellow-100" : "border-gray-300 focus:border-yellow-500 text-yellow-700")} placeholder="Note Title..." />
                                ) : (
                                    <span className={cn("text-sm font-bold", isDark ? "text-gray-300" : "text-gray-700")}>{selectedFile.filename}</span>
                                )}
                                <div className="flex gap-2 items-center">
                                    <button onClick={handleCopy} className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-black/5" title="Copy Content">
                                        {isCopying ? <CheckSquare size={16} className="text-green-500" /> : <Copy size={16} />}
                                    </button>
                                    <button onClick={handleDelete} disabled={isDeleting} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-black/5" title="Delete Note">
                                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                    <div className="w-px h-4 bg-gray-400/30 mx-1"></div>
                                    {isEditing ? (
                                        <>
                                            <button onClick={() => { setIsEditing(false); setEditContent(selectedFile.content || ''); }} className={cn("px-3 py-1.5 rounded-md text-xs font-bold", isDark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100")}>Cancel</button>
                                            <button onClick={handleSave} disabled={isSaving} className="px-3 py-1.5 rounded-md bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 text-xs font-bold flex items-center gap-2">
                                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => setIsEditing(true)} className={cn("px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2", isDark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100")}>
                                            <Edit2 size={14} /> Edit
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col overflow-y-auto relative nice-scrollbar">
                                {isEditing ? (
                                    <div className="w-full flex-1 flex flex-col EditorWrapper h-full pb-20 md:pb-0">
                                        <style>{`
                                            .sun-editor { border: none !important; display: flex; flex-direction: column; height: 100%; background-color: transparent !important; }
                                            .sun-editor .se-toolbar { outline: none !important; background: ${isDark ? '#1f262f' : '#f0f2f5'} !important; border: none !important; border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} !important; padding: 2px 4px !important; }
                                            .sun-editor-editable { background-color: transparent !important; color: ${isDark ? '#e5e7eb' : '#1f2937'} !important; font-family: inherit !important; font-size: 14px; line-height: 1.8; height: 100% !important; flex: 1; min-height: calc(100vh - 220px); padding: 20px 28px !important; }
                                            .sun-editor .se-btn-tray { display: flex; flex-wrap: wrap; gap: 1px; }
                                            .sun-editor .se-resizing-bar { display: none !important; }
                                            .sun-editor button.se-btn { border-radius: 6px !important; transition: background 0.15s !important; }
                                            .sun-editor button.se-btn:hover { background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} !important; }
                                            .sun-editor .se-btn-select.se-btn-tool-format { min-width: 80px !important; }
                                            ${isDark ? `
                                            .sun-editor .se-toolbar svg { color: #9ca3af !important; }
                                            .sun-editor .se-btn-select { color: #9ca3af !important; background: transparent !important; }
                                            .sun-editor .se-list-layer { background: #1f262f !important; border: 1px solid rgba(255,255,255,0.1) !important; }
                                            .sun-editor .se-list-layer .se-list-inner li button { color: #d1d5db !important; }
                                            .sun-editor .se-list-layer .se-list-inner li button:hover { background: rgba(255,255,255,0.08) !important; }
                                            ` : ''}
                                        `}</style>
                                        <SunEditor
                                            key={selectedFile?.filename}
                                            setContents={editContent} onChange={setEditContent} width="100%" height="100%"
                                            setOptions={{
                                                buttonList: [
                                                    ['undo', 'redo'],
                                                    ['bold', 'underline', 'italic', 'strike', 'removeFormat'],
                                                    ['fontColor', 'hiliteColor'],
                                                    ['formatBlock', 'fontSize'],
                                                    ['align', 'list', 'outdent', 'indent'],
                                                    ['horizontalRule', 'link', 'table'],
                                                    ['codeView']
                                                ],
                                                defaultStyle: "font-family: inherit; font-size: 14px;",
                                                mode: "classic"
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className={cn("p-6 md:p-8 prose prose-slate max-w-none prose-headings:font-black prose-a:text-blue-500 whitespace-pre-wrap leading-relaxed select-text", isDark ? "prose-invert prose-p:text-gray-200 prose-headings:text-white prose-li:text-gray-200 prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700" : "prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 text-gray-800")}>
                                        <div dangerouslySetInnerHTML={{ __html: selectedFile.content || '' }} />
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

            <AnimatePresence>
                {movingItem && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
                        onClick={() => setMovingItem(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                                "p-4 rounded-2xl shadow-2xl w-64 max-h-[70vh] flex flex-col space-y-3 border neumo-raised",
                                isDark ? "bg-[#202731] border-white/10" : "bg-[#E0E5EC] border-white/50"
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <h3 className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-gray-400" : "text-gray-500")}>
                                    Move {movingItem.type}
                                </h3>
                                <button onClick={() => setMovingItem(null)} className="text-gray-500 hover:text-red-500"><X size={14} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-1 nice-scrollbar pr-1">
                                <button
                                    onClick={() => { performMove(movingItem.name, movingItem.type, 'uncategorized'); setMovingItem(null); }}
                                    className={cn("w-full text-left p-2 rounded-lg text-xs font-bold transition-colors", isDark ? "hover:bg-white/5 text-gray-300" : "hover:bg-black/5 text-gray-700")}
                                >
                                    Uncategorized
                                </button>
                                {Object.keys(folders).sort().map(folderName => {
                                    // Prevent moving a folder into itself or its descendants
                                    if (movingItem.type === 'folder') {
                                        if (folderName === movingItem.name || folderName.startsWith(movingItem.name + '/')) return null;
                                    }
                                    return (
                                        <button
                                            key={folderName}
                                            onClick={() => { performMove(movingItem.name, movingItem.type, folderName); setMovingItem(null); }}
                                            className={cn("w-full text-left p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2", isDark ? "hover:bg-white/5 text-gray-300" : "hover:bg-black/5 text-gray-700")}
                                        >
                                            <Folder size={12} className="text-blue-400" />
                                            <span className="truncate">{folderName}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}

                {isFolderModalOpen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={cn("p-5 rounded-2xl shadow-2xl w-72 space-y-4 border neumo-raised", isDark ? "bg-[#202731] border-white/10" : "bg-[#E0E5EC] border-white/50")}>
                            <h3 className={cn("text-sm font-black uppercase tracking-wider", isDark ? "text-gray-300" : "text-gray-600")}>New Folder</h3>
                            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Folder Name" className={cn("w-full px-3 py-2 rounded-xl text-sm font-bold focus:outline-none neumo-pressed", isDark ? "bg-transparent text-gray-200 placeholder-gray-600" : "bg-transparent text-gray-800 placeholder-gray-400")} autoFocus />
                            <div className="flex justify-end gap-3 mt-2">
                                <button onClick={() => setIsFolderModalOpen(false)} className={cn("px-4 py-2 rounded-xl text-xs font-bold", isDark ? "text-gray-400 hover:bg-white/5" : "text-gray-500 hover:bg-black/5")}>Cancel</button>
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
