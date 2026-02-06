import React, { useState } from 'react'
import { LayoutDashboard, Calendar, BarChart2, Settings } from 'lucide-react'
import Dashboard from './components/Dashboard'
import CalendarPage from './components/CalendarPage'
import AnalysisPage from './components/AnalysisPage'
import SettingsPage from './components/SettingsPage'
import Tabbar from './components/Tabbar'
import AddRecordModal from './components/AddRecordModal'

import { fetchRecordsFromSheets, fetchSettingsFromSheets, addOrUpdateRecord, loadSettings, loadData } from './lib/storage'

function App() {
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

    const handleUpdateRecord = (updatedRecord) => {
        const newData = addOrUpdateRecord(updatedRecord)
        setRecords(newData)
    }

    const renderPage = () => {
        switch (activeTab) {
            case 'home':
                return <Dashboard data={records} isPrivacy={isPrivacy} setIsPrivacy={togglePrivacy} />
            case 'calendar':
                return <CalendarPage data={records} onUpdate={handleUpdateRecord} isPrivacy={isPrivacy} />
            case 'analysis':
                return <AnalysisPage data={records} onUpdate={setRecords} isPrivacy={isPrivacy} />
            case 'settings':
                return <SettingsPage isPrivacy={isPrivacy} />
            default:
                return <Dashboard data={records} isPrivacy={isPrivacy} setIsPrivacy={togglePrivacy} />
        }
    }

    const tabs = [
        { id: 'home', label: '主頁', icon: LayoutDashboard },
        { id: 'calendar', label: '月曆', icon: Calendar },
        { id: 'analysis', label: '分析', icon: BarChart2 },
        { id: 'settings', label: '設定', icon: Settings },
    ]

    return (
        <div className="min-h-screen pb-24">
            <main className="container mx-auto px-4 pt-6">
                {renderPage()}
            </main>

            <Tabbar
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
                onAddClick={() => setIsModalOpen(true)}
            />

            <AddRecordModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleUpdateRecord}
                settings={settings}
            />
        </div>
    )
}

export default App
