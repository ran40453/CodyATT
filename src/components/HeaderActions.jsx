import React from 'react'
import { Settings, Eye, EyeOff } from 'lucide-react'
import { cn } from '../lib/utils'

function HeaderActions({ children, isPrivacy, togglePrivacy, onSettingsClick }) {
    return (
        <div className="flex items-center gap-2">
            {/* Page Specific Actions (Left of Global Buttons) */}
            {children}

            {/* Separator if children exist */}
            {children && <div className="w-px h-6 bg-gray-300 mx-1" />}

            {/* Global Actions */}
            <button
                onClick={togglePrivacy}
                className="neumo-button p-2 text-gray-400 hover:text-neumo-brand transition-colors relative group"
                title={isPrivacy ? "Show Amounts" : "Hide Amounts"}
            >
                {isPrivacy ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>

            <button
                onClick={onSettingsClick}
                className="neumo-button p-2 text-gray-400 hover:text-neumo-brand transition-colors relative group"
                title="Settings"
            >
                <Settings size={20} />
            </button>
        </div>
    )
}

export default HeaderActions
