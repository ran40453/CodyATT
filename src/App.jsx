import React, { useState } from 'react'
import { LayoutDashboard, Calendar, BarChart2, Settings, StickyNote } from 'lucide-react'
import Dashboard from './components/Dashboard'
import CalendarPage from './components/CalendarPage'
import AnalysisPage from './components/AnalysisPage'
import SettingsPage from './components/SettingsPage'
import InfoPage from './components/InfoPage'
import Tabbar from './components/Tabbar'
import AddRecordModal from './components/AddRecordModal'
import Layout from './components/Layout'

import { fetchRecordsFromSheets, fetchSettingsFromSheets, addOrUpdateRecord, loadSettings, loadData, deleteRecord } from './lib/storage'
import { useClickFeedback } from './hooks/useClickFeedback'

function App() {
    useClickFeedback();
    const [activeTab, setActiveTab] = useState('home')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [records, setRecords] = useState([])
    const [settings, setSettings] = useState(null)
    const [isPrivacy, setIsPrivacy] = useState(() => localStorage.getItem('ot-privacy') === 'true')

    const togglePrivacy = () => {
        const next = !isPrivacy
        setIsPrivacy(next)
        localStorage.setItem('ot-privacy', next)
    }

    React.useEffect(() => {
        // Initial load from localStorage
        const localRecords = loadData();
        setRecords(localRecords);
        setSettings(loadSettings());

        // Background sync and refresh from Cloud (Gist)
        const sync = async () => {
            const remoteRecords = await fetchRecordsFromSheets();
            if (remoteRecords) setRecords(remoteRecords);

            const remoteSettings = await fetchSettingsFromSheets();
            if (remoteSettings) setSettings(remoteSettings);
        };
        sync();
    }, []);

    const [toast, setToast] = useState(null)

    React.useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const handleUpdateRecord = async (updatedRecord) => {
        const result = await addOrUpdateRecord(updatedRecord)
        if (result.records) {
            setRecords(result.records)
            if (!result.sync.ok && result.sync.error === 'Config missing') {
                setToast({ type: 'warning', message: '已儲存至本機 (尚未設定雲端同步)' })
            } else if (!result.sync.ok) {
                setToast({ type: 'error', message: '已儲存至本機 (雲端同步失敗)' })
            }
        } else {
            setRecords(result)
        }
    }

    const handleDeleteRecord = async (date) => {
        const newRecords = deleteRecord(date);
        setRecords(newRecords);
        setToast({ type: 'success', message: '紀錄已刪除' });
    }

    const renderPage = () => {
        const commonProps = {
            isPrivacy,
            setIsPrivacy: togglePrivacy,
            togglePrivacy,
            onSettingsClick: () => setActiveTab('settings')
        }

        switch (activeTab) {
            case 'home':
                return <Dashboard data={records} {...commonProps} />
            case 'calendar':
                return <CalendarPage data={records} onUpdate={handleUpdateRecord} onDelete={handleDeleteRecord} {...commonProps} />
            case 'analysis':
                return <AnalysisPage data={records} onUpdate={handleUpdateRecord} {...commonProps} />
            case 'info':
                return <InfoPage />
            case 'settings':
                return <SettingsPage isPrivacy={isPrivacy} />
            default:
                return <Dashboard data={records} {...commonProps} />
        }
    }

    const tabs = [
        { id: 'home', label: '主頁', icon: LayoutDashboard },
        { id: 'calendar', label: '月曆', icon: Calendar },
        { id: 'analysis', label: '分析', icon: BarChart2 },
        { id: 'info', label: '資訊', icon: StickyNote },
    ]

    return (
        <Layout
            title="CodyATT"
            subtitle="ATTENDANCE DASHBOARD"
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onAddClick={() => setIsModalOpen(true)}
            tabs={tabs}
        >
            <div className="flex-1 min-h-[50vh]">
                {renderPage()}
            </div>

            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl shadow-xl z-50 text-xs font-black transition-all duration-300 flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500 text-white' :
                    toast.type === 'warning' ? 'bg-orange-400 text-white' : 'bg-green-500 text-white'
                    }`}>
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Floating Tabbar - Hide on md breakpoint (desktop) */}
            <div className="md:hidden">
                <Tabbar
                    tabs={tabs}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                    onAddClick={() => setIsModalOpen(true)}
                />
            </div>

            <AddRecordModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleUpdateRecord}
                settings={settings}
                records={records}
            />
        </Layout>
    )
}

export default App
